"""
Queue Management API Routes for BookedBarber V2
Provides REST API for queue monitoring and management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from db import get_db
from models.message_queue import MessageQueueType, MessagePriority, MessageStatus
from services.queue_management_service import queue_management_service
from utils.auth import get_current_user, require_admin_user
from models import User

router = APIRouter(prefix="/api/v2/queue", tags=["Queue Management"])
logger = logging.getLogger(__name__)

@router.get("/status", response_model=Dict[str, Any])
async def get_queue_status(
    queue_type: Optional[str] = Query(None, description="Specific queue type to check"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Get current queue status and metrics
    Requires admin privileges
    """
    try:
        queue_type_enum = None
        if queue_type:
            try:
                queue_type_enum = MessageQueueType(queue_type)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid queue type. Valid types: {[qt.value for qt in MessageQueueType]}"
                )
        
        status = queue_management_service.get_queue_status(db, queue_type_enum)
        return status
        
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get queue status")

@router.get("/health", response_model=Dict[str, Any])
async def get_queue_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Get comprehensive queue health information
    Requires admin privileges
    """
    try:
        # Trigger health check task
        from workers.monitoring_worker import check_queue_health
        
        # Execute health check
        health_result = check_queue_health.delay()
        
        # Get basic status while health check runs
        basic_status = queue_management_service.get_queue_status(db)
        
        return {
            "basic_status": basic_status,
            "health_check_task_id": health_result.id,
            "message": "Comprehensive health check initiated"
        }
        
    except Exception as e:
        logger.error(f"Error getting queue health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get queue health")

@router.get("/messages/{message_id}", response_model=Dict[str, Any])
async def get_message_details(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Get detailed information about a specific message
    Requires admin privileges
    """
    try:
        details = queue_management_service.get_message_details(db, message_id)
        
        if not details:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting message details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get message details")

@router.post("/messages/{message_id}/cancel")
async def cancel_message(
    message_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Cancel a pending or retrying message
    Requires admin privileges
    """
    try:
        success = queue_management_service.cancel_message(db, message_id, reason)
        
        if not success:
            raise HTTPException(
                status_code=404, 
                detail="Message not found or cannot be cancelled"
            )
        
        return {
            "success": True,
            "message": f"Message {message_id} cancelled",
            "reason": reason
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling message: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel message")

@router.post("/messages/{message_id}/retry")
async def retry_message(
    message_id: int,
    reset_attempts: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Manually retry a failed message
    Requires admin privileges
    """
    try:
        success = queue_management_service.retry_failed_message(
            db, message_id, reset_attempts
        )
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Message not found or cannot be retried"
            )
        
        return {
            "success": True,
            "message": f"Message {message_id} queued for retry",
            "reset_attempts": reset_attempts
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying message: {e}")
        raise HTTPException(status_code=500, detail="Failed to retry message")

@router.get("/dead-letter", response_model=List[Dict[str, Any]])
async def get_dead_letter_queue(
    manual_review_only: bool = Query(False, description="Only show entries requiring manual review"),
    limit: int = Query(100, ge=1, le=1000, description="Number of entries to return"),
    offset: int = Query(0, ge=0, description="Number of entries to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Get dead letter queue entries
    Requires admin privileges
    """
    try:
        entries = queue_management_service.get_dlq_entries(
            db, manual_review_only, limit, offset
        )
        
        return entries
        
    except Exception as e:
        logger.error(f"Error getting DLQ entries: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dead letter queue")

@router.post("/dead-letter/{dlq_id}/retry")
async def retry_dlq_entry(
    dlq_id: int,
    retry_options: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Manually retry a dead letter queue entry
    Requires admin privileges
    """
    try:
        from workers.dlq_worker import manual_dlq_retry
        
        # Add resolved_by information
        if not retry_options:
            retry_options = {}
        retry_options["resolved_by"] = current_user.email
        
        # Queue the retry task
        retry_task = manual_dlq_retry.delay(dlq_id, retry_options)
        
        return {
            "success": True,
            "message": f"DLQ entry {dlq_id} queued for retry",
            "task_id": retry_task.id,
            "resolved_by": current_user.email
        }
        
    except Exception as e:
        logger.error(f"Error retrying DLQ entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to retry DLQ entry")

@router.post("/publish/notification")
async def publish_notification(
    user_id: int,
    template_name: str,
    context: Dict[str, Any],
    priority: str = "normal",
    appointment_id: Optional[int] = None,
    scheduled_for: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Publish a notification message to the queue
    """
    try:
        # Validate priority
        try:
            priority_enum = MessagePriority(priority)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid priority. Valid priorities: {[p.value for p in MessagePriority]}"
            )
        
        # Verify user exists (for non-admin users, restrict to own notifications)
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # Authorization check
        if not current_user.is_admin and current_user.id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Can only send notifications to yourself unless you are an admin"
            )
        
        # Publish the notification
        message = queue_management_service.publish_notification(
            db=db,
            user_id=user_id,
            template_name=template_name,
            context=context,
            priority=priority_enum,
            appointment_id=appointment_id,
            scheduled_for=scheduled_for
        )
        
        return {
            "success": True,
            "message_id": message.id,
            "queue_type": message.queue_type.value,
            "scheduled_for": message.scheduled_for.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish notification")

@router.post("/publish/analytics")
async def publish_analytics_processing(
    analytics_type: str,
    data: Dict[str, Any],
    priority: str = "normal",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Publish analytics processing task
    Requires admin privileges
    """
    try:
        # Validate priority
        try:
            priority_enum = MessagePriority(priority)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid priority. Valid priorities: {[p.value for p in MessagePriority]}"
            )
        
        # Validate analytics type
        valid_types = ["booking_analytics", "revenue_metrics", "user_behavior", "daily_reports"]
        if analytics_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid analytics type. Valid types: {valid_types}"
            )
        
        # Publish the analytics task
        message = queue_management_service.publish_analytics_processing(
            db=db,
            analytics_type=analytics_type,
            data=data,
            priority=priority_enum
        )
        
        return {
            "success": True,
            "message_id": message.id,
            "analytics_type": analytics_type,
            "queue_type": message.queue_type.value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing analytics task: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish analytics task")

@router.post("/publish/file-processing")
async def publish_file_processing(
    file_path: str,
    processing_type: str,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Publish file processing task
    """
    try:
        # Validate processing type
        valid_types = ["image_upload", "resize_optimize", "generate_thumbnails", "malware_scan"]
        if processing_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid processing type. Valid types: {valid_types}"
            )
        
        # Publish the file processing task
        message = queue_management_service.publish_file_processing(
            db=db,
            file_path=file_path,
            processing_type=processing_type,
            user_id=current_user.id,
            metadata=metadata or {}
        )
        
        return {
            "success": True,
            "message_id": message.id,
            "file_path": file_path,
            "processing_type": processing_type,
            "queue_type": message.queue_type.value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing file processing task: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish file processing task")

@router.post("/publish/calendar-sync")
async def publish_calendar_sync(
    sync_type: str,
    appointment_id: Optional[int] = None,
    calendar_data: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Publish calendar synchronization task
    """
    try:
        # Validate sync type
        valid_types = ["sync_google", "create_event", "update_event", "delete_event", "webhook"]
        if sync_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid sync type. Valid types: {valid_types}"
            )
        
        # Publish the calendar sync task
        message = queue_management_service.publish_calendar_sync(
            db=db,
            sync_type=sync_type,
            user_id=current_user.id,
            appointment_id=appointment_id,
            calendar_data=calendar_data or {}
        )
        
        return {
            "success": True,
            "message_id": message.id,
            "sync_type": sync_type,
            "user_id": current_user.id,
            "appointment_id": appointment_id,
            "queue_type": message.queue_type.value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing calendar sync task: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish calendar sync task")

@router.get("/metrics", response_model=Dict[str, Any])
async def get_queue_metrics(
    queue_type: Optional[str] = Query(None, description="Specific queue type"),
    hours: int = Query(24, ge=1, le=168, description="Hours of metrics to retrieve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Get queue metrics and performance data
    Requires admin privileges
    """
    try:
        from models.message_queue import QueueMetrics
        from sqlalchemy import and_
        
        # Calculate time range
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        # Build query
        query = db.query(QueueMetrics).filter(
            and_(
                QueueMetrics.metric_timestamp >= start_time,
                QueueMetrics.metric_timestamp <= end_time
            )
        )
        
        if queue_type:
            try:
                queue_type_enum = MessageQueueType(queue_type)
                query = query.filter(QueueMetrics.queue_type == queue_type_enum)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid queue type. Valid types: {[qt.value for qt in MessageQueueType]}"
                )
        
        metrics = query.order_by(QueueMetrics.metric_timestamp.desc()).all()
        
        # Format response
        result = {
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "hours": hours
            },
            "metrics": []
        }
        
        for metric in metrics:
            result["metrics"].append({
                "queue_type": metric.queue_type.value,
                "timestamp": metric.metric_timestamp.isoformat(),
                "pending_count": metric.pending_count,
                "processing_count": metric.processing_count,
                "completed_count": metric.completed_count,
                "failed_count": metric.failed_count,
                "dead_letter_count": metric.dead_letter_count,
                "avg_processing_time": metric.avg_processing_time,
                "max_processing_time": metric.max_processing_time,
                "throughput_per_minute": metric.throughput_per_minute,
                "error_rate": metric.error_rate,
                "retry_rate": metric.retry_rate,
                "backlog_warning": metric.backlog_warning,
                "active_workers": metric.active_workers,
                "worker_utilization": metric.worker_utilization
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting queue metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get queue metrics")

@router.post("/trigger/health-check")
async def trigger_health_check(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Manually trigger a comprehensive health check
    Requires admin privileges
    """
    try:
        from workers.monitoring_worker import check_queue_health
        
        # Queue health check task
        health_task = check_queue_health.delay()
        
        return {
            "success": True,
            "message": "Health check initiated",
            "task_id": health_task.id,
            "initiated_by": current_user.email
        }
        
    except Exception as e:
        logger.error(f"Error triggering health check: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger health check")

@router.post("/trigger/metrics-generation")
async def trigger_metrics_generation(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    """
    Manually trigger metrics generation
    Requires admin privileges
    """
    try:
        from workers.monitoring_worker import generate_queue_metrics
        
        # Queue metrics generation task
        metrics_task = generate_queue_metrics.delay()
        
        return {
            "success": True,
            "message": "Metrics generation initiated",
            "task_id": metrics_task.id,
            "initiated_by": current_user.email
        }
        
    except Exception as e:
        logger.error(f"Error triggering metrics generation: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger metrics generation")