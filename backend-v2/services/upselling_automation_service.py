"""
Upselling Automation Service
Handles automated workflows when upselling opportunities are implemented.
Triggers email/SMS communication, calendar reminders, and follow-up sequences.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from models import User
from models.upselling import UpsellAttempt, UpsellStatus, UpsellChannel
from services.notification_service import NotificationService
from config import settings

logger = logging.getLogger(__name__)


class UpsellTemplate:
    """Predefined templates for upselling communications"""
    
    EMAIL_TEMPLATES = {
        'premium_upgrade': {
            'subject': '✨ Exclusive Service Upgrade - Just for You!',
            'html_body': """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Hi {{client_name}}! 👋</h2>
                
                <p>Your barber <strong>{{barber_name}}</strong> has a special recommendation just for you!</p>
                
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e40af; margin-top: 0;">Upgrade Opportunity</h3>
                    <p><strong>Current Service:</strong> {{current_service}}</p>
                    <p><strong>Recommended Upgrade:</strong> {{suggested_service}}</p>
                    <p style="color: #059669; font-size: 18px; font-weight: bold;">+${{potential_revenue}} value</p>
                </div>
                
                <div style="background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h4 style="color: #065f46; margin-top: 0;">Why this works for you:</h4>
                    <ul style="color: #047857;">
                        {{#each reasons}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{booking_url}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Book Your Upgrade
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                    This personalized recommendation is based on your visit history and preferences. 
                    We think you'll love the enhanced experience!
                </p>
                
                <p style="color: #6b7280; font-size: 12px;">
                    Questions? Reply to this email or call us at {{barber_phone}}.
                </p>
            </div>
            """,
            'text_body': """
            Hi {{client_name}}!
            
            Your barber {{barber_name}} has a special recommendation for you:
            
            Current Service: {{current_service}}
            Recommended Upgrade: {{suggested_service}}
            Additional Value: +${{potential_revenue}}
            
            Why this works for you:
            {{#each reasons}}
            • {{this}}
            {{/each}}
            
            Book your upgrade: {{booking_url}}
            
            Questions? Call us at {{barber_phone}}.
            
            Best regards,
            {{barber_name}}
            """
        },
        
        'beard_maintenance': {
            'subject': '🧔 Perfect Your Look - Beard Maintenance Upgrade',
            'html_body': """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Hey {{client_name}}! 🧔</h2>
                
                <p>I've noticed you always ask great questions about beard care. 
                I think you're ready for our premium beard maintenance service!</p>
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #92400e; margin-top: 0;">Upgrade to {{suggested_service}}</h3>
                    <p>This includes everything in your regular {{current_service}}, plus:</p>
                    <ul style="color: #92400e;">
                        <li>Professional beard shaping and trimming</li>
                        <li>Premium beard oil treatment</li>
                        <li>Personalized maintenance tips</li>
                        <li>Take-home beard care sample</li>
                    </ul>
                    <p style="font-size: 18px; font-weight: bold; color: #059669;">Only +${{potential_revenue}} more</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{booking_url}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Upgrade My Next Appointment
                    </a>
                </div>
                
                <p>Looking forward to helping you achieve that perfect look!</p>
                
                <p>— {{barber_name}}</p>
            </div>
            """
        }
    }
    
    SMS_TEMPLATES = {
        'premium_upgrade': """
        Hi {{client_name}}! 👋 {{barber_name}} here. 
        
        I have a special upgrade suggestion for your next appointment:
        {{current_service}} → {{suggested_service}} (+${{potential_revenue}})
        
        Based on your visits, I think you'll love the enhanced experience!
        
        Book upgrade: {{booking_url}}
        
        Questions? Just reply!
        """,
        
        'beard_maintenance': """
        Hey {{client_name}}! 🧔 
        
        Ready to perfect that beard? I recommend upgrading to {{suggested_service}} for your next visit.
        
        Includes professional shaping + premium treatments for just +${{potential_revenue}}
        
        Book now: {{booking_url}}
        
        — {{barber_name}}
        """
    }


class UpsellAutomationService:
    """Service for automating upselling workflows and communications"""
    
    def __init__(self):
        self.notification_service = NotificationService()
        
    async def trigger_upsell_automation(
        self, 
        attempt: UpsellAttempt, 
        db: Session,
        channel_override: Optional[UpsellChannel] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for triggering upselling automation.
        Called immediately after an upsell attempt is recorded.
        """
        try:
            logger.info(f"Starting upselling automation for attempt {attempt.id}")
            
            # Get related data
            barber = db.query(User).filter(User.id == attempt.barber_id).first()
            client = db.query(User).filter(User.id == attempt.client_id).first()
            
            if not barber or not client:
                raise ValueError("Invalid barber or client ID")
            
            # Prepare context data
            context = self._prepare_template_context(attempt, barber, client, db)
            
            # Determine which automation to trigger
            automation_channel = channel_override or attempt.channel
            results = {}
            
            if automation_channel == UpsellChannel.EMAIL:
                results['email'] = await self._send_upsell_email(attempt, context, db)
            elif automation_channel == UpsellChannel.SMS:
                results['sms'] = await self._send_upsell_sms(attempt, context, db)
            elif automation_channel == UpsellChannel.IN_PERSON:
                # For in-person, create follow-up reminders
                results['follow_up'] = await self._create_follow_up_reminders(attempt, context, db)
            else:
                # Default: try both email and SMS
                results['email'] = await self._send_upsell_email(attempt, context, db)
                results['sms'] = await self._send_upsell_sms(attempt, context, db)
            
            # Update attempt status
            attempt.automation_triggered = True
            attempt.automation_sent_at = datetime.utcnow()
            attempt.status = UpsellStatus.AUTOMATION_SENT
            db.commit()
            
            logger.info(f"Upselling automation completed for attempt {attempt.id}")
            
            return {
                'success': True,
                'attempt_id': attempt.id,
                'results': results,
                'message': 'Upselling automation triggered successfully'
            }
            
        except Exception as e:
            logger.error(f"Upselling automation failed for attempt {attempt.id}: {str(e)}")
            
            # Update attempt with error status
            attempt.status = UpsellStatus.EXPIRED  # Mark as expired on error
            db.commit()
            
            return {
                'success': False,
                'attempt_id': attempt.id,
                'error': str(e),
                'message': 'Upselling automation failed'
            }
    
    def _prepare_template_context(
        self, 
        attempt: UpsellAttempt, 
        barber: User, 
        client: User, 
        db: Session
    ) -> Dict[str, Any]:
        """Prepare template context with all necessary data"""
        
        # Create booking URL (simplified - would use actual booking system)
        frontend_url = getattr(settings, 'frontend_url', 'http://localhost:3000')
        booking_url = f"{frontend_url}/book/{barber.id}?upgrade={attempt.suggested_service}"
        
        # Format reasons as a list
        reasons = attempt.reasons or []
        if isinstance(reasons, str):
            reasons = [reasons]
        
        return {
            'client_name': client.name or client.email.split('@')[0],
            'client_email': client.email,
            'client_phone': getattr(client, 'phone', None),
            'barber_name': barber.name or barber.email.split('@')[0],
            'barber_email': barber.email,
            'barber_phone': getattr(barber, 'phone', getattr(settings, 'default_phone', '(555) 123-4567')),
            'current_service': attempt.current_service,
            'suggested_service': attempt.suggested_service,
            'potential_revenue': f"{attempt.potential_revenue:.2f}",
            'confidence_score': attempt.confidence_score,
            'client_tier': attempt.client_tier or 'Valued Client',
            'relationship_score': attempt.relationship_score or 8.0,
            'reasons': reasons,
            'methodology_alignment': attempt.methodology_alignment,
            'booking_url': booking_url,
            'attempt_id': attempt.id,
            'opportunity_id': attempt.opportunity_id
        }
    
    async def _send_upsell_email(
        self, 
        attempt: UpsellAttempt, 
        context: Dict[str, Any], 
        db: Session
    ) -> Dict[str, Any]:
        """Send personalized upselling email"""
        try:
            # Determine template based on service type
            template_key = self._get_email_template_key(attempt.suggested_service)
            template = UpsellTemplate.EMAIL_TEMPLATES.get(template_key, 
                                                         UpsellTemplate.EMAIL_TEMPLATES['premium_upgrade'])
            
            # Render template with context
            subject = self._render_template_string(template['subject'], context)
            html_body = self._render_template_string(template['html_body'], context)
            text_body = self._render_template_string(template.get('text_body', ''), context)
            
            # Send email using notification service
            result = self.notification_service.send_email(
                to_email=context['client_email'],
                subject=subject,
                body=html_body
            )
            
            logger.info(f"Upselling email sent for attempt {attempt.id}")
            
            return {
                'success': True,
                'channel': 'email',
                'recipient': context['client_email'],
                'template': template_key,
                'message_id': result.get('message_id')
            }
            
        except Exception as e:
            logger.error(f"Failed to send upselling email for attempt {attempt.id}: {str(e)}")
            return {
                'success': False,
                'channel': 'email',
                'error': str(e)
            }
    
    async def _send_upsell_sms(
        self, 
        attempt: UpsellAttempt, 
        context: Dict[str, Any], 
        db: Session
    ) -> Dict[str, Any]:
        """Send personalized upselling SMS"""
        try:
            if not context.get('client_phone'):
                return {
                    'success': False,
                    'channel': 'sms',
                    'error': 'Client phone number not available'
                }
            
            # Determine template based on service type
            template_key = self._get_sms_template_key(attempt.suggested_service)
            template = UpsellTemplate.SMS_TEMPLATES.get(template_key, 
                                                       UpsellTemplate.SMS_TEMPLATES['premium_upgrade'])
            
            # Render template with context
            message = self._render_template_string(template, context)
            
            # Send SMS using notification service
            result = self.notification_service.send_sms(
                to_phone=context['client_phone'],
                body=message
            )
            
            logger.info(f"Upselling SMS sent for attempt {attempt.id}")
            
            return {
                'success': True,
                'channel': 'sms',
                'recipient': context['client_phone'],
                'template': template_key,
                'message_id': result.get('sid')
            }
            
        except Exception as e:
            logger.error(f"Failed to send upselling SMS for attempt {attempt.id}: {str(e)}")
            return {
                'success': False,
                'channel': 'sms',
                'error': str(e)
            }
    
    async def _create_follow_up_reminders(
        self, 
        attempt: UpsellAttempt, 
        context: Dict[str, Any], 
        db: Session
    ) -> Dict[str, Any]:
        """Create follow-up reminders for in-person upselling"""
        try:
            # Schedule follow-up reminders at different intervals
            follow_ups = []
            
            # 24-hour reminder
            reminder_24h = await self._schedule_reminder(
                attempt, context, timedelta(hours=24), 
                "Follow up on upselling suggestion", db
            )
            follow_ups.append(reminder_24h)
            
            # 3-day reminder if no response
            reminder_3d = await self._schedule_reminder(
                attempt, context, timedelta(days=3),
                "Check conversion status for upselling", db
            )
            follow_ups.append(reminder_3d)
            
            logger.info(f"Follow-up reminders created for attempt {attempt.id}")
            
            return {
                'success': True,
                'channel': 'follow_up',
                'reminders_created': len(follow_ups),
                'reminders': follow_ups
            }
            
        except Exception as e:
            logger.error(f"Failed to create follow-up reminders for attempt {attempt.id}: {str(e)}")
            return {
                'success': False,
                'channel': 'follow_up',
                'error': str(e)
            }
    
    async def _schedule_reminder(
        self, 
        attempt: UpsellAttempt, 
        context: Dict[str, Any], 
        delay: timedelta,
        reminder_text: str, 
        db: Session
    ) -> Dict[str, Any]:
        """Schedule a specific reminder"""
        # This would integrate with a task queue like Celery
        # For now, we'll create a simple database record
        
        reminder_time = datetime.utcnow() + delay
        
        # In a real implementation, this would create a scheduled task
        # For now, we'll just log it and return the scheduled time
        
        logger.info(f"Reminder scheduled for {reminder_time}: {reminder_text}")
        
        return {
            'scheduled_time': reminder_time.isoformat(),
            'reminder_text': reminder_text,
            'attempt_id': attempt.id
        }
    
    def _get_email_template_key(self, suggested_service: str) -> str:
        """Determine email template based on suggested service"""
        service_lower = suggested_service.lower()
        
        if 'beard' in service_lower or 'trim' in service_lower:
            return 'beard_maintenance'
        else:
            return 'premium_upgrade'
    
    def _get_sms_template_key(self, suggested_service: str) -> str:
        """Determine SMS template based on suggested service"""
        service_lower = suggested_service.lower()
        
        if 'beard' in service_lower or 'trim' in service_lower:
            return 'beard_maintenance'
        else:
            return 'premium_upgrade'
    
    def _render_template_string(self, template: str, context: Dict[str, Any]) -> str:
        """Simple template rendering (would use Jinja2 in production)"""
        result = template
        
        # Simple string replacement (in production, would use proper templating)
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        
        # Handle list rendering for reasons
        if '{{#each reasons}}' in result:
            reasons_section = ""
            if context.get('reasons'):
                for reason in context['reasons']:
                    reasons_section += f"<li>{reason}</li>\n"
            
            # Replace the each block with rendered list
            result = result.replace(
                '{{#each reasons}}\n                        <li>{{this}}</li>\n                        {{/each}}',
                reasons_section
            )
        
        return result
    
    # Public API methods for manual triggering
    
    async def send_manual_upsell_email(
        self, 
        attempt_id: int, 
        db: Session,
        custom_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Manually trigger upselling email for an attempt"""
        
        attempt = db.query(UpsellAttempt).filter(UpsellAttempt.id == attempt_id).first()
        if not attempt:
            return {'success': False, 'error': 'Attempt not found'}
        
        barber = db.query(User).filter(User.id == attempt.barber_id).first()
        client = db.query(User).filter(User.id == attempt.client_id).first()
        
        context = self._prepare_template_context(attempt, barber, client, db)
        
        if custom_message:
            # Override template with custom message
            context['custom_message'] = custom_message
        
        return await self._send_upsell_email(attempt, context, db)
    
    async def get_automation_status(self, attempt_id: int, db: Session) -> Dict[str, Any]:
        """Get the automation status for an upselling attempt"""
        
        attempt = db.query(UpsellAttempt).filter(UpsellAttempt.id == attempt_id).first()
        if not attempt:
            return {'success': False, 'error': 'Attempt not found'}
        
        return {
            'success': True,
            'attempt_id': attempt.id,
            'automation_triggered': attempt.automation_triggered,
            'automation_sent_at': attempt.automation_sent_at.isoformat() if attempt.automation_sent_at else None,
            'status': attempt.status.value,
            'channel': attempt.channel.value,
            'expires_at': attempt.expires_at.isoformat() if attempt.expires_at else None
        }