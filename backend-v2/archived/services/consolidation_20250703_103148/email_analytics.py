"""
Email Analytics Service for BookedBarber
Tracks email performance metrics and integrates with SendGrid Event Webhook
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import logging
from enum import Enum

from db import get_db
from models import EmailEvent, EmailCampaign
from config import Settings

logger = logging.getLogger(__name__)
settings = Settings()

class EmailEventType(str, Enum):
    DELIVERED = "delivered"
    OPENED = "open"
    CLICKED = "click"
    BOUNCED = "bounce"
    DROPPED = "dropped"
    DEFERRED = "deferred"
    PROCESSED = "processed"
    SPAM_REPORT = "spamreport"
    UNSUBSCRIBED = "unsubscribe"
    GROUP_UNSUBSCRIBE = "group_unsubscribe"
    GROUP_RESUBSCRIBE = "group_resubscribe"

class EmailAnalyticsService:
    """Service for tracking and analyzing email performance"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def process_sendgrid_event(self, event_data: Dict[str, Any]) -> bool:
        """
        Process incoming SendGrid webhook event
        
        Args:
            event_data: SendGrid event webhook payload
            
        Returns:
            bool: True if event was processed successfully
        """
        try:
            # Extract event information
            event_type = event_data.get('event')
            email = event_data.get('email')
            timestamp = event_data.get('timestamp')
            message_id = event_data.get('sg_message_id', '').split('.')[0]  # Remove SendGrid suffix
            
            # Additional event-specific data
            url = event_data.get('url')  # For click events
            reason = event_data.get('reason')  # For bounce/drop events
            user_agent = event_data.get('useragent')  # For open/click events
            ip = event_data.get('ip')
            
            # Custom data from email headers
            custom_args = event_data.get('custom_args', {})
            user_id = custom_args.get('user_id')
            notification_type = custom_args.get('notification_type')
            campaign_id = custom_args.get('campaign_id')
            
            # Create email event record
            email_event = EmailEvent(
                event_type=event_type,
                email=email,
                message_id=message_id,
                timestamp=datetime.fromtimestamp(timestamp),
                user_id=int(user_id) if user_id else None,
                notification_type=notification_type,
                campaign_id=int(campaign_id) if campaign_id else None,
                url=url,
                reason=reason,
                user_agent=user_agent,
                ip_address=ip,
                raw_data=event_data
            )
            
            self.db.add(email_event)
            self.db.commit()
            
            # Update campaign metrics if applicable
            if campaign_id:
                self._update_campaign_metrics(int(campaign_id), event_type)
            
            logger.info(f"Processed SendGrid event: {event_type} for {email}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing SendGrid event: {str(e)}")
            self.db.rollback()
            return False
    
    def _update_campaign_metrics(self, campaign_id: int, event_type: str):
        """Update campaign-level metrics"""
        campaign = self.db.query(EmailCampaign).filter(
            EmailCampaign.id == campaign_id
        ).first()
        
        if not campaign:
            return
        
        # Update counters based on event type
        if event_type == EmailEventType.DELIVERED:
            campaign.delivered_count += 1
        elif event_type == EmailEventType.OPENED:
            campaign.opened_count += 1
            # Calculate unique opens
            unique_opens = self.db.query(EmailEvent).filter(
                and_(
                    EmailEvent.campaign_id == campaign_id,
                    EmailEvent.event_type == EmailEventType.OPENED
                )
            ).distinct(EmailEvent.email).count()
            campaign.unique_opens = unique_opens
        elif event_type == EmailEventType.CLICKED:
            campaign.clicked_count += 1
            # Calculate unique clicks
            unique_clicks = self.db.query(EmailEvent).filter(
                and_(
                    EmailEvent.campaign_id == campaign_id,
                    EmailEvent.event_type == EmailEventType.CLICKED
                )
            ).distinct(EmailEvent.email).count()
            campaign.unique_clicks = unique_clicks
        elif event_type == EmailEventType.BOUNCED:
            campaign.bounced_count += 1
        elif event_type == EmailEventType.UNSUBSCRIBED:
            campaign.unsubscribed_count += 1
        
        # Calculate rates
        if campaign.sent_count > 0:
            campaign.delivery_rate = (campaign.delivered_count / campaign.sent_count) * 100
            campaign.open_rate = (campaign.unique_opens / campaign.sent_count) * 100
            campaign.click_rate = (campaign.unique_clicks / campaign.sent_count) * 100
            campaign.bounce_rate = (campaign.bounced_count / campaign.sent_count) * 100
            campaign.unsubscribe_rate = (campaign.unsubscribed_count / campaign.sent_count) * 100
        
        campaign.updated_at = datetime.utcnow()
        self.db.commit()
    
    def get_email_metrics(
        self, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        notification_type: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get email performance metrics for a date range
        
        Args:
            start_date: Start date for metrics
            end_date: End date for metrics
            notification_type: Filter by notification type
            user_id: Filter by specific user
            
        Returns:
            Dictionary with email metrics
        """
        # Default to last 30 days if no dates provided
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Build query filters
        filters = [
            EmailEvent.timestamp >= start_date,
            EmailEvent.timestamp <= end_date
        ]
        
        if notification_type:
            filters.append(EmailEvent.notification_type == notification_type)
        if user_id:
            filters.append(EmailEvent.user_id == user_id)
        
        # Get event counts by type
        event_counts = self.db.query(
            EmailEvent.event_type,
            func.count(EmailEvent.id).label('count')
        ).filter(
            and_(*filters)
        ).group_by(EmailEvent.event_type).all()
        
        # Convert to dictionary
        metrics = {event_type.value: 0 for event_type in EmailEventType}
        for event_type, count in event_counts:
            metrics[event_type] = count
        
        # Calculate rates
        sent = metrics.get('processed', 0)
        delivered = metrics.get('delivered', 0)
        opened = metrics.get('open', 0)
        clicked = metrics.get('click', 0)
        bounced = metrics.get('bounce', 0)
        unsubscribed = metrics.get('unsubscribe', 0)
        
        rates = {}
        if sent > 0:
            rates['delivery_rate'] = round((delivered / sent) * 100, 2)
            rates['open_rate'] = round((opened / sent) * 100, 2)
            rates['click_rate'] = round((clicked / sent) * 100, 2)
            rates['bounce_rate'] = round((bounced / sent) * 100, 2)
            rates['unsubscribe_rate'] = round((unsubscribed / sent) * 100, 2)
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'counts': metrics,
            'rates': rates,
            'total_sent': sent,
            'total_delivered': delivered
        }
    
    def get_top_clicked_urls(
        self, 
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get most clicked URLs in emails"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        return self.db.query(
            EmailEvent.url,
            func.count(EmailEvent.id).label('clicks'),
            func.count(func.distinct(EmailEvent.email)).label('unique_clicks')
        ).filter(
            and_(
                EmailEvent.event_type == EmailEventType.CLICKED,
                EmailEvent.timestamp >= start_date,
                EmailEvent.timestamp <= end_date,
                EmailEvent.url.isnot(None)
            )
        ).group_by(EmailEvent.url).order_by(
            func.count(EmailEvent.id).desc()
        ).limit(limit).all()
    
    def get_notification_type_performance(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get performance metrics by notification type"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get metrics by notification type
        results = self.db.query(
            EmailEvent.notification_type,
            EmailEvent.event_type,
            func.count(EmailEvent.id).label('count')
        ).filter(
            and_(
                EmailEvent.timestamp >= start_date,
                EmailEvent.timestamp <= end_date,
                EmailEvent.notification_type.isnot(None)
            )
        ).group_by(
            EmailEvent.notification_type,
            EmailEvent.event_type
        ).all()
        
        # Organize results by notification type
        performance = {}
        for notification_type, event_type, count in results:
            if notification_type not in performance:
                performance[notification_type] = {
                    event_type.value: 0 for event_type in EmailEventType
                }
            performance[notification_type][event_type] = count
        
        # Calculate rates for each notification type
        for notification_type, metrics in performance.items():
            sent = metrics.get('processed', 0)
            if sent > 0:
                metrics['open_rate'] = round((metrics.get('open', 0) / sent) * 100, 2)
                metrics['click_rate'] = round((metrics.get('click', 0) / sent) * 100, 2)
                metrics['bounce_rate'] = round((metrics.get('bounce', 0) / sent) * 100, 2)
        
        return [
            {'notification_type': nt, 'metrics': metrics}
            for nt, metrics in performance.items()
        ]
    
    def get_user_engagement_score(self, user_id: int) -> Dict[str, Any]:
        """Calculate engagement score for a specific user"""
        # Get user's email events from last 90 days
        start_date = datetime.utcnow() - timedelta(days=90)
        
        events = self.db.query(EmailEvent).filter(
            and_(
                EmailEvent.user_id == user_id,
                EmailEvent.timestamp >= start_date
            )
        ).all()
        
        if not events:
            return {
                'user_id': user_id,
                'engagement_score': 0,
                'emails_received': 0,
                'emails_opened': 0,
                'emails_clicked': 0,
                'last_activity': None
            }
        
        # Count different types of interactions
        delivered = len([e for e in events if e.event_type == EmailEventType.DELIVERED])
        opened = len([e for e in events if e.event_type == EmailEventType.OPENED])
        clicked = len([e for e in events if e.event_type == EmailEventType.CLICKED])
        
        # Calculate engagement score (0-100)
        # Formula: (opens * 1 + clicks * 3) / delivered * 100
        if delivered > 0:
            engagement_score = min(100, round(((opened * 1 + clicked * 3) / delivered) * 25, 2))
        else:
            engagement_score = 0
        
        # Get last activity date
        last_activity = max([e.timestamp for e in events if e.event_type in [
            EmailEventType.OPENED, EmailEventType.CLICKED
        ]], default=None)
        
        return {
            'user_id': user_id,
            'engagement_score': engagement_score,
            'emails_received': delivered,
            'emails_opened': opened,
            'emails_clicked': clicked,
            'last_activity': last_activity.isoformat() if last_activity else None
        }
    
    def create_campaign(
        self,
        name: str,
        template_name: str,
        subject: str,
        sent_count: int = 0
    ) -> EmailCampaign:
        """Create a new email campaign for tracking"""
        campaign = EmailCampaign(
            name=name,
            template_name=template_name,
            subject=subject,
            sent_count=sent_count,
            created_at=datetime.utcnow()
        )
        
        self.db.add(campaign)
        self.db.commit()
        self.db.refresh(campaign)
        
        return campaign
    
    def get_campaign_performance(self, campaign_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed performance metrics for a campaign"""
        campaign = self.db.query(EmailCampaign).filter(
            EmailCampaign.id == campaign_id
        ).first()
        
        if not campaign:
            return None
        
        return {
            'id': campaign.id,
            'name': campaign.name,
            'template_name': campaign.template_name,
            'subject': campaign.subject,
            'sent_count': campaign.sent_count,
            'delivered_count': campaign.delivered_count,
            'opened_count': campaign.opened_count,
            'unique_opens': campaign.unique_opens,
            'clicked_count': campaign.clicked_count,
            'unique_clicks': campaign.unique_clicks,
            'bounced_count': campaign.bounced_count,
            'unsubscribed_count': campaign.unsubscribed_count,
            'delivery_rate': campaign.delivery_rate,
            'open_rate': campaign.open_rate,
            'click_rate': campaign.click_rate,
            'bounce_rate': campaign.bounce_rate,
            'unsubscribe_rate': campaign.unsubscribe_rate,
            'created_at': campaign.created_at.isoformat(),
            'updated_at': campaign.updated_at.isoformat() if campaign.updated_at else None
        }

def get_email_analytics_service(db: Session = None) -> EmailAnalyticsService:
    """Get email analytics service instance"""
    if db is None:
        db = next(get_db())
    return EmailAnalyticsService(db)