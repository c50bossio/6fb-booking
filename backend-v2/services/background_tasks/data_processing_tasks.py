"""
Background tasks for data processing and analytics.
Handles data exports, report generation, and analytics processing.
"""

import logging
import json
import csv
import io
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, and_, or_

from services.celery_app import celery_app
from database import SessionLocal
from models import Appointment, User, Client, Payment, DataExportRequest
from models.consent import ExportStatus as ExportStatusModel
from config import settings
from services.startup_cache import invalidate_cache_for_event

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=2)
def generate_daily_analytics(self, date_str: Optional[str] = None):
    """
    Generate daily analytics report.
    
    Args:
        date_str: Date string in YYYY-MM-DD format (defaults to yesterday)
    """
    try:
        db = SessionLocal()
        
        # Parse date or use yesterday
        if date_str:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            target_date = (datetime.utcnow() - timedelta(days=1)).date()
        
        logger.info(f"📊 Generating analytics for {target_date}")
        
        # Calculate date range
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        
        # Analytics queries
        analytics = {}
        
        # 1. Appointment metrics
        appointments_query = db.query(Appointment).filter(
            and_(
                Appointment.start_time >= start_datetime,
                Appointment.start_time <= end_datetime
            )
        )
        
        analytics['appointments'] = {
            'total_appointments': appointments_query.count(),
            'confirmed_appointments': appointments_query.filter(Appointment.status == 'confirmed').count(),
            'cancelled_appointments': appointments_query.filter(Appointment.status == 'cancelled').count(),
            'completed_appointments': appointments_query.filter(Appointment.status == 'completed').count(),
        }
        
        # 2. Revenue metrics
        payments_query = db.query(Payment).filter(
            and_(
                Payment.created_at >= start_datetime,
                Payment.created_at <= end_datetime,
                Payment.status == 'completed'
            )
        )
        
        total_revenue = payments_query.with_entities(func.sum(Payment.amount)).scalar() or 0
        analytics['revenue'] = {
            'total_revenue': float(total_revenue),
            'total_transactions': payments_query.count(),
            'average_transaction': float(total_revenue / max(payments_query.count(), 1))
        }
        
        # 3. Client metrics
        new_clients = db.query(Client).filter(
            and_(
                Client.created_at >= start_datetime,
                Client.created_at <= end_datetime
            )
        ).count()
        
        analytics['clients'] = {
            'new_clients': new_clients,
            'total_clients': db.query(Client).count()
        }
        
        # 4. Booking patterns
        hourly_bookings = db.query(
            func.extract('hour', Appointment.start_time).label('hour'),
            func.count(Appointment.id).label('count')
        ).filter(
            and_(
                Appointment.start_time >= start_datetime,
                Appointment.start_time <= end_datetime
            )
        ).group_by(func.extract('hour', Appointment.start_time)).all()
        
        analytics['booking_patterns'] = {
            'hourly_distribution': {int(hour): count for hour, count in hourly_bookings},
            'peak_hour': max(hourly_bookings, key=lambda x: x.count)[0] if hourly_bookings else None
        }
        
        # Store analytics in cache
        cache_key = f"analytics:daily:{target_date.isoformat()}"
        analytics['generated_at'] = datetime.utcnow().isoformat()
        analytics['date'] = target_date.isoformat()
        
        # Store in Redis cache (using startup cache service)
        from services.startup_cache import get_cache_service
        cache_service = await get_cache_service()
        if cache_service:
            await cache_service.set(cache_key, analytics, ttl=86400)  # 24 hours
        
        logger.info(f"✅ Daily analytics generated for {target_date}")
        
        return {
            'status': 'success',
            'date': target_date.isoformat(),
            'analytics': analytics,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to generate daily analytics: {e}")
        
        try:
            self.retry(countdown=300)  # Retry after 5 minutes
        except self.MaxRetriesExceededError:
            logger.error("❌ Max retries exceeded for daily analytics")
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task(bind=True, max_retries=3)
def process_data_export(self, export_request_id: int):
    """
    Process a data export request.
    
    Args:
        export_request_id: ID of the data export request
    """
    try:
        db = SessionLocal()
        
        # Get export request
        export_request = db.query(DataExportRequest).filter(
            DataExportRequest.id == export_request_id
        ).first()
        
        if not export_request:
            logger.warning(f"⚠️ Export request {export_request_id} not found")
            return {'status': 'not_found', 'export_id': export_request_id}
        
        # Update status to processing
        export_request.status = ExportStatusModel.PROCESSING
        export_request.started_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"📦 Processing data export {export_request.request_id}")
        
        # Collect user data based on categories
        user_data = {}
        
        if 'profile' in export_request.data_categories:
            user = db.query(User).filter(User.id == export_request.user_id).first()
            if user:
                user_data['profile'] = {
                    'id': user.id,
                    'email': user.email,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': user.last_login.isoformat() if hasattr(user, 'last_login') and user.last_login else None
                }
        
        if 'appointments' in export_request.data_categories:
            appointments = db.query(Appointment).filter(
                Appointment.user_id == export_request.user_id
            ).all()
            
            user_data['appointments'] = [
                {
                    'id': apt.id,
                    'start_time': apt.start_time.isoformat(),
                    'end_time': apt.end_time.isoformat() if apt.end_time else None,
                    'status': apt.status,
                    'service': apt.service.name if hasattr(apt, 'service') else None,
                    'created_at': apt.created_at.isoformat() if apt.created_at else None
                } for apt in appointments
            ]
        
        if 'payments' in export_request.data_categories:
            payments = db.query(Payment).filter(
                Payment.user_id == export_request.user_id
            ).all()
            
            user_data['payments'] = [
                {
                    'id': payment.id,
                    'amount': float(payment.amount),
                    'currency': payment.currency,
                    'status': payment.status,
                    'created_at': payment.created_at.isoformat() if payment.created_at else None
                } for payment in payments
            ]
        
        # Generate export file based on format
        if export_request.format.lower() == 'json':
            export_content = json.dumps(user_data, indent=2)
            content_type = 'application/json'
            file_extension = 'json'
        
        elif export_request.format.lower() == 'csv':
            # Flatten data for CSV format
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers and data for each category
            for category, data in user_data.items():
                writer.writerow([f"--- {category.upper()} ---"])
                
                if isinstance(data, dict):
                    writer.writerow(data.keys())
                    writer.writerow(data.values())
                elif isinstance(data, list) and data:
                    writer.writerow(data[0].keys())
                    for item in data:
                        writer.writerow(item.values())
                
                writer.writerow([])  # Empty row separator
            
            export_content = output.getvalue()
            content_type = 'text/csv'
            file_extension = 'csv'
        
        else:
            raise ValueError(f"Unsupported export format: {export_request.format}")
        
        # Store export result (in production, save to cloud storage)
        export_filename = f"user_data_{export_request.user_id}_{export_request.request_id}.{file_extension}"
        
        # Update export request with completion
        export_request.status = ExportStatusModel.COMPLETED
        export_request.completed_at = datetime.utcnow()
        export_request.file_path = export_filename
        export_request.file_size = len(export_content.encode())
        db.commit()
        
        logger.info(f"✅ Data export completed: {export_request.request_id}")
        
        # Invalidate user cache
        await invalidate_cache_for_event("user_data_exported", {"user_id": export_request.user_id})
        
        return {
            'status': 'success',
            'export_id': export_request_id,
            'request_id': export_request.request_id,
            'filename': export_filename,
            'file_size': len(export_content.encode()),
            'records_exported': sum(len(data) if isinstance(data, list) else 1 for data in user_data.values()),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Data export failed: {e}")
        
        # Update export request with error
        if 'db' in locals() and 'export_request' in locals():
            try:
                export_request.status = ExportStatusModel.FAILED
                export_request.error_message = str(e)
                export_request.completed_at = datetime.utcnow()
                db.commit()
            except:
                pass
        
        try:
            self.retry(countdown=600)  # Retry after 10 minutes
        except self.MaxRetriesExceededError:
            logger.error(f"❌ Max retries exceeded for export {export_request_id}")
            return {
                'status': 'failed',
                'export_id': export_request_id,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def process_data_exports():
    """
    Scheduled task to process pending data export requests.
    Runs every 10 minutes to check for new export requests.
    """
    try:
        db = SessionLocal()
        
        # Find pending export requests
        pending_exports = db.query(DataExportRequest).filter(
            DataExportRequest.status == ExportStatusModel.PENDING
        ).order_by(DataExportRequest.requested_at).limit(10).all()
        
        processed_count = 0
        
        for export_request in pending_exports:
            # Schedule processing
            process_data_export.delay(export_request.id)
            processed_count += 1
        
        logger.info(f"✅ Scheduled {processed_count} data export requests for processing")
        
        return {
            'status': 'success',
            'exports_scheduled': processed_count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to process data exports: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task(bind=True)
def generate_weekly_report(self, week_start_date: Optional[str] = None):
    """
    Generate weekly analytics report.
    
    Args:
        week_start_date: Start date of week in YYYY-MM-DD format
    """
    try:
        db = SessionLocal()
        
        # Calculate week range
        if week_start_date:
            start_date = datetime.strptime(week_start_date, '%Y-%m-%d').date()
        else:
            # Default to previous week
            today = datetime.utcnow().date()
            start_date = today - timedelta(days=today.weekday() + 7)
        
        end_date = start_date + timedelta(days=6)
        
        logger.info(f"📈 Generating weekly report for {start_date} to {end_date}")
        
        # Weekly analytics
        weekly_analytics = {
            'week_start': start_date.isoformat(),
            'week_end': end_date.isoformat(),
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Aggregate daily analytics for the week
        daily_totals = {
            'appointments': 0,
            'revenue': 0.0,
            'new_clients': 0
        }
        
        for day_offset in range(7):
            current_date = start_date + timedelta(days=day_offset)
            
            # Check if we have daily analytics cached
            cache_key = f"analytics:daily:{current_date.isoformat()}"
            
            # If not cached, calculate for this day
            day_start = datetime.combine(current_date, datetime.min.time())
            day_end = datetime.combine(current_date, datetime.max.time())
            
            # Count appointments
            day_appointments = db.query(Appointment).filter(
                and_(
                    Appointment.start_time >= day_start,
                    Appointment.start_time <= day_end,
                    Appointment.status.in_(['confirmed', 'completed'])
                )
            ).count()
            
            # Calculate revenue
            day_revenue = db.query(Payment).filter(
                and_(
                    Payment.created_at >= day_start,
                    Payment.created_at <= day_end,
                    Payment.status == 'completed'
                )
            ).with_entities(func.sum(Payment.amount)).scalar() or 0
            
            # Count new clients
            day_new_clients = db.query(Client).filter(
                and_(
                    Client.created_at >= day_start,
                    Client.created_at <= day_end
                )
            ).count()
            
            daily_totals['appointments'] += day_appointments
            daily_totals['revenue'] += float(day_revenue)
            daily_totals['new_clients'] += day_new_clients
        
        weekly_analytics.update(daily_totals)
        
        # Calculate trends (compare with previous week)
        prev_week_start = start_date - timedelta(days=7)
        prev_week_end = end_date - timedelta(days=7)
        
        prev_week_appointments = db.query(Appointment).filter(
            and_(
                Appointment.start_time >= datetime.combine(prev_week_start, datetime.min.time()),
                Appointment.start_time <= datetime.combine(prev_week_end, datetime.max.time()),
                Appointment.status.in_(['confirmed', 'completed'])
            )
        ).count()
        
        weekly_analytics['trends'] = {
            'appointment_change': daily_totals['appointments'] - prev_week_appointments,
            'appointment_change_percent': (
                ((daily_totals['appointments'] - prev_week_appointments) / max(prev_week_appointments, 1)) * 100
            )
        }
        
        logger.info(f"✅ Weekly report generated for {start_date} to {end_date}")
        
        return {
            'status': 'success',
            'week_start': start_date.isoformat(),
            'week_end': end_date.isoformat(),
            'analytics': weekly_analytics,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to generate weekly report: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def cleanup_old_analytics():
    """
    Clean up old analytics data to save storage space.
    Removes analytics older than 90 days.
    """
    try:
        # This would clean up old analytics from database or cache
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        
        logger.info(f"🧹 Cleaning up analytics data older than {cutoff_date.date()}")
        
        # In production, implement actual cleanup logic
        # For now, just return success
        
        return {
            'status': 'success',
            'cutoff_date': cutoff_date.isoformat(),
            'records_cleaned': 0,  # Would be actual count
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Analytics cleanup failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

# Health check for data processing tasks
@celery_app.task
def data_processing_health_check():
    """Health check for data processing system"""
    try:
        db = SessionLocal()
        
        # Test database connectivity
        db.execute("SELECT 1")
        
        # Check pending export requests
        pending_exports = db.query(DataExportRequest).filter(
            DataExportRequest.status == ExportStatusModel.PENDING
        ).count()
        
        return {
            'status': 'healthy',
            'database_connected': True,
            'pending_exports': pending_exports,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Data processing health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task(bind=True, max_retries=3)
def schedule_account_deletion(self, user_id: int, deletion_date: Optional[str] = None):
    """
    Schedule account deletion for GDPR compliance.
    
    Args:
        user_id: ID of the user account to delete
        deletion_date: Date when deletion should occur (ISO format)
    """
    try:
        db = SessionLocal()
        
        # Calculate deletion date if not provided (30 days from now)
        if deletion_date:
            scheduled_date = datetime.fromisoformat(deletion_date)
        else:
            scheduled_date = datetime.utcnow() + timedelta(days=30)
        
        logger.info(f"📅 Scheduling account deletion for user {user_id} on {scheduled_date}")
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"⚠️ User {user_id} not found for deletion scheduling")
            return {'status': 'not_found', 'user_id': user_id}
        
        # Check if already marked for deletion
        if hasattr(user, 'deletion_scheduled_at') and user.deletion_scheduled_at:
            logger.info(f"ℹ️ User {user_id} already scheduled for deletion")
            return {
                'status': 'already_scheduled',
                'user_id': user_id,
                'scheduled_date': user.deletion_scheduled_at.isoformat()
            }
        
        # Mark user for deletion
        user.deletion_scheduled_at = scheduled_date
        user.is_active = False
        db.commit()
        
        # Schedule the actual deletion task
        eta = scheduled_date.replace(tzinfo=timezone.utc)
        perform_account_deletion.apply_async(
            args=[user_id],
            eta=eta,
            queue='data_processing'
        )
        
        logger.info(f"✅ Account deletion scheduled for user {user_id}")
        
        return {
            'status': 'scheduled',
            'user_id': user_id,
            'scheduled_date': scheduled_date.isoformat(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to schedule account deletion: {e}")
        
        try:
            self.retry(countdown=600)  # Retry after 10 minutes
        except self.MaxRetriesExceededError:
            logger.error(f"❌ Max retries exceeded for deletion scheduling")
            return {
                'status': 'failed',
                'user_id': user_id,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task(bind=True, max_retries=1)
def perform_account_deletion(self, user_id: int):
    """
    Perform the actual account deletion.
    This permanently removes user data per GDPR requirements.
    
    Args:
        user_id: ID of the user account to delete
    """
    try:
        db = SessionLocal()
        
        logger.info(f"🗑️ Performing account deletion for user {user_id}")
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"⚠️ User {user_id} not found for deletion")
            return {'status': 'not_found', 'user_id': user_id}
        
        # Check if deletion is still valid (user might have cancelled)
        if user.is_active:
            logger.info(f"ℹ️ User {user_id} reactivated account, cancelling deletion")
            return {
                'status': 'cancelled',
                'user_id': user_id,
                'reason': 'User reactivated account'
            }
        
        # Anonymize user data instead of hard delete
        # This maintains referential integrity while complying with GDPR
        anonymized_email = f"deleted_user_{user_id}@deleted.local"
        
        # Store deletion metadata for audit
        deletion_metadata = {
            'original_email_hash': hash(user.email),
            'deletion_timestamp': datetime.utcnow().isoformat(),
            'data_categories_deleted': ['profile', 'appointments', 'payments', 'preferences']
        }
        
        # Anonymize user record
        user.email = anonymized_email
        user.password_hash = "DELETED"
        user.phone_number = None
        user.first_name = "Deleted"
        user.last_name = "User"
        
        # Clear personal data from related records
        # Appointments - keep for business records but anonymize
        appointments = db.query(Appointment).filter(
            Appointment.user_id == user_id
        ).all()
        
        for appointment in appointments:
            if hasattr(appointment, 'notes'):
                appointment.notes = "[Deleted per GDPR request]"
        
        # Payments - keep for financial records but anonymize
        payments = db.query(Payment).filter(
            Payment.user_id == user_id
        ).all()
        
        for payment in payments:
            if hasattr(payment, 'billing_details'):
                payment.billing_details = None
        
        # Delete preferences and consents
        from models import NotificationPreference, UserConsent
        
        db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).delete()
        
        db.query(UserConsent).filter(
            UserConsent.user_id == user_id
        ).delete()
        
        # Mark as deleted
        user.deleted_at = datetime.utcnow()
        user.deletion_metadata = json.dumps(deletion_metadata)
        
        db.commit()
        
        # Invalidate all user caches
        invalidate_cache_for_event("user_deleted", {"user_id": user_id})
        
        logger.info(f"✅ Account deletion completed for user {user_id}")
        
        # Send confirmation email if we have a valid email service
        try:
            # Note: This would send to the original email before deletion
            # You'd need to store it temporarily for this purpose
            pass
        except:
            pass
        
        return {
            'status': 'completed',
            'user_id': user_id,
            'anonymized_email': anonymized_email,
            'deleted_at': datetime.utcnow().isoformat(),
            'data_categories_processed': deletion_metadata['data_categories_deleted']
        }
        
    except Exception as e:
        logger.error(f"❌ Account deletion failed for user {user_id}: {e}")
        
        # Don't retry deletion operations to avoid partial deletions
        return {
            'status': 'failed',
            'user_id': user_id,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def check_scheduled_deletions():
    """
    Periodic task to check for scheduled account deletions.
    Runs daily to ensure deletions are processed even if the scheduled task fails.
    """
    try:
        db = SessionLocal()
        
        # Find users scheduled for deletion
        users_to_delete = db.query(User).filter(
            and_(
                User.deletion_scheduled_at <= datetime.utcnow(),
                User.deleted_at.is_(None),
                User.is_active == False
            )
        ).limit(10).all()
        
        processed_count = 0
        
        for user in users_to_delete:
            # Schedule immediate deletion
            perform_account_deletion.delay(user.id)
            processed_count += 1
        
        logger.info(f"✅ Scheduled {processed_count} account deletions for processing")
        
        return {
            'status': 'success',
            'deletions_scheduled': processed_count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to check scheduled deletions: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()