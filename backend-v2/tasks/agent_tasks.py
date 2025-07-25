"""
Celery tasks for AI Agent background processing
"""

import logging
from datetime import datetime, timedelta
from celery import current_app as celery_app
from db import SessionLocal
from services.agent_orchestration_service import agent_orchestration_service
from services.conversation_service import conversation_service
from models import AgentInstance, AgentMetrics, AgentStatus
import asyncio

logger = logging.getLogger(__name__)


def get_db():
    """Get database session for Celery tasks"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def execute_agent_run(self, instance_id: int):
    """Execute a scheduled agent run"""
    logger.info(f"Starting agent run task for instance {instance_id}")
    
    db = next(get_db())
    try:
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            agent_orchestration_service.execute_agent_run(db, instance_id)
        )
        
        logger.info(f"Agent run completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Agent run failed for instance {instance_id}: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    finally:
        db.close()
        if 'loop' in locals():
            loop.close()


@celery_app.task(bind=True, max_retries=3)
def execute_conversation(self, conversation_id: int):
    """Execute a scheduled conversation"""
    logger.info(f"Starting conversation task for conversation {conversation_id}")
    
    db = next(get_db())
    try:
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            conversation_service.execute_conversation(db, conversation_id)
        )
        
        logger.info(f"Conversation execution completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Conversation failed for {conversation_id}: {exc}")
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
    finally:
        db.close()
        if 'loop' in locals():
            loop.close()


@celery_app.task
def process_agent_response(conversation_id: str, message: str, channel: str):
    """Process an incoming response from a client"""
    logger.info(f"Processing response for conversation {conversation_id}")
    
    db = next(get_db())
    try:
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            conversation_service.handle_client_response(
                db, conversation_id, message, channel
            )
        )
        
        logger.info(f"Response processing completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Response processing failed: {exc}")
        raise
    finally:
        db.close()
        if 'loop' in locals():
            loop.close()


@celery_app.task
def calculate_daily_metrics():
    """Calculate daily metrics for all active agents"""
    logger.info("Starting daily metrics calculation")
    
    db = next(get_db())
    try:
        # Get all active agent instances
        active_instances = db.query(AgentInstance).filter(
            AgentInstance.status == AgentStatus.ACTIVE
        ).all()
        
        today = datetime.utcnow().date()
        
        for instance in active_instances:
            try:
                # Calculate metrics for this instance
                calculate_agent_metrics.delay(instance.id, today.isoformat())
            except Exception as e:
                logger.error(f"Error scheduling metrics for instance {instance.id}: {e}")
        
        logger.info(f"Scheduled metrics calculation for {len(active_instances)} instances")
        
    except Exception as exc:
        logger.error(f"Daily metrics calculation failed: {exc}")
        raise
    finally:
        db.close()


@celery_app.task
def calculate_agent_metrics(instance_id: int, date_str: str):
    """Calculate metrics for a specific agent instance"""
    logger.info(f"Calculating metrics for instance {instance_id} on {date_str}")
    
    db = next(get_db())
    try:
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Get or create metrics record
        date = datetime.fromisoformat(date_str).date()
        metrics = db.query(AgentMetrics).filter_by(
            agent_instance_id=instance_id,
            date=date
        ).first()
        
        if not metrics:
            metrics = AgentMetrics(
                agent_instance_id=instance_id,
                date=date
            )
            db.add(metrics)
        
        # Calculate metrics from conversations
        from models import AgentConversation, ConversationStatus
        
        # Get today's conversations
        start_of_day = datetime.combine(date, datetime.min.time())
        end_of_day = datetime.combine(date, datetime.max.time())
        
        conversations = db.query(AgentConversation).filter(
            AgentConversation.agent_instance_id == instance_id,
            AgentConversation.created_at.between(start_of_day, end_of_day)
        ).all()
        
        # Calculate metrics
        metrics.conversations_started = len(conversations)
        metrics.conversations_completed = len([c for c in conversations if c.status == ConversationStatus.COMPLETED])
        metrics.conversations_failed = len([c for c in conversations if c.status == ConversationStatus.FAILED])
        
        # Calculate financial metrics
        metrics.revenue_generated = sum(c.revenue_generated for c in conversations)
        metrics.tokens_used = sum(c.total_tokens_used for c in conversations)
        metrics.token_cost = sum(c.token_cost for c in conversations)
        
        # Calculate rates
        if metrics.conversations_started > 0:
            metrics.conversion_rate = (metrics.conversations_completed / metrics.conversations_started) * 100
            metrics.goals_achieved = len([c for c in conversations if c.goal_achieved])
        
        # Calculate ROI
        if metrics.token_cost > 0:
            metrics.roi = (metrics.revenue_generated - metrics.token_cost) / metrics.token_cost
        
        db.commit()
        logger.info(f"Metrics calculated for instance {instance_id}: {metrics.conversations_started} conversations")
        
    except Exception as exc:
        logger.error(f"Metrics calculation failed for instance {instance_id}: {exc}")
        raise
    finally:
        db.close()
        if 'loop' in locals():
            loop.close()


@celery_app.task
def check_agent_health():
    """Check health of all active agents and disable problematic ones"""
    logger.info("Starting agent health check")
    
    db = next(get_db())
    try:
        # Find agents with high error rates
        problematic_instances = db.query(AgentInstance).filter(
            AgentInstance.status == AgentStatus.ACTIVE,
            AgentInstance.error_count >= 5
        ).all()
        
        for instance in problematic_instances:
            instance.status = AgentStatus.ERROR
            logger.warning(f"Disabled agent instance {instance.id} due to high error count")
        
        # Find agents that haven't run in too long
        stale_threshold = datetime.utcnow() - timedelta(days=3)
        stale_instances = db.query(AgentInstance).filter(
            AgentInstance.status == AgentStatus.ACTIVE,
            AgentInstance.last_run_at < stale_threshold
        ).all()
        
        for instance in stale_instances:
            logger.warning(f"Agent instance {instance.id} hasn't run since {instance.last_run_at}")
            # Schedule immediate run
            execute_agent_run.delay(instance.id)
        
        db.commit()
        logger.info(f"Health check completed. Disabled {len(problematic_instances)} agents, restarted {len(stale_instances)}")
        
    except Exception as exc:
        logger.error(f"Health check failed: {exc}")
        raise
    finally:
        db.close()


@celery_app.task
def cleanup_old_conversations():
    """Clean up old conversations to manage storage"""
    logger.info("Starting conversation cleanup")
    
    db = next(get_db())
    try:
        # Archive conversations older than 90 days
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        
        old_conversations = db.query(AgentConversation).filter(
            AgentConversation.created_at < cutoff_date
        ).count()
        
        if old_conversations > 0:
            # In production, we would archive these to cold storage
            logger.info(f"Found {old_conversations} conversations to archive")
            # For now, just log
        
        logger.info("Conversation cleanup completed")
        
    except Exception as exc:
        logger.error(f"Cleanup failed: {exc}")
        raise
    finally:
        db.close()


# Schedule periodic tasks
from celery.schedules import crontab

beat_schedule = {
    'calculate-daily-metrics': {
        'task': 'tasks.agent_tasks.calculate_daily_metrics',
        'schedule': crontab(hour=1, minute=0),  # Run at 1 AM daily
    },
    'check-agent-health': {
        'task': 'tasks.agent_tasks.check_agent_health',
        'schedule': crontab(minute='*/30'),  # Run every 30 minutes
    },
    'cleanup-old-conversations': {
        'task': 'tasks.agent_tasks.cleanup_old_conversations',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Run Sunday at 3 AM
    },
}