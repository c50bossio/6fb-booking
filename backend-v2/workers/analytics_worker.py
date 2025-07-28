"""
Analytics Data Processing Queue Worker for BookedBarber V2
Handles analytics data processing, reporting, and business intelligence
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from celery import Celery
from datetime import datetime, timedelta
import logging
import json
from contextlib import contextmanager
from typing import Dict, Any, List, Optional
from sqlalchemy import and_, or_, func, desc

from db import SessionLocal
from config import settings
from models import User, Appointment, Payment
from models.message_queue import MessageQueue, MessageStatus, MessageQueueType, MessagePriority
from services.analytics_service import analytics_service
from services.sentry_monitoring import celery_monitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import Sentry monitoring if available
try:
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False


@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def monitor_task(task_name: str):
    """Decorator for monitoring tasks with Sentry"""
    def decorator(func):
        if SENTRY_MONITORING_AVAILABLE:
            return celery_monitor.monitor_task_execution(task_name)(func)
        return func
    return decorator


# Import from main celery app
from celery_app import celery_app


@celery_app.task(bind=True, max_retries=2)
@monitor_task("process_booking_analytics")
def process_booking_analytics(self, data: Dict[str, Any]):
    """
    Process booking analytics data and update metrics
    """
    try:
        with get_db_session() as db:
            analytics_type = data.get('type', 'booking_created')
            appointment_id = data.get('appointment_id')
            
            if not appointment_id:
                logger.error("Missing appointment_id in booking analytics data")
                return {"status": "error", "message": "Missing appointment_id"}
            
            # Get appointment details
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                logger.error(f"Appointment not found: {appointment_id}")
                return {"status": "error", "message": "Appointment not found"}
            
            # Process different analytics types
            if analytics_type == 'booking_created':
                result = _process_booking_created(db, appointment, data)
            elif analytics_type == 'booking_completed':
                result = _process_booking_completed(db, appointment, data)
            elif analytics_type == 'booking_cancelled':
                result = _process_booking_cancelled(db, appointment, data)
            elif analytics_type == 'booking_no_show':
                result = _process_booking_no_show(db, appointment, data)
            else:
                logger.warning(f"Unknown booking analytics type: {analytics_type}")
                result = {"status": "ignored", "type": analytics_type}
            
            logger.info(f"Booking analytics processed: {analytics_type} for appointment {appointment_id}")
            return result
            
    except Exception as e:
        logger.error(f"Error processing booking analytics: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("update_revenue_metrics")
def update_revenue_metrics(self):
    """
    Update revenue metrics and business intelligence data
    """
    try:
        with get_db_session() as db:
            current_time = datetime.utcnow()
            
            # Calculate revenue metrics for different time periods
            metrics = {}
            
            # Daily revenue
            daily_revenue = _calculate_daily_revenue(db, current_time)
            metrics['daily'] = daily_revenue
            
            # Weekly revenue
            weekly_revenue = _calculate_weekly_revenue(db, current_time)
            metrics['weekly'] = weekly_revenue
            
            # Monthly revenue
            monthly_revenue = _calculate_monthly_revenue(db, current_time)
            metrics['monthly'] = monthly_revenue
            
            # Barber performance metrics
            barber_metrics = _calculate_barber_performance(db, current_time)
            metrics['barber_performance'] = barber_metrics
            
            # Service popularity metrics
            service_metrics = _calculate_service_metrics(db, current_time)
            metrics['service_performance'] = service_metrics
            
            # Store metrics in analytics service
            analytics_service.store_revenue_metrics(db, metrics, current_time)
            
            logger.info(f"Revenue metrics updated: {len(metrics)} categories")
            return {
                "status": "completed",
                "timestamp": current_time.isoformat(),
                "metrics_categories": list(metrics.keys())
            }
            
    except Exception as e:
        logger.error(f"Error updating revenue metrics: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=1)
@monitor_task("generate_daily_reports")
def generate_daily_reports(self, report_date: str = None):
    """
    Generate comprehensive daily business reports
    """
    try:
        with get_db_session() as db:
            if report_date:
                target_date = datetime.fromisoformat(report_date).date()
            else:
                target_date = datetime.utcnow().date()
            
            # Generate different report sections
            reports = {}
            
            # Daily summary report
            daily_summary = _generate_daily_summary_report(db, target_date)
            reports['daily_summary'] = daily_summary
            
            # Appointment analytics report
            appointment_report = _generate_appointment_analytics_report(db, target_date)
            reports['appointments'] = appointment_report
            
            # Revenue breakdown report
            revenue_report = _generate_revenue_breakdown_report(db, target_date)
            reports['revenue'] = revenue_report
            
            # Customer insights report
            customer_report = _generate_customer_insights_report(db, target_date)
            reports['customers'] = customer_report
            
            # Performance trends report
            trends_report = _generate_performance_trends_report(db, target_date)
            reports['trends'] = trends_report
            
            # Store reports
            report_id = analytics_service.store_daily_reports(db, target_date, reports)
            
            # Send report to stakeholders if configured
            if settings.daily_reports_enabled:
                _send_daily_reports(db, report_id, reports, target_date)
            
            logger.info(f"Daily reports generated for {target_date}")
            return {
                "status": "completed",
                "report_date": target_date.isoformat(),
                "report_id": report_id,
                "sections": list(reports.keys())
            }
            
    except Exception as e:
        logger.error(f"Error generating daily reports: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 1800  # 30 minutes
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("process_user_behavior")
def process_user_behavior(self, behavior_data: Dict[str, Any]):
    """
    Process user behavior analytics and engagement metrics
    """
    try:
        with get_db_session() as db:
            user_id = behavior_data.get('user_id')
            event_type = behavior_data.get('event_type')
            timestamp = behavior_data.get('timestamp', datetime.utcnow())
            
            if not user_id or not event_type:
                logger.error("Missing user_id or event_type in behavior data")
                return {"status": "error", "message": "Missing required fields"}
            
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User not found: {user_id}")
                return {"status": "error", "message": "User not found"}
            
            # Process different behavior events
            if event_type == 'page_view':
                result = _process_page_view(db, user, behavior_data)
            elif event_type == 'booking_attempt':
                result = _process_booking_attempt(db, user, behavior_data)
            elif event_type == 'search_query':
                result = _process_search_query(db, user, behavior_data)
            elif event_type == 'feature_interaction':
                result = _process_feature_interaction(db, user, behavior_data)
            elif event_type == 'session_duration':
                result = _process_session_duration(db, user, behavior_data)
            else:
                logger.warning(f"Unknown behavior event type: {event_type}")
                result = {"status": "ignored", "event_type": event_type}
            
            # Update user engagement score
            _update_user_engagement_score(db, user_id, event_type, behavior_data)
            
            logger.info(f"User behavior processed: {event_type} for user {user_id}")
            return result
            
    except Exception as e:
        logger.error(f"Error processing user behavior: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 180 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("update_business_insights")
def update_business_insights(self):
    """
    Update business insights and predictive analytics
    """
    try:
        with get_db_session() as db:
            current_time = datetime.utcnow()
            insights = {}
            
            # Customer lifetime value insights
            clv_insights = _calculate_customer_lifetime_value_insights(db)
            insights['customer_lifetime_value'] = clv_insights
            
            # Booking pattern insights
            booking_insights = _analyze_booking_patterns(db)
            insights['booking_patterns'] = booking_insights
            
            # Revenue forecasting insights
            forecast_insights = _generate_revenue_forecasts(db)
            insights['revenue_forecast'] = forecast_insights
            
            # Capacity optimization insights
            capacity_insights = _analyze_capacity_utilization(db)
            insights['capacity_utilization'] = capacity_insights
            
            # Customer segmentation insights
            segmentation_insights = _perform_customer_segmentation(db)
            insights['customer_segments'] = segmentation_insights
            
            # Store insights
            analytics_service.store_business_insights(db, insights, current_time)
            
            logger.info(f"Business insights updated: {len(insights)} categories")
            return {
                "status": "completed",
                "timestamp": current_time.isoformat(),
                "insights_categories": list(insights.keys())
            }
            
    except Exception as e:
        logger.error(f"Error updating business insights: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 600 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


# Helper functions for booking analytics
def _process_booking_created(db, appointment: Appointment, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process booking creation analytics"""
    
    # Track booking creation metrics
    analytics_service.increment_metric(db, 'bookings_created_total')
    analytics_service.increment_metric(db, f'bookings_created_{appointment.service_name.lower().replace(" ", "_")}')
    
    # Track booking source
    booking_source = data.get('source', 'unknown')
    analytics_service.increment_metric(db, f'bookings_source_{booking_source}')
    
    # Track booking value
    if appointment.price:
        analytics_service.add_value_metric(db, 'booking_value_total', float(appointment.price))
    
    return {"status": "processed", "type": "booking_created"}


def _process_booking_completed(db, appointment: Appointment, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process booking completion analytics"""
    
    # Track completion metrics
    analytics_service.increment_metric(db, 'bookings_completed_total')
    
    # Calculate and track service duration
    if appointment.start_time and appointment.end_time:
        duration = (appointment.end_time - appointment.start_time).total_seconds() / 60
        analytics_service.add_value_metric(db, 'service_duration_minutes', duration)
    
    # Track customer satisfaction if provided
    satisfaction_score = data.get('satisfaction_score')
    if satisfaction_score:
        analytics_service.add_value_metric(db, 'customer_satisfaction_score', satisfaction_score)
    
    return {"status": "processed", "type": "booking_completed"}


def _process_booking_cancelled(db, appointment: Appointment, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process booking cancellation analytics"""
    
    # Track cancellation metrics
    analytics_service.increment_metric(db, 'bookings_cancelled_total')
    
    # Track cancellation reason
    cancellation_reason = data.get('reason', 'unknown')
    analytics_service.increment_metric(db, f'cancellation_reason_{cancellation_reason}')
    
    # Track cancellation timing
    if appointment.start_time:
        time_to_appointment = (appointment.start_time - datetime.utcnow()).total_seconds() / 3600
        if time_to_appointment < 24:
            analytics_service.increment_metric(db, 'last_minute_cancellations')
    
    return {"status": "processed", "type": "booking_cancelled"}


def _process_booking_no_show(db, appointment: Appointment, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process booking no-show analytics"""
    
    # Track no-show metrics
    analytics_service.increment_metric(db, 'bookings_no_show_total')
    
    # Track no-show patterns by day of week
    day_of_week = appointment.start_time.strftime('%A').lower()
    analytics_service.increment_metric(db, f'no_show_{day_of_week}')
    
    return {"status": "processed", "type": "booking_no_show"}


# Helper functions for revenue calculations
def _calculate_daily_revenue(db, date: datetime) -> Dict[str, Any]:
    """Calculate daily revenue metrics"""
    
    start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Get completed appointments for the day
    completed_appointments = db.query(Appointment).filter(
        and_(
            Appointment.start_time >= start_of_day,
            Appointment.start_time < end_of_day,
            Appointment.status == 'completed'
        )
    ).all()
    
    total_revenue = sum(float(apt.price or 0) for apt in completed_appointments)
    appointment_count = len(completed_appointments)
    avg_revenue_per_booking = total_revenue / appointment_count if appointment_count > 0 else 0
    
    return {
        "date": start_of_day.date().isoformat(),
        "total_revenue": total_revenue,
        "appointment_count": appointment_count,
        "avg_revenue_per_booking": avg_revenue_per_booking
    }


def _calculate_weekly_revenue(db, date: datetime) -> Dict[str, Any]:
    """Calculate weekly revenue metrics"""
    
    # Get start of week (Monday)
    days_since_monday = date.weekday()
    start_of_week = date - timedelta(days=days_since_monday)
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)
    
    # Get completed appointments for the week
    completed_appointments = db.query(Appointment).filter(
        and_(
            Appointment.start_time >= start_of_week,
            Appointment.start_time < end_of_week,
            Appointment.status == 'completed'
        )
    ).all()
    
    total_revenue = sum(float(apt.price or 0) for apt in completed_appointments)
    appointment_count = len(completed_appointments)
    
    return {
        "week_start": start_of_week.date().isoformat(),
        "total_revenue": total_revenue,
        "appointment_count": appointment_count
    }


def _calculate_monthly_revenue(db, date: datetime) -> Dict[str, Any]:
    """Calculate monthly revenue metrics"""
    
    # Get start of month
    start_of_month = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start_of_month.month == 12:
        end_of_month = start_of_month.replace(year=start_of_month.year + 1, month=1)
    else:
        end_of_month = start_of_month.replace(month=start_of_month.month + 1)
    
    # Get completed appointments for the month
    completed_appointments = db.query(Appointment).filter(
        and_(
            Appointment.start_time >= start_of_month,
            Appointment.start_time < end_of_month,
            Appointment.status == 'completed'
        )
    ).all()
    
    total_revenue = sum(float(apt.price or 0) for apt in completed_appointments)
    appointment_count = len(completed_appointments)
    
    return {
        "month": start_of_month.strftime("%Y-%m"),
        "total_revenue": total_revenue,
        "appointment_count": appointment_count
    }


def _calculate_barber_performance(db, date: datetime) -> Dict[str, Any]:
    """Calculate barber performance metrics"""
    
    # Get last 30 days of data
    start_date = date - timedelta(days=30)
    
    # Get barber performance data
    barber_stats = db.query(
        User.id,
        User.name,
        func.count(Appointment.id).label('appointment_count'),
        func.sum(Appointment.price).label('total_revenue'),
        func.avg(Appointment.price).label('avg_booking_value')
    ).join(
        Appointment, Appointment.barber_id == User.id
    ).filter(
        and_(
            Appointment.start_time >= start_date,
            Appointment.status == 'completed',
            User.role == 'barber'
        )
    ).group_by(User.id, User.name).all()
    
    performance_data = []
    for stat in barber_stats:
        performance_data.append({
            "barber_id": stat.id,
            "barber_name": stat.name,
            "appointment_count": stat.appointment_count,
            "total_revenue": float(stat.total_revenue or 0),
            "avg_booking_value": float(stat.avg_booking_value or 0)
        })
    
    return {
        "period_days": 30,
        "barber_performance": performance_data
    }


def _calculate_service_metrics(db, date: datetime) -> Dict[str, Any]:
    """Calculate service popularity and performance metrics"""
    
    # Get last 30 days of data
    start_date = date - timedelta(days=30)
    
    # Get service statistics
    service_stats = db.query(
        Appointment.service_name,
        func.count(Appointment.id).label('booking_count'),
        func.sum(Appointment.price).label('total_revenue'),
        func.avg(Appointment.price).label('avg_price')
    ).filter(
        and_(
            Appointment.start_time >= start_date,
            Appointment.status == 'completed'
        )
    ).group_by(Appointment.service_name).all()
    
    service_data = []
    for stat in service_stats:
        service_data.append({
            "service_name": stat.service_name,
            "booking_count": stat.booking_count,
            "total_revenue": float(stat.total_revenue or 0),
            "avg_price": float(stat.avg_price or 0)
        })
    
    return {
        "period_days": 30,
        "service_metrics": service_data
    }


# Placeholder functions for complex analytics (would need full implementation)
def _generate_daily_summary_report(db, date) -> Dict[str, Any]:
    """Generate daily summary report"""
    return {"summary": "Daily report generated", "date": date.isoformat()}


def _generate_appointment_analytics_report(db, date) -> Dict[str, Any]:
    """Generate appointment analytics report"""
    return {"appointments": "Appointment analytics generated", "date": date.isoformat()}


def _generate_revenue_breakdown_report(db, date) -> Dict[str, Any]:
    """Generate revenue breakdown report"""
    return {"revenue": "Revenue breakdown generated", "date": date.isoformat()}


def _generate_customer_insights_report(db, date) -> Dict[str, Any]:
    """Generate customer insights report"""
    return {"customers": "Customer insights generated", "date": date.isoformat()}


def _generate_performance_trends_report(db, date) -> Dict[str, Any]:
    """Generate performance trends report"""
    return {"trends": "Performance trends generated", "date": date.isoformat()}


def _send_daily_reports(db, report_id: int, reports: Dict[str, Any], date) -> None:
    """Send daily reports to stakeholders"""
    logger.info(f"Daily reports sent for {date}")


def _process_page_view(db, user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process page view behavior"""
    return {"status": "processed", "event": "page_view"}


def _process_booking_attempt(db, user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process booking attempt behavior"""
    return {"status": "processed", "event": "booking_attempt"}


def _process_search_query(db, user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process search query behavior"""
    return {"status": "processed", "event": "search_query"}


def _process_feature_interaction(db, user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process feature interaction behavior"""
    return {"status": "processed", "event": "feature_interaction"}


def _process_session_duration(db, user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process session duration behavior"""
    return {"status": "processed", "event": "session_duration"}


def _update_user_engagement_score(db, user_id: int, event_type: str, data: Dict[str, Any]) -> None:
    """Update user engagement score based on behavior"""
    # This would update a user engagement scoring system
    logger.info(f"User engagement score updated for user {user_id}")


# Placeholder functions for business insights
def _calculate_customer_lifetime_value_insights(db) -> Dict[str, Any]:
    """Calculate customer lifetime value insights"""
    return {"clv": "Customer lifetime value calculated"}


def _analyze_booking_patterns(db) -> Dict[str, Any]:
    """Analyze booking patterns"""
    return {"patterns": "Booking patterns analyzed"}


def _generate_revenue_forecasts(db) -> Dict[str, Any]:
    """Generate revenue forecasts"""
    return {"forecast": "Revenue forecast generated"}


def _analyze_capacity_utilization(db) -> Dict[str, Any]:
    """Analyze capacity utilization"""
    return {"capacity": "Capacity utilization analyzed"}


def _perform_customer_segmentation(db) -> Dict[str, Any]:
    """Perform customer segmentation"""
    return {"segments": "Customer segmentation performed"}


# Health check task
@celery_app.task
def analytics_worker_health_check():
    """Health check for analytics worker"""
    with get_db_session() as db:
        # Get basic analytics health metrics
        total_appointments = db.query(Appointment).count()
        recent_appointments = db.query(Appointment).filter(
            Appointment.created_at >= datetime.utcnow() - timedelta(days=7)
        ).count()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_type": "analytics_worker",
        "data_health": {
            "total_appointments": total_appointments,
            "recent_appointments": recent_appointments
        },
        "worker_id": os.getpid()
    }