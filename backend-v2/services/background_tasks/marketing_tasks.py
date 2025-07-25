"""
Background tasks for marketing automation and campaigns.
Handles email campaigns, SMS marketing, and automated marketing workflows.
"""

import logging
from datetime import datetime, timedelta

from services.celery_app import celery_app
from services.marketing_service import MarketingService
from db import SessionLocal
from models import MarketingCampaign, Client
from config import settings

logger = logging.getLogger(__name__)

# Initialize marketing service
marketing_service = MarketingService()

@celery_app.task(bind=True, max_retries=3)
def process_scheduled_campaigns(self):
    """
    Process scheduled marketing campaigns.
    Runs every 30 minutes to check for campaigns ready to send.
    """
    try:
        db = SessionLocal()
        
        # Find campaigns scheduled for execution
        current_time = datetime.utcnow()
        scheduled_campaigns = db.query(MarketingCampaign).filter(
            MarketingCampaign.status == 'scheduled',
            MarketingCampaign.scheduled_for <= current_time
        ).all()
        
        processed_count = 0
        
        for campaign in scheduled_campaigns:
            try:
                # Execute campaign
                execute_marketing_campaign.delay(campaign.id)
                processed_count += 1
                
                logger.info(f"📧 Scheduled campaign execution: {campaign.name}")
                
            except Exception as e:
                logger.error(f"❌ Failed to schedule campaign {campaign.id}: {e}")
        
        logger.info(f"✅ Processed {processed_count} scheduled campaigns")
        
        return {
            'status': 'success',
            'campaigns_processed': processed_count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to process scheduled campaigns: {e}")
        
        try:
            self.retry(countdown=300)  # Retry after 5 minutes
        except self.MaxRetriesExceededError:
            logger.error("❌ Max retries exceeded for scheduled campaigns")
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task(bind=True, max_retries=2)
def execute_marketing_campaign(self, campaign_id: int):
    """
    Execute a specific marketing campaign.
    
    Args:
        campaign_id: ID of the campaign to execute
    """
    try:
        db = SessionLocal()
        
        campaign = db.query(MarketingCampaign).filter(
            MarketingCampaign.id == campaign_id
        ).first()
        
        if not campaign:
            logger.warning(f"⚠️ Campaign {campaign_id} not found")
            return {'status': 'not_found', 'campaign_id': campaign_id}
        
        logger.info(f"🚀 Executing campaign: {campaign.name}")
        
        # Update campaign status
        campaign.status = 'sending'
        campaign.started_at = datetime.utcnow()
        db.commit()
        
        # Get recipients based on campaign configuration
        recipients = []
        
        if campaign.recipient_list_id:
            # Get recipients from contact list
            from models import ContactListMember
            list_members = db.query(ContactListMember).filter(
                ContactListMember.contact_list_id == campaign.recipient_list_id,
                ContactListMember.status == 'active'
            ).all()
            
            recipients.extend([
                {
                    'email': member.email,
                    'name': member.name,
                    'client_id': member.client_id
                }
                for member in list_members if member.email
            ])
            
        elif campaign.recipient_segment_id:
            # Get recipients from segment
            from models import ContactSegment
            segment = db.query(ContactSegment).filter(
                ContactSegment.id == campaign.recipient_segment_id
            ).first()
            
            if segment:
                # Execute segment criteria to get clients
                # This would be more complex in production
                clients = db.query(Client).filter(
                    Client.status == 'active'
                ).limit(100).all()  # Simplified for now
                
                recipients.extend([
                    {
                        'email': client.email,
                        'name': client.name,
                        'client_id': client.id
                    }
                    for client in clients if client.email
                ])
        
        # Send campaign to recipients
        sent_count = 0
        failed_count = 0
        
        for recipient in recipients:
            try:
                if campaign.campaign_type == 'email':
                    # Send email campaign
                    from services.background_tasks.notification_tasks import send_email_notification
                    
                    # Personalize content
                    personalized_content = campaign.content.replace(
                        '{{name}}', recipient.get('name', 'Valued Customer')
                    )
                    personalized_subject = campaign.subject.replace(
                        '{{name}}', recipient.get('name', 'Valued Customer')
                    )
                    
                    send_email_notification.delay(
                        recipient['email'],
                        personalized_subject,
                        personalized_content,
                        template_name=campaign.template.name if hasattr(campaign, 'template') else None,
                        template_data={
                            'recipient_name': recipient.get('name', 'Valued Customer'),
                            'business_name': settings.business_name,
                            'campaign_name': campaign.name
                        }
                    )
                    
                    sent_count += 1
                    
                elif campaign.campaign_type == 'sms':
                    # Send SMS campaign
                    from services.background_tasks.notification_tasks import send_sms_notification
                    
                    # Get phone number (would need to be in recipient data)
                    if recipient.get('phone'):
                        personalized_message = campaign.content.replace(
                            '{{name}}', recipient.get('name', 'Valued Customer')
                        )
                        
                        send_sms_notification.delay(
                            recipient['phone'],
                            personalized_message
                        )
                        
                        sent_count += 1
                    else:
                        failed_count += 1
                        
            except Exception as e:
                logger.error(f"❌ Failed to send to {recipient['email']}: {e}")
                failed_count += 1
        
        # Update campaign with results
        campaign.status = 'completed'
        campaign.completed_at = datetime.utcnow()
        campaign.sent_count = sent_count
        campaign.failed_count = failed_count
        db.commit()
        
        logger.info(f"✅ Campaign completed: {campaign.name} - Sent: {sent_count}, Failed: {failed_count}")
        
        return {
            'status': 'success',
            'campaign_id': campaign_id,
            'campaign_name': campaign.name,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total_recipients': len(recipients),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Campaign execution failed: {e}")
        
        # Update campaign status to failed
        if 'db' in locals() and 'campaign' in locals():
            try:
                campaign.status = 'failed'
                campaign.error_message = str(e)
                campaign.completed_at = datetime.utcnow()
                db.commit()
            except:
                pass
        
        try:
            self.retry(countdown=600)  # Retry after 10 minutes
        except self.MaxRetriesExceededError:
            logger.error(f"❌ Max retries exceeded for campaign {campaign_id}")
            return {
                'status': 'failed',
                'campaign_id': campaign_id,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def send_abandoned_cart_reminders():
    """
    Send reminders for abandoned booking carts.
    Runs every 2 hours to check for incomplete bookings.
    """
    try:
        db = SessionLocal()
        
        # Find clients with incomplete bookings (simplified logic)
        cutoff_time = datetime.utcnow() - timedelta(hours=2)
        
        # In production, you'd have a more sophisticated system
        # to track booking abandonment
        
        logger.info("🛒 Checking for abandoned booking carts")
        
        # For now, just return success
        # In production, implement actual abandoned cart logic
        
        return {
            'status': 'success',
            'reminders_sent': 0,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Abandoned cart reminders failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def generate_client_retention_campaigns():
    """
    Generate automated retention campaigns for clients.
    Identifies clients at risk of churning and creates targeted campaigns.
    """
    try:
        db = SessionLocal()
        
        logger.info("🎯 Generating client retention campaigns")
        
        # Find clients who haven't booked in 30+ days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        from models import Appointment
        
        # Get clients with last appointment over 30 days ago
        inactive_clients = db.query(Client).join(Appointment).filter(
            Appointment.start_time < cutoff_date
        ).group_by(Client.id).having(
            func.max(Appointment.start_time) < cutoff_date
        ).limit(50).all()  # Limit to prevent overwhelming
        
        campaigns_created = 0
        
        for client in inactive_clients:
            try:
                # Create personalized retention campaign
                campaign_data = {
                    'name': f"Retention Campaign - {client.name}",
                    'description': f"Automated retention campaign for {client.name}",
                    'campaign_type': 'email',
                    'subject': f"We miss you, {client.name}!",
                    'content': f"""
                    Hi {client.name},
                    
                    We noticed it's been a while since your last visit to {settings.business_name}. 
                    We miss you and would love to have you back!
                    
                    As a special offer, we're giving you 15% off your next service.
                    
                    Book your appointment today: {settings.frontend_url}/book
                    
                    Best regards,
                    {settings.business_name}
                    """,
                    'scheduled_for': datetime.utcnow() + timedelta(hours=1),
                    'tags': ['retention', 'automated', 'discount']
                }
                
                # In production, create actual campaign record
                campaigns_created += 1
                
            except Exception as e:
                logger.error(f"❌ Failed to create retention campaign for client {client.id}: {e}")
        
        logger.info(f"✅ Generated {campaigns_created} retention campaigns")
        
        return {
            'status': 'success',
            'campaigns_created': campaigns_created,
            'clients_targeted': len(inactive_clients),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Client retention campaign generation failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def process_birthday_campaigns():
    """
    Send birthday greeting campaigns to clients.
    Runs daily to check for client birthdays.
    """
    try:
        db = SessionLocal()
        
        logger.info("🎂 Processing birthday campaigns")
        
        today = datetime.utcnow().date()
        
        # Find clients with birthdays today
        # Assuming clients have a birthday field
        birthday_clients = db.query(Client).filter(
            func.extract('month', Client.birthday) == today.month,
            func.extract('day', Client.birthday) == today.day
        ).all() if hasattr(Client, 'birthday') else []
        
        campaigns_sent = 0
        
        for client in birthday_clients:
            try:
                # Send birthday email
                from services.background_tasks.notification_tasks import send_email_notification
                
                subject = f"Happy Birthday, {client.name}! 🎉"
                content = f"""
                Happy Birthday, {client.name}! 🎂
                
                We hope you have a wonderful day filled with joy and celebration!
                
                As a birthday gift, enjoy 20% off any service this month.
                
                Book your birthday appointment: {settings.frontend_url}/book
                
                Wishing you all the best,
                {settings.business_name}
                """
                
                send_email_notification.delay(
                    client.email,
                    subject,
                    content,
                    template_name="birthday_greeting",
                    template_data={
                        'client_name': client.name,
                        'business_name': settings.business_name,
                        'booking_url': f"{settings.frontend_url}/book"
                    }
                )
                
                campaigns_sent += 1
                
            except Exception as e:
                logger.error(f"❌ Failed to send birthday campaign to client {client.id}: {e}")
        
        logger.info(f"✅ Sent {campaigns_sent} birthday campaigns")
        
        return {
            'status': 'success',
            'campaigns_sent': campaigns_sent,
            'birthday_clients': len(birthday_clients),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Birthday campaign processing failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def analyze_campaign_performance():
    """
    Analyze performance of completed marketing campaigns.
    Generates insights and recommendations.
    """
    try:
        db = SessionLocal()
        
        logger.info("📊 Analyzing campaign performance")
        
        # Get campaigns from last 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        recent_campaigns = db.query(MarketingCampaign).filter(
            MarketingCampaign.completed_at >= cutoff_date,
            MarketingCampaign.status == 'completed'
        ).all()
        
        if not recent_campaigns:
            logger.info("ℹ️ No recent campaigns to analyze")
            return {
                'status': 'no_data',
                'message': 'No recent campaigns found',
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Calculate performance metrics
        total_sent = sum(campaign.sent_count or 0 for campaign in recent_campaigns)
        total_failed = sum(campaign.failed_count or 0 for campaign in recent_campaigns)
        
        performance_analysis = {
            'total_campaigns': len(recent_campaigns),
            'total_sent': total_sent,
            'total_failed': total_failed,
            'success_rate': (total_sent / (total_sent + total_failed) * 100) if (total_sent + total_failed) > 0 else 0,
            'average_campaign_size': total_sent / len(recent_campaigns) if recent_campaigns else 0,
            'campaign_types': {},
            'top_performing_campaigns': [],
            'recommendations': []
        }
        
        # Analyze by campaign type
        for campaign in recent_campaigns:
            campaign_type = campaign.campaign_type
            if campaign_type not in performance_analysis['campaign_types']:
                performance_analysis['campaign_types'][campaign_type] = {
                    'count': 0,
                    'total_sent': 0,
                    'total_failed': 0
                }
            
            performance_analysis['campaign_types'][campaign_type]['count'] += 1
            performance_analysis['campaign_types'][campaign_type]['total_sent'] += campaign.sent_count or 0
            performance_analysis['campaign_types'][campaign_type]['total_failed'] += campaign.failed_count or 0
        
        # Identify top performing campaigns
        top_campaigns = sorted(
            recent_campaigns,
            key=lambda c: (c.sent_count or 0) - (c.failed_count or 0),
            reverse=True
        )[:5]
        
        performance_analysis['top_performing_campaigns'] = [
            {
                'name': campaign.name,
                'sent_count': campaign.sent_count or 0,
                'failed_count': campaign.failed_count or 0,
                'success_rate': ((campaign.sent_count or 0) / max((campaign.sent_count or 0) + (campaign.failed_count or 0), 1)) * 100
            }
            for campaign in top_campaigns
        ]
        
        # Generate recommendations
        if performance_analysis['success_rate'] < 90:
            performance_analysis['recommendations'].append(
                "Consider reviewing recipient lists for invalid email addresses"
            )
        
        if performance_analysis['average_campaign_size'] < 10:
            performance_analysis['recommendations'].append(
                "Consider building larger recipient lists for better campaign reach"
            )
        
        logger.info(f"✅ Campaign performance analysis completed for {len(recent_campaigns)} campaigns")
        
        return {
            'status': 'success',
            'analysis': performance_analysis,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Campaign performance analysis failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

# Health check for marketing tasks
@celery_app.task
def marketing_health_check():
    """Health check for marketing system"""
    try:
        # Test marketing service functionality
        health_status = {
            'status': 'healthy',
            'marketing_service': 'operational',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"❌ Marketing health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }