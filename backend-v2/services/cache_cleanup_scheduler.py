"""
Cache Cleanup Scheduler

Automated scheduling and execution of cache cleanup tasks
for the embedding cache management system.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from services.embedding_cache_manager import cache_manager
from db import get_db
from config import settings

logger = logging.getLogger(__name__)


class CacheCleanupScheduler:
    """
    Automated scheduler for embedding cache cleanup and maintenance tasks
    """
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        self.cleanup_history = []
        self.max_history_entries = 100
        
        # Schedule configuration
        self.schedule_config = {
            # Routine cleanup - daily at 2 AM
            "routine_cleanup": {
                "trigger": CronTrigger(hour=2, minute=0),
                "enabled": True
            },
            
            # Cache statistics monitoring - every 6 hours
            "statistics_monitoring": {
                "trigger": IntervalTrigger(hours=6),
                "enabled": True
            },
            
            # Emergency cleanup check - every hour
            "emergency_check": {
                "trigger": IntervalTrigger(hours=1),
                "enabled": True
            },
            
            # Weekly optimization - Sundays at 3 AM
            "weekly_optimization": {
                "trigger": CronTrigger(day_of_week=6, hour=3, minute=0),
                "enabled": True
            }
        }
    
    async def start_scheduler(self) -> None:
        """Start the cache cleanup scheduler"""
        if self.is_running:
            logger.warning("Cache cleanup scheduler is already running")
            return
        
        try:
            # Add scheduled jobs
            if self.schedule_config["routine_cleanup"]["enabled"]:
                self.scheduler.add_job(
                    self._run_routine_cleanup,
                    trigger=self.schedule_config["routine_cleanup"]["trigger"],
                    id="routine_cleanup",
                    name="Daily Routine Cache Cleanup",
                    max_instances=1,
                    coalesce=True
                )
            
            if self.schedule_config["statistics_monitoring"]["enabled"]:
                self.scheduler.add_job(
                    self._monitor_cache_statistics,
                    trigger=self.schedule_config["statistics_monitoring"]["trigger"],
                    id="statistics_monitoring",
                    name="Cache Statistics Monitoring",
                    max_instances=1,
                    coalesce=True
                )
            
            if self.schedule_config["emergency_check"]["enabled"]:
                self.scheduler.add_job(
                    self._check_emergency_cleanup,
                    trigger=self.schedule_config["emergency_check"]["trigger"],
                    id="emergency_check",
                    name="Emergency Cleanup Check",
                    max_instances=1,
                    coalesce=True
                )
            
            if self.schedule_config["weekly_optimization"]["enabled"]:
                self.scheduler.add_job(
                    self._run_weekly_optimization,
                    trigger=self.schedule_config["weekly_optimization"]["trigger"],
                    id="weekly_optimization",
                    name="Weekly Cache Optimization",
                    max_instances=1,
                    coalesce=True
                )
            
            # Start the scheduler
            self.scheduler.start()
            self.is_running = True
            
            logger.info("Cache cleanup scheduler started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start cache cleanup scheduler: {e}")
            raise
    
    async def stop_scheduler(self) -> None:
        """Stop the cache cleanup scheduler"""
        if not self.is_running:
            logger.warning("Cache cleanup scheduler is not running")
            return
        
        try:
            self.scheduler.shutdown(wait=True)
            self.is_running = False
            logger.info("Cache cleanup scheduler stopped")
            
        except Exception as e:
            logger.error(f"Error stopping cache cleanup scheduler: {e}")
            raise
    
    async def _run_routine_cleanup(self) -> None:
        """Execute routine daily cache cleanup"""
        logger.info("Starting scheduled routine cache cleanup")
        
        try:
            db = next(get_db())
            try:
                cleanup_stats = await cache_manager.run_cache_cleanup(
                    db=db,
                    cleanup_type="routine"
                )
                
                self._record_cleanup_history(cleanup_stats)
                
                logger.info(
                    f"Routine cleanup completed: "
                    f"Removed {cleanup_stats['entries_before'] - cleanup_stats['entries_after']} entries, "
                    f"freed {cleanup_stats['disk_space_freed_mb']:.1f} MB"
                )
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Routine cache cleanup failed: {e}")
    
    async def _monitor_cache_statistics(self) -> None:
        """Monitor cache statistics and log warnings if needed"""
        logger.debug("Monitoring cache statistics")
        
        try:
            db = next(get_db())
            try:
                stats = await cache_manager.get_cache_statistics(db)
                
                # Check for warning conditions
                warnings = []
                
                # Cache size warning
                if stats.get("cache_size_mb", 0) > 400:  # 80% of 500MB limit
                    warnings.append(f"Cache size is {stats['cache_size_mb']:.1f} MB (approaching 500MB limit)")
                
                # Too many entries warning
                if stats.get("total_entries", 0) > 50000:
                    warnings.append(f"Cache has {stats['total_entries']} entries (may impact performance)")
                
                # Old entries warning
                old_entries = stats.get("entries_by_age", {}).get("> 30 days", 0)
                if old_entries > 1000:
                    warnings.append(f"{old_entries} entries are older than 30 days")
                
                # Low confidence entries warning
                if stats.get("average_confidence", 1.0) < 0.5:
                    warnings.append(f"Average confidence score is low: {stats['average_confidence']:.3f}")
                
                # Log warnings
                for warning in warnings:
                    logger.warning(f"Cache monitoring alert: {warning}")
                
                # Log summary statistics
                logger.info(
                    f"Cache statistics: {stats['total_entries']} entries, "
                    f"{stats['cache_size_mb']:.1f} MB, "
                    f"avg confidence: {stats['average_confidence']:.3f}"
                )
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Cache statistics monitoring failed: {e}")
    
    async def _check_emergency_cleanup(self) -> None:
        """Check if emergency cleanup is needed"""
        logger.debug("Checking for emergency cleanup conditions")
        
        try:
            db = next(get_db())
            try:
                stats = await cache_manager.get_cache_statistics(db)
                
                # Emergency conditions
                emergency_conditions = []
                
                # Cache size over limit
                if stats.get("cache_size_mb", 0) > 500:
                    emergency_conditions.append("cache_size_exceeded")
                
                # Too many total entries
                if stats.get("total_entries", 0) > 100000:
                    emergency_conditions.append("entry_count_exceeded")
                
                # Execute emergency cleanup if needed
                if emergency_conditions:
                    logger.warning(
                        f"Emergency cleanup triggered due to: {', '.join(emergency_conditions)}"
                    )
                    
                    cleanup_stats = await cache_manager.run_cache_cleanup(
                        db=db,
                        cleanup_type="emergency"
                    )
                    
                    self._record_cleanup_history(cleanup_stats)
                    
                    logger.warning(
                        f"Emergency cleanup completed: "
                        f"Removed {cleanup_stats['entries_before'] - cleanup_stats['entries_after']} entries, "
                        f"freed {cleanup_stats['disk_space_freed_mb']:.1f} MB"
                    )
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Emergency cleanup check failed: {e}")
    
    async def _run_weekly_optimization(self) -> None:
        """Execute weekly cache optimization"""
        logger.info("Starting scheduled weekly cache optimization")
        
        try:
            db = next(get_db())
            try:
                # First run aggressive cleanup
                cleanup_stats = await cache_manager.run_cache_cleanup(
                    db=db,
                    cleanup_type="aggressive"
                )
                
                self._record_cleanup_history(cleanup_stats)
                
                # Then run optimization
                optimization_stats = await cache_manager.optimize_cache_indexes(db)
                
                logger.info(
                    f"Weekly optimization completed: "
                    f"Cleanup removed {cleanup_stats['entries_before'] - cleanup_stats['entries_after']} entries, "
                    f"optimization performed {len(optimization_stats.get('operations_performed', []))} operations"
                )
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Weekly cache optimization failed: {e}")
    
    def _record_cleanup_history(self, cleanup_stats: Dict) -> None:
        """Record cleanup operation in history"""
        self.cleanup_history.append({
            "timestamp": datetime.utcnow(),
            "cleanup_type": cleanup_stats.get("cleanup_type", "unknown"),
            "entries_removed": cleanup_stats.get("entries_before", 0) - cleanup_stats.get("entries_after", 0),
            "disk_space_freed_mb": cleanup_stats.get("disk_space_freed_mb", 0.0),
            "duration_seconds": cleanup_stats.get("duration_seconds", 0.0)
        })
        
        # Keep only recent history
        if len(self.cleanup_history) > self.max_history_entries:
            self.cleanup_history = self.cleanup_history[-self.max_history_entries:]
    
    async def get_scheduler_status(self) -> Dict:
        """Get current scheduler status and statistics"""
        return {
            "is_running": self.is_running,
            "scheduler_state": self.scheduler.state if self.scheduler else "stopped",
            "active_jobs": [
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in self.scheduler.get_jobs()
            ] if self.is_running else [],
            "cleanup_history_count": len(self.cleanup_history),
            "last_cleanup": self.cleanup_history[-1] if self.cleanup_history else None,
            "total_entries_removed": sum(
                entry.get("entries_removed", 0) for entry in self.cleanup_history
            ),
            "total_space_freed_mb": sum(
                entry.get("disk_space_freed_mb", 0.0) for entry in self.cleanup_history
            )
        }
    
    async def trigger_manual_cleanup(self, cleanup_type: str = "routine") -> Dict:
        """Manually trigger a cache cleanup operation"""
        logger.info(f"Manual {cleanup_type} cache cleanup triggered")
        
        try:
            db = next(get_db())
            try:
                cleanup_stats = await cache_manager.run_cache_cleanup(
                    db=db,
                    cleanup_type=cleanup_type
                )
                
                self._record_cleanup_history(cleanup_stats)
                
                logger.info(
                    f"Manual {cleanup_type} cleanup completed: "
                    f"Removed {cleanup_stats['entries_before'] - cleanup_stats['entries_after']} entries"
                )
                
                return cleanup_stats
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Manual cache cleanup failed: {e}")
            raise


# Create global scheduler instance
cleanup_scheduler = CacheCleanupScheduler()