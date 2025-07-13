"""
Background Tasks for Privacy Data Export Service.

Implements periodic tasks for processing GDPR data export requests
and maintaining compliance with data retention policies.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database import SessionLocal
from models.consent import DataExportRequest, ExportStatus
from services.privacy_data_export_service import PrivacyDataExportService
from config import settings

logger = logging.getLogger(__name__)


class PrivacyBackgroundTaskScheduler:
    """
    Scheduler for privacy-related background tasks.
    
    Handles:
    - Processing pending data export requests
    - Cleaning up expired export files
    - Monitoring task health and performance
    """
    
    def __init__(self):
        self.is_running = False
        self.task_interval_seconds = 60  # Check every minute
        self.cleanup_interval_hours = 6  # Cleanup every 6 hours
        self.last_cleanup = datetime.utcnow()
        
    async def start(self):
        """Start the background task scheduler"""
        if self.is_running:
            logger.warning("Background task scheduler is already running")
            return
        
        self.is_running = True
        logger.info("Starting privacy background task scheduler")
        
        try:
            while self.is_running:
                await self._run_task_cycle()
                await asyncio.sleep(self.task_interval_seconds)
                
        except Exception as e:
            logger.error(f"Background task scheduler error: {str(e)}")
            self.is_running = False
        
        logger.info("Privacy background task scheduler stopped")
    
    async def stop(self):
        """Stop the background task scheduler"""
        logger.info("Stopping privacy background task scheduler")
        self.is_running = False
    
    async def _run_task_cycle(self):
        """Run one cycle of background tasks"""
        try:
            # Process pending export requests
            await self._process_pending_exports()
            
            # Periodic cleanup
            if self._should_run_cleanup():
                await self._run_cleanup_tasks()
                self.last_cleanup = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Error in task cycle: {str(e)}")
    
    async def _process_pending_exports(self):
        """Process all pending data export requests"""
        db = SessionLocal()
        
        try:
            # Get pending export requests
            pending_requests = db.query(DataExportRequest).filter(
                DataExportRequest.status == ExportStatus.PENDING
            ).order_by(DataExportRequest.requested_at.asc()).all()
            
            if not pending_requests:
                return
            
            logger.info(f"Processing {len(pending_requests)} pending export requests")
            
            # Process each request
            for request in pending_requests:
                try:
                    # Check if request is too old (older than 24 hours)
                    if (datetime.utcnow() - request.requested_at) > timedelta(hours=24):
                        logger.warning(f"Marking stale export request as failed: {request.request_id}")
                        request.mark_failed("Request expired - processing took too long")
                        db.commit()
                        continue
                    
                    # Process the request
                    privacy_service = PrivacyDataExportService(db)
                    success = await privacy_service.process_export_request(request.request_id)
                    
                    if success:
                        logger.info(f"Successfully processed export request: {request.request_id}")
                    else:
                        logger.error(f"Failed to process export request: {request.request_id}")
                    
                    # Small delay between requests to avoid overwhelming the system
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error processing export request {request.request_id}: {str(e)}")
                    
                    # Mark as failed if not already marked
                    try:
                        db.refresh(request)
                        if request.status == ExportStatus.PROCESSING:
                            request.mark_failed(f"Processing error: {str(e)}")
                            db.commit()
                    except Exception as mark_error:
                        logger.error(f"Error marking request as failed: {str(mark_error)}")
        
        finally:
            db.close()
    
    async def _run_cleanup_tasks(self):
        """Run periodic cleanup tasks"""
        logger.info("Running privacy cleanup tasks")
        
        db = SessionLocal()
        
        try:
            privacy_service = PrivacyDataExportService(db)
            
            # Clean up expired exports
            await privacy_service.cleanup_expired_exports()
            
            # Clean up old failed requests (older than 30 days)
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            old_failed_requests = db.query(DataExportRequest).filter(
                DataExportRequest.status == ExportStatus.FAILED,
                DataExportRequest.requested_at < cutoff_date
            ).all()
            
            for request in old_failed_requests:
                logger.info(f"Deleting old failed export request: {request.request_id}")
                db.delete(request)
            
            if old_failed_requests:
                db.commit()
                logger.info(f"Cleaned up {len(old_failed_requests)} old failed requests")
            
            # Log cleanup statistics
            stats = await self._get_cleanup_statistics(db)
            logger.info(f"Cleanup completed. Stats: {stats}")
            
        except Exception as e:
            logger.error(f"Error during cleanup tasks: {str(e)}")
        
        finally:
            db.close()
    
    def _should_run_cleanup(self) -> bool:
        """Check if it's time to run cleanup tasks"""
        time_since_cleanup = datetime.utcnow() - self.last_cleanup
        return time_since_cleanup >= timedelta(hours=self.cleanup_interval_hours)
    
    async def _get_cleanup_statistics(self, db: Session) -> dict:
        """Get statistics about export requests for monitoring"""
        try:
            stats = {
                'total_requests': db.query(DataExportRequest).count(),
                'pending': db.query(DataExportRequest).filter(
                    DataExportRequest.status == ExportStatus.PENDING
                ).count(),
                'processing': db.query(DataExportRequest).filter(
                    DataExportRequest.status == ExportStatus.PROCESSING
                ).count(),
                'completed': db.query(DataExportRequest).filter(
                    DataExportRequest.status == ExportStatus.COMPLETED
                ).count(),
                'failed': db.query(DataExportRequest).filter(
                    DataExportRequest.status == ExportStatus.FAILED
                ).count(),
                'expired': db.query(DataExportRequest).filter(
                    DataExportRequest.status == ExportStatus.EXPIRED
                ).count()
            }
            
            # Add recent activity stats
            last_24h = datetime.utcnow() - timedelta(hours=24)
            stats['requests_last_24h'] = db.query(DataExportRequest).filter(
                DataExportRequest.requested_at >= last_24h
            ).count()
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cleanup statistics: {str(e)}")
            return {}
    
    async def process_single_request(self, request_id: str) -> bool:
        """Process a single export request (useful for manual processing)"""
        db = SessionLocal()
        
        try:
            privacy_service = PrivacyDataExportService(db)
            return await privacy_service.process_export_request(request_id)
        
        finally:
            db.close()
    
    async def get_queue_status(self) -> dict:
        """Get current status of the export queue"""
        db = SessionLocal()
        
        try:
            stats = await self._get_cleanup_statistics(db)
            
            # Add queue health information
            oldest_pending = db.query(DataExportRequest).filter(
                DataExportRequest.status == ExportStatus.PENDING
            ).order_by(DataExportRequest.requested_at.asc()).first()
            
            queue_health = "healthy"
            if oldest_pending:
                age = datetime.utcnow() - oldest_pending.requested_at
                if age > timedelta(hours=2):
                    queue_health = "delayed"
                if age > timedelta(hours=12):
                    queue_health = "critical"
            
            stats.update({
                'scheduler_running': self.is_running,
                'queue_health': queue_health,
                'last_cleanup': self.last_cleanup.isoformat(),
                'oldest_pending_age_minutes': int(
                    (datetime.utcnow() - oldest_pending.requested_at).total_seconds() / 60
                ) if oldest_pending else 0
            })
            
            return stats
            
        finally:
            db.close()


# Global scheduler instance
privacy_task_scheduler = PrivacyBackgroundTaskScheduler()


# Utility functions for FastAPI startup/shutdown
async def start_privacy_background_tasks():
    """Start privacy background tasks on application startup"""
    if hasattr(settings, 'ENABLE_PRIVACY_BACKGROUND_TASKS') and settings.ENABLE_PRIVACY_BACKGROUND_TASKS:
        logger.info("Starting privacy background tasks")
        asyncio.create_task(privacy_task_scheduler.start())
    else:
        logger.info("Privacy background tasks disabled in settings")


async def stop_privacy_background_tasks():
    """Stop privacy background tasks on application shutdown"""
    logger.info("Stopping privacy background tasks")
    await privacy_task_scheduler.stop()


# Health check function
async def privacy_tasks_health_check() -> dict:
    """Health check for privacy background tasks"""
    try:
        queue_status = await privacy_task_scheduler.get_queue_status()
        
        health_status = "healthy"
        if queue_status.get('queue_health') == 'critical':
            health_status = "critical"
        elif queue_status.get('queue_health') == 'delayed':
            health_status = "warning"
        elif not queue_status.get('scheduler_running', False):
            health_status = "down"
        
        return {
            "service": "privacy_background_tasks",
            "status": health_status,
            "details": queue_status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Privacy tasks health check failed: {str(e)}")
        return {
            "service": "privacy_background_tasks",
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }