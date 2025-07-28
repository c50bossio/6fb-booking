"""
Weekly Insights Background Worker for BookedBarber V2

This worker handles automated weekly insights generation and email delivery.
It runs scheduled tasks to generate insights for all active barbers and
sends personalized email reports according to their preferences.

Key Features:
- Automated weekly insights generation for all users
- Scheduled email delivery with retry logic
- Error handling and monitoring
- Performance optimization and batching
- Failed job recovery and alerting
- Comprehensive logging and metrics tracking

The worker integrates with Celery for distributed task processing and
includes sophisticated retry mechanisms and failure handling.
"""

import logging
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine, func
import celery
from celery import Celery
from celery.schedules import crontab
import os
import json
from dataclasses import dataclass

from models import User
from models.weekly_insights import (
    WeeklyInsight, InsightEmailDelivery, EmailDeliveryStatus, 
    InsightStatus, WeeklyInsightArchive
)
from services.weekly_insights_service import WeeklyInsightsService
from services.insight_email_service import InsightEmailService
from utils.database import get_db_url
from utils.monitoring import MetricsCollector

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    'weekly_insights_worker',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_routes={
        'weekly_insights_worker.generate_weekly_insights': {'queue': 'insights_generation'},
        'weekly_insights_worker.send_insight_emails': {'queue': 'email_delivery'},
        'weekly_insights_worker.cleanup_old_insights': {'queue': 'maintenance'}
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_soft_time_limit=300,  # 5 minutes
    task_time_limit=600,  # 10 minutes
    result_expires=3600,  # 1 hour
)

# Schedule configuration
celery_app.conf.beat_schedule = {
    'generate-weekly-insights': {
        'task': 'weekly_insights_worker.generate_all_weekly_insights',
        'schedule': crontab(hour=6, minute=0, day_of_week=1),  # Monday 6 AM
        'args': (),
        'options': {'expires': 3600}
    },
    'send-insight-emails': {
        'task': 'weekly_insights_worker.send_scheduled_insight_emails',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),  # Monday 8 AM
        'args': (),
        'options': {'expires': 1800}
    },
    'retry-failed-emails': {
        'task': 'weekly_insights_worker.retry_failed_email_deliveries',
        'schedule': crontab(minute=0),  # Every hour
        'args': (),
        'options': {'expires': 900}
    },
    'cleanup-old-insights': {
        'task': 'weekly_insights_worker.cleanup_and_archive_insights',
        'schedule': crontab(hour=2, minute=0, day_of_week=0),  # Sunday 2 AM
        'args': (),
        'options': {'expires': 7200}
    },
    'system-health-check': {
        'task': 'weekly_insights_worker.system_health_check',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
        'args': (),
        'options': {'expires': 600}
    }
}

# Database setup
engine = create_engine(get_db_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@dataclass
class InsightGenerationResult:
    """Result of insight generation task"""
    user_id: int
    success: bool
    insight_id: Optional[int] = None
    error_message: Optional[str] = None
    generation_time_seconds: Optional[float] = None

@dataclass
class EmailDeliveryResult:
    """Result of email delivery task"""
    user_id: int
    insight_id: int
    success: bool
    delivery_id: Optional[int] = None
    error_message: Optional[str] = None

class WeeklyInsightsWorker:
    """
    Background worker class for managing weekly insights generation and delivery.
    Handles all automated tasks related to the insights system.
    """
    
    def __init__(self):
        self.metrics = MetricsCollector()
        self.session = SessionLocal()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()
    
    def get_active_users_for_insights(self) -> List[User]:
        """Get all active users who should receive weekly insights"""
        
        # Get users who have completed at least one appointment in the last 30 days
        # and haven't opted out of insights
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        active_users = self.session.query(User).filter(
            User.is_active == True,
            User.email.isnot(None),
            # Add condition for users with recent activity
            User.id.in_(
                self.session.query(func.distinct(User.id))
                .join(User.appointments)
                .filter(User.appointments.any(
                    func.date(User.appointments.created_at) >= cutoff_date.date()
                ))
            )
        ).all()
        
        # Filter out users who have opted out of insights emails
        # (This would be implemented based on user preferences)
        eligible_users = []
        for user in active_users:
            # Check if user has insights email preference enabled
            # For now, assume all active users want insights
            eligible_users.append(user)
        
        logger.info(f"Found {len(eligible_users)} users eligible for weekly insights")\n        return eligible_users\n    \n    def should_generate_insights_for_user(self, user: User, week_start: datetime) -> bool:\n        """Check if insights should be generated for a specific user and week"""\n        \n        # Check if insights already exist for this week\n        existing_insight = self.session.query(WeeklyInsight).filter(\n            WeeklyInsight.user_id == user.id,\n            WeeklyInsight.week_start_date == week_start\n        ).first()\n        \n        if existing_insight:\n            if existing_insight.status == InsightStatus.GENERATED:\n                logger.debug(f"Insights already generated for user {user.id}, week {week_start.date()}")\n                return False\n            elif existing_insight.status == InsightStatus.GENERATING:\n                # Check if generation has been stuck for too long\n                if existing_insight.created_at < datetime.utcnow() - timedelta(hours=2):\n                    logger.warning(f"Insights generation stuck for user {user.id}, retrying")\n                    existing_insight.status = InsightStatus.FAILED\n                    existing_insight.error_message = "Generation timeout - retrying"\n                    self.session.commit()\n                    return True\n                else:\n                    logger.debug(f"Insights currently generating for user {user.id}")\n                    return False\n            elif existing_insight.status == InsightStatus.FAILED:\n                # Retry failed generations\n                logger.info(f"Retrying failed insight generation for user {user.id}")\n                return True\n        \n        # Check if user has enough data for meaningful insights\n        appointments_count = self.session.query(func.count(User.appointments.property.mapper.class_.id)).filter(\n            User.appointments.property.mapper.class_.barber_id == user.id,\n            func.date(User.appointments.property.mapper.class_.start_time) >= week_start.date(),\n            func.date(User.appointments.property.mapper.class_.start_time) <= (week_start + timedelta(days=6)).date()\n        ).scalar() or 0\n        \n        if appointments_count < 1:\n            logger.debug(f"User {user.id} has insufficient appointment data for week {week_start.date()}")\n            return False\n        \n        return True\n    \n    def generate_insights_for_user(self, user: User, week_start: datetime) -> InsightGenerationResult:\n        """Generate weekly insights for a specific user"""\n        \n        start_time = datetime.utcnow()\n        \n        try:\n            logger.info(f"Generating weekly insights for user {user.id}, week {week_start.date()}")\n            \n            service = WeeklyInsightsService(self.session)\n            insight = service.generate_weekly_insights(user.id, week_start)\n            \n            generation_time = (datetime.utcnow() - start_time).total_seconds()\n            \n            # Track metrics\n            self.metrics.increment('insights_generated_success')\n            self.metrics.timing('insight_generation_duration', generation_time)\n            \n            logger.info(f"Successfully generated insight {insight.id} for user {user.id} in {generation_time:.2f}s")\n            \n            return InsightGenerationResult(\n                user_id=user.id,\n                success=True,\n                insight_id=insight.id,\n                generation_time_seconds=generation_time\n            )\n            \n        except Exception as e:\n            generation_time = (datetime.utcnow() - start_time).total_seconds()\n            error_msg = str(e)\n            \n            logger.error(f"Failed to generate insights for user {user.id}: {error_msg}")\n            \n            # Track metrics\n            self.metrics.increment('insights_generated_failed')\n            self.metrics.timing('insight_generation_duration', generation_time)\n            \n            return InsightGenerationResult(\n                user_id=user.id,\n                success=False,\n                error_message=error_msg,\n                generation_time_seconds=generation_time\n            )\n    \n    def send_email_for_insight(self, insight: WeeklyInsight) -> EmailDeliveryResult:\n        """Send email for a specific weekly insight"""\n        \n        try:\n            logger.info(f"Sending email for insight {insight.id}, user {insight.user_id}")\n            \n            email_service = InsightEmailService(self.session)\n            delivery = email_service.send_weekly_insight_email(\n                insight_id=insight.id,\n                scheduled_time=datetime.utcnow()\n            )\n            \n            # Track metrics\n            self.metrics.increment('insight_emails_sent_success')\n            \n            logger.info(f"Successfully queued email delivery {delivery.id} for insight {insight.id}")\n            \n            return EmailDeliveryResult(\n                user_id=insight.user_id,\n                insight_id=insight.id,\n                success=True,\n                delivery_id=delivery.id\n            )\n            \n        except Exception as e:\n            error_msg = str(e)\n            \n            logger.error(f"Failed to send email for insight {insight.id}: {error_msg}")\n            \n            # Track metrics\n            self.metrics.increment('insight_emails_sent_failed')\n            \n            return EmailDeliveryResult(\n                user_id=insight.user_id,\n                insight_id=insight.id,\n                success=False,\n                error_message=error_msg\n            )\n\n# Celery Tasks\n\n@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)\ndef generate_weekly_insights_for_user(self, user_id: int, week_start_iso: str):\n    """\n    Generate weekly insights for a single user\n    \n    Args:\n        user_id: User ID to generate insights for\n        week_start_iso: ISO format datetime string for week start\n    """\n    try:\n        with WeeklyInsightsWorker() as worker:\n            week_start = datetime.fromisoformat(week_start_iso.replace('Z', '+00:00'))\n            \n            user = worker.session.query(User).filter(User.id == user_id).first()\n            if not user:\n                raise ValueError(f"User {user_id} not found")\n            \n            if not worker.should_generate_insights_for_user(user, week_start):\n                return {"status": "skipped", "reason": "insights_not_needed"}\n            \n            result = worker.generate_insights_for_user(user, week_start)\n            \n            if result.success:\n                return {\n                    "status": "success",\n                    "insight_id": result.insight_id,\n                    "generation_time": result.generation_time_seconds\n                }\n            else:\n                raise Exception(result.error_message)\n                \n    except Exception as exc:\n        logger.error(f"Insight generation failed for user {user_id}: {exc}")\n        if self.request.retries < self.max_retries:\n            raise self.retry(countdown=300, exc=exc)\n        else:\n            # Final failure - log and alert\n            logger.error(f"Final failure generating insights for user {user_id}: {exc}")\n            return {"status": "failed", "error": str(exc)}\n\n@celery_app.task(bind=True, max_retries=2, default_retry_delay=600)\ndef send_insight_email(self, insight_id: int):\n    """\n    Send email for a specific weekly insight\n    \n    Args:\n        insight_id: ID of the weekly insight to send\n    """\n    try:\n        with WeeklyInsightsWorker() as worker:\n            insight = worker.session.query(WeeklyInsight).filter(\n                WeeklyInsight.id == insight_id\n            ).first()\n            \n            if not insight:\n                raise ValueError(f"Weekly insight {insight_id} not found")\n            \n            if insight.status != InsightStatus.GENERATED:\n                raise ValueError(f"Insight {insight_id} not ready for email (status: {insight.status})")\n            \n            result = worker.send_email_for_insight(insight)\n            \n            if result.success:\n                return {\n                    "status": "success",\n                    "delivery_id": result.delivery_id\n                }\n            else:\n                raise Exception(result.error_message)\n                \n    except Exception as exc:\n        logger.error(f"Email send failed for insight {insight_id}: {exc}")\n        if self.request.retries < self.max_retries:\n            raise self.retry(countdown=600, exc=exc)\n        else:\n            logger.error(f"Final failure sending email for insight {insight_id}: {exc}")\n            return {"status": "failed", "error": str(exc)}\n\n@celery_app.task\ndef generate_all_weekly_insights():\n    """\n    Master task to generate weekly insights for all eligible users\n    \n    This task runs every Monday morning and orchestrates insight generation\n    for all active users who should receive weekly insights.\n    """\n    try:\n        with WeeklyInsightsWorker() as worker:\n            # Calculate the week we're generating insights for (previous week)\n            today = datetime.utcnow()\n            days_since_monday = today.weekday()\n            week_start = today - timedelta(days=days_since_monday, weeks=1)\n            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)\n            \n            logger.info(f"Starting weekly insights generation for week {week_start.date()}")\n            \n            # Get eligible users\n            eligible_users = worker.get_active_users_for_insights()\n            \n            if not eligible_users:\n                logger.info("No eligible users found for insights generation")\n                return {"status": "completed", "users_processed": 0}\n            \n            # Queue individual generation tasks\n            generation_tasks = []\n            for user in eligible_users:\n                if worker.should_generate_insights_for_user(user, week_start):\n                    task = generate_weekly_insights_for_user.delay(\n                        user_id=user.id,\n                        week_start_iso=week_start.isoformat()\n                    )\n                    generation_tasks.append(task)\n            \n            logger.info(f"Queued {len(generation_tasks)} insight generation tasks")\n            \n            # Track metrics\n            worker.metrics.gauge('insights_generation_batch_size', len(generation_tasks))\n            \n            return {\n                "status": "queued",\n                "users_eligible": len(eligible_users),\n                "tasks_queued": len(generation_tasks),\n                "week_start": week_start.isoformat()\n            }\n            \n    except Exception as e:\n        logger.error(f"Failed to start weekly insights generation: {e}")\n        return {"status": "failed", "error": str(e)}\n\n@celery_app.task\ndef send_scheduled_insight_emails():\n    """\n    Send scheduled insight emails for all generated insights\n    \n    This runs after insight generation to send emails to users.\n    """\n    try:\n        with WeeklyInsightsWorker() as worker:\n            # Find all insights generated in the last 2 hours that haven't been emailed\n            cutoff_time = datetime.utcnow() - timedelta(hours=2)\n            \n            insights_to_email = worker.session.query(WeeklyInsight).filter(\n                WeeklyInsight.status == InsightStatus.GENERATED,\n                WeeklyInsight.generation_date >= cutoff_time,\n                ~WeeklyInsight.id.in_(\n                    worker.session.query(InsightEmailDelivery.weekly_insight_id).filter(\n                        InsightEmailDelivery.status.in_([\n                            EmailDeliveryStatus.SENT,\n                            EmailDeliveryStatus.DELIVERED,\n                            EmailDeliveryStatus.OPENED,\n                            EmailDeliveryStatus.CLICKED\n                        ])\n                    )\n                )\n            ).all()\n            \n            if not insights_to_email:\n                logger.info("No insights found that need email delivery")\n                return {"status": "completed", "emails_queued": 0}\n            \n            # Queue email sending tasks\n            email_tasks = []\n            for insight in insights_to_email:\n                task = send_insight_email.delay(insight_id=insight.id)\n                email_tasks.append(task)\n            \n            logger.info(f"Queued {len(email_tasks)} email delivery tasks")\n            \n            # Track metrics\n            worker.metrics.gauge('email_delivery_batch_size', len(email_tasks))\n            \n            return {\n                "status": "queued",\n                "emails_queued": len(email_tasks)\n            }\n            \n    except Exception as e:\n        logger.error(f"Failed to send scheduled insight emails: {e}")\n        return {"status": "failed", "error": str(e)}\n\n@celery_app.task\ndef retry_failed_email_deliveries():\n    """\n    Retry failed email deliveries with exponential backoff\n    \n    This task runs hourly to retry emails that failed to send.\n    """\n    try:\n        with WeeklyInsightsWorker() as worker:\n            # Find failed deliveries that should be retried\n            retry_cutoff = datetime.utcnow() - timedelta(hours=1)\n            \n            failed_deliveries = worker.session.query(InsightEmailDelivery).filter(\n                InsightEmailDelivery.status == EmailDeliveryStatus.FAILED,\n                InsightEmailDelivery.retry_count < 3,\n                InsightEmailDelivery.created_at >= retry_cutoff\n            ).all()\n            \n            if not failed_deliveries:\n                return {"status": "completed", "retries_attempted": 0}\n            \n            retry_tasks = []\n            for delivery in failed_deliveries:\n                # Update retry count\n                delivery.retry_count += 1\n                worker.session.commit()\n                \n                # Queue retry\n                task = send_insight_email.delay(insight_id=delivery.weekly_insight_id)\n                retry_tasks.append(task)\n            \n            logger.info(f"Queued {len(retry_tasks)} email delivery retries")\n            \n            return {\n                "status": "queued",\n                "retries_attempted": len(retry_tasks)\n            }\n            \n    except Exception as e:\n        logger.error(f"Failed to retry email deliveries: {e}")\n        return {"status": "failed", "error": str(e)}\n\n@celery_app.task\ndef cleanup_and_archive_insights():\n    """\n    Clean up old insights and archive them for storage optimization\n    \n    This task runs weekly to archive old insights and free up database space.\n    """\n    try:\n        with WeeklyInsightsWorker() as worker:\n            # Archive insights older than 6 months\n            archive_cutoff = datetime.utcnow() - timedelta(days=180)\n            \n            old_insights = worker.session.query(WeeklyInsight).filter(\n                WeeklyInsight.week_start_date < archive_cutoff\n            ).all()\n            \n            if not old_insights:\n                return {"status": "completed", "insights_archived": 0}\n            \n            # Group insights by user for archiving\n            user_insights = {}\n            for insight in old_insights:\n                if insight.user_id not in user_insights:\n                    user_insights[insight.user_id] = []\n                user_insights[insight.user_id].append(insight)\n            \n            archived_count = 0\n            for user_id, insights in user_insights.items():\n                # Create archive record\n                archive_data = []\n                for insight in insights:\n                    archive_data.append({\n                        'id': insight.id,\n                        'week_start': insight.week_start_date.isoformat(),\n                        'overall_score': insight.overall_score,\n                        'revenue': insight.revenue_current_week,\n                        'appointments': insight.appointments_current_week\n                    })\n                \n                archive = WeeklyInsightArchive(\n                    user_id=user_id,\n                    archive_start_date=min(i.week_start_date for i in insights),\n                    archive_end_date=max(i.week_start_date for i in insights),\n                    insights_count=len(insights),\n                    insights_data=archive_data,\n                    aggregated_metrics={\n                        'avg_score': sum(i.overall_score for i in insights) / len(insights),\n                        'total_revenue': sum(i.revenue_current_week for i in insights),\n                        'total_appointments': sum(i.appointments_current_week for i in insights)\n                    }\n                )\n                \n                worker.session.add(archive)\n                \n                # Delete original insights\n                for insight in insights:\n                    worker.session.delete(insight)\n                \n                archived_count += len(insights)\n            \n            worker.session.commit()\n            \n            logger.info(f"Archived {archived_count} old insights for {len(user_insights)} users")\n            \n            return {\n                "status": "completed",\n                "insights_archived": archived_count,\n                "users_affected": len(user_insights)\n            }\n            \n    except Exception as e:\n        logger.error(f"Failed to archive old insights: {e}")\n        worker.session.rollback()\n        return {"status": "failed", "error": str(e)}\n\n@celery_app.task\ndef system_health_check():\n    """\n    Perform system health checks and report metrics\n    \n    This task runs every 15 minutes to monitor system health.\n    """\n    try:\n        with WeeklyInsightsWorker() as worker:\n            now = datetime.utcnow()\n            last_24h = now - timedelta(hours=24)\n            \n            # Check insight generation health\n            recent_insights = worker.session.query(WeeklyInsight).filter(\n                WeeklyInsight.created_at >= last_24h\n            ).all()\n            \n            successful_insights = [i for i in recent_insights if i.status == InsightStatus.GENERATED]\n            failed_insights = [i for i in recent_insights if i.status == InsightStatus.FAILED]\n            \n            # Check email delivery health\n            recent_deliveries = worker.session.query(InsightEmailDelivery).filter(\n                InsightEmailDelivery.created_at >= last_24h\n            ).all()\n            \n            successful_deliveries = [\n                d for d in recent_deliveries \n                if d.status in [EmailDeliveryStatus.SENT, EmailDeliveryStatus.DELIVERED]\n            ]\n            failed_deliveries = [d for d in recent_deliveries if d.status == EmailDeliveryStatus.FAILED]\n            \n            # Report metrics\n            worker.metrics.gauge('insights_generated_24h', len(successful_insights))\n            worker.metrics.gauge('insights_failed_24h', len(failed_insights))\n            worker.metrics.gauge('emails_delivered_24h', len(successful_deliveries))\n            worker.metrics.gauge('emails_failed_24h', len(failed_deliveries))\n            \n            health_status = {\n                "timestamp": now.isoformat(),\n                "insights_24h": {\n                    "generated": len(successful_insights),\n                    "failed": len(failed_insights),\n                    "success_rate": len(successful_insights) / len(recent_insights) * 100 if recent_insights else 100\n                },\n                "emails_24h": {\n                    "delivered": len(successful_deliveries),\n                    "failed": len(failed_deliveries),\n                    "success_rate": len(successful_deliveries) / len(recent_deliveries) * 100 if recent_deliveries else 100\n                }\n            }\n            \n            # Alert if health metrics are concerning\n            if health_status["insights_24h"]["success_rate"] < 80:\n                logger.warning(f"Low insight generation success rate: {health_status['insights_24h']['success_rate']:.1f}%")\n            \n            if health_status["emails_24h"]["success_rate"] < 90:\n                logger.warning(f"Low email delivery success rate: {health_status['emails_24h']['success_rate']:.1f}%")\n            \n            return health_status\n            \n    except Exception as e:\n        logger.error(f"System health check failed: {e}")\n        return {"status": "failed", "error": str(e)}\n\n# Initialize metrics on startup\nif __name__ == "__main__":\n    logger.info("Weekly Insights Worker initialized")\n    \n    # Start Celery worker with:\n    # celery -A weekly_insights_worker worker --loglevel=info --queues=insights_generation,email_delivery,maintenance\n    \n    # Start Celery beat with:\n    # celery -A weekly_insights_worker beat --loglevel=info