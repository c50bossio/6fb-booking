"""
Unified Communication Analytics Service

Consolidates analytics from all communication channels:
- Email notifications (SendGrid)
- SMS messages (Twilio)
- Marketing campaigns
- Push notifications
- Review responses

Provides comprehensive insights for client communication effectiveness.
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
import logging
import json

from models import (
    User, NotificationQueue, NotificationStatus, MarketingCampaign, 
    CampaignAnalytics, MarketingUsage, Client, Appointment,
    Review, ReviewResponse, NotificationPreferences
)
from services.notification_service import NotificationService
from services.marketing_service import MarketingService
from services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)


@dataclass
class CommunicationMetrics:
    """Container for communication channel metrics"""
    channel: str
    sent_count: int
    delivered_count: int
    opened_count: int
    clicked_count: int
    failed_count: int
    bounce_rate: float
    engagement_rate: float
    conversion_rate: float
    total_revenue_attributed: float


@dataclass
class UnifiedCommunicationSummary:
    """Comprehensive communication analytics summary"""
    date_range: Tuple[date, date]
    total_messages_sent: int
    total_engagement_events: int
    overall_engagement_rate: float
    channel_breakdown: List[CommunicationMetrics]
    top_performing_campaigns: List[Dict[str, Any]]
    client_communication_preferences: Dict[str, int]
    automated_vs_manual: Dict[str, int]
    cost_per_engagement: float
    roi_by_channel: Dict[str, float]


class UnifiedCommunicationAnalytics:
    def __init__(self):
        self.notification_service = NotificationService()
        self.marketing_service = MarketingService()
        self.analytics_service = AnalyticsService()
    
    def get_communication_overview(
        self, 
        db: Session, 
        user_id: int,
        start_date: date,
        end_date: date
    ) -> UnifiedCommunicationSummary:
        """Get comprehensive communication analytics overview"""
        
        # Get metrics for each communication channel
        email_metrics = self._get_email_metrics(db, user_id, start_date, end_date)
        sms_metrics = self._get_sms_metrics(db, user_id, start_date, end_date)
        campaign_metrics = self._get_campaign_metrics(db, user_id, start_date, end_date)
        review_metrics = self._get_review_response_metrics(db, user_id, start_date, end_date)
        
        channel_breakdown = [email_metrics, sms_metrics, campaign_metrics, review_metrics]
        
        # Calculate overall metrics
        total_sent = sum(m.sent_count for m in channel_breakdown)
        total_engagement = sum(m.opened_count + m.clicked_count for m in channel_breakdown)
        overall_engagement_rate = (total_engagement / total_sent * 100) if total_sent > 0 else 0
        
        # Get top performing campaigns
        top_campaigns = self._get_top_campaigns(db, user_id, start_date, end_date)
        
        # Get client communication preferences
        client_preferences = self._get_client_preferences(db, user_id)
        
        # Get automated vs manual breakdown
        automation_breakdown = self._get_automation_breakdown(db, user_id, start_date, end_date)
        
        # Calculate cost metrics and ROI
        cost_per_engagement = self._calculate_cost_per_engagement(db, user_id, start_date, end_date)
        roi_by_channel = self._calculate_roi_by_channel(db, user_id, start_date, end_date)
        
        return UnifiedCommunicationSummary(
            date_range=(start_date, end_date),
            total_messages_sent=total_sent,
            total_engagement_events=total_engagement,
            overall_engagement_rate=overall_engagement_rate,
            channel_breakdown=channel_breakdown,
            top_performing_campaigns=top_campaigns,
            client_communication_preferences=client_preferences,
            automated_vs_manual=automation_breakdown,
            cost_per_engagement=cost_per_engagement,
            roi_by_channel=roi_by_channel
        )
    
    def _get_email_metrics(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> CommunicationMetrics:
        """Get email communication metrics"""
        
        # Query notification queue for email metrics
        email_query = db.query(NotificationQueue).filter(
            and_(
                NotificationQueue.channel == 'email',
                NotificationQueue.created_at >= start_date,
                NotificationQueue.created_at <= end_date,
                NotificationQueue.user_id == user_id
            )
        )
        
        sent_count = email_query.filter(
            NotificationQueue.status.in_(['sent', 'delivered', 'opened', 'clicked'])
        ).count()
        
        delivered_count = email_query.filter(
            NotificationQueue.status.in_(['delivered', 'opened', 'clicked'])
        ).count()
        
        opened_count = email_query.filter(
            NotificationQueue.status.in_(['opened', 'clicked'])
        ).count()
        
        clicked_count = email_query.filter(
            NotificationQueue.status == 'clicked'
        ).count()
        
        failed_count = email_query.filter(
            NotificationQueue.status.in_(['failed', 'bounced', 'spam'])
        ).count()
        
        # Calculate rates
        bounce_rate = (failed_count / sent_count * 100) if sent_count > 0 else 0
        engagement_rate = ((opened_count + clicked_count) / sent_count * 100) if sent_count > 0 else 0
        
        # Calculate conversion rate (emails that led to bookings)
        conversion_rate = self._calculate_email_conversion_rate(db, user_id, start_date, end_date)
        
        # Calculate revenue attribution
        revenue_attributed = self._calculate_email_revenue(db, user_id, start_date, end_date)
        
        return CommunicationMetrics(
            channel="email",
            sent_count=sent_count,
            delivered_count=delivered_count,
            opened_count=opened_count,
            clicked_count=clicked_count,
            failed_count=failed_count,
            bounce_rate=bounce_rate,
            engagement_rate=engagement_rate,
            conversion_rate=conversion_rate,
            total_revenue_attributed=revenue_attributed
        )
    
    def _get_sms_metrics(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> CommunicationMetrics:
        """Get SMS communication metrics"""
        
        # Query notification queue for SMS metrics
        sms_query = db.query(NotificationQueue).filter(
            and_(
                NotificationQueue.channel == 'sms',
                NotificationQueue.created_at >= start_date,
                NotificationQueue.created_at <= end_date,
                NotificationQueue.user_id == user_id
            )
        )
        
        sent_count = sms_query.filter(
            NotificationQueue.status.in_(['sent', 'delivered'])
        ).count()
        
        delivered_count = sms_query.filter(
            NotificationQueue.status == 'delivered'
        ).count()
        
        # For SMS, "opened" means delivery confirmation
        opened_count = delivered_count
        
        # SMS clicks tracked through short URLs
        clicked_count = self._get_sms_click_count(db, user_id, start_date, end_date)
        
        failed_count = sms_query.filter(
            NotificationQueue.status == 'failed'
        ).count()
        
        # Calculate rates
        bounce_rate = (failed_count / sent_count * 100) if sent_count > 0 else 0
        engagement_rate = ((delivered_count + clicked_count) / sent_count * 100) if sent_count > 0 else 0
        
        # Calculate conversion rate
        conversion_rate = self._calculate_sms_conversion_rate(db, user_id, start_date, end_date)
        
        # Calculate revenue attribution
        revenue_attributed = self._calculate_sms_revenue(db, user_id, start_date, end_date)
        
        return CommunicationMetrics(
            channel="sms",
            sent_count=sent_count,
            delivered_count=delivered_count,
            opened_count=opened_count,
            clicked_count=clicked_count,
            failed_count=failed_count,
            bounce_rate=bounce_rate,
            engagement_rate=engagement_rate,
            conversion_rate=conversion_rate,
            total_revenue_attributed=revenue_attributed
        )
    
    def _get_campaign_metrics(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> CommunicationMetrics:
        """Get marketing campaign metrics"""
        
        # Query campaigns in date range
        campaigns = db.query(MarketingCampaign).filter(
            and_(
                MarketingCampaign.created_by_id == user_id,
                MarketingCampaign.created_at >= start_date,
                MarketingCampaign.created_at <= end_date,
                MarketingCampaign.status.in_(['sent', 'completed'])
            )
        ).all()
        
        # Aggregate metrics from campaign analytics
        total_sent = 0
        total_delivered = 0
        total_opened = 0
        total_clicked = 0
        total_failed = 0
        total_revenue = 0
        
        for campaign in campaigns:
            analytics = db.query(CampaignAnalytics).filter_by(campaign_id=campaign.id).first()
            if analytics:
                total_sent += analytics.recipients_count or 0
                total_delivered += analytics.delivered_count or 0
                total_opened += analytics.opened_count or 0
                total_clicked += analytics.clicked_count or 0
                total_failed += analytics.bounced_count or 0
                total_revenue += analytics.revenue_attributed or 0
        
        # Calculate rates
        bounce_rate = (total_failed / total_sent * 100) if total_sent > 0 else 0
        engagement_rate = ((total_opened + total_clicked) / total_sent * 100) if total_sent > 0 else 0
        conversion_rate = self._calculate_campaign_conversion_rate(db, user_id, start_date, end_date)
        
        return CommunicationMetrics(
            channel="campaigns",
            sent_count=total_sent,
            delivered_count=total_delivered,
            opened_count=total_opened,
            clicked_count=total_clicked,
            failed_count=total_failed,
            bounce_rate=bounce_rate,
            engagement_rate=engagement_rate,
            conversion_rate=conversion_rate,
            total_revenue_attributed=total_revenue
        )
    
    def _get_review_response_metrics(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> CommunicationMetrics:
        """Get review response metrics"""
        
        # Query review responses in date range
        responses = db.query(ReviewResponse).join(Review).filter(
            and_(
                Review.business_owner_id == user_id,
                ReviewResponse.created_at >= start_date,
                ReviewResponse.created_at <= end_date
            )
        ).all()
        
        sent_count = len(responses)
        delivered_count = len([r for r in responses if r.status == 'published'])
        
        # For reviews, engagement is measured by likes/helpfulness votes
        engagement_count = sum(r.helpful_votes or 0 for r in responses)
        
        # Review responses don't have traditional bounce rates
        bounce_rate = 0
        engagement_rate = (engagement_count / sent_count) if sent_count > 0 else 0
        
        # Review responses can lead to bookings (indirect conversion)
        conversion_rate = self._calculate_review_conversion_rate(db, user_id, start_date, end_date)
        revenue_attributed = self._calculate_review_revenue(db, user_id, start_date, end_date)
        
        return CommunicationMetrics(
            channel="reviews",
            sent_count=sent_count,
            delivered_count=delivered_count,
            opened_count=delivered_count,  # Published responses are "opened"
            clicked_count=engagement_count,
            failed_count=sent_count - delivered_count,
            bounce_rate=bounce_rate,
            engagement_rate=engagement_rate,
            conversion_rate=conversion_rate,
            total_revenue_attributed=revenue_attributed
        )
    
    def _get_top_campaigns(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get top performing campaigns by engagement rate"""
        
        campaigns_query = db.query(
            MarketingCampaign,
            CampaignAnalytics
        ).join(
            CampaignAnalytics, 
            MarketingCampaign.id == CampaignAnalytics.campaign_id
        ).filter(
            and_(
                MarketingCampaign.created_by_id == user_id,
                MarketingCampaign.created_at >= start_date,
                MarketingCampaign.created_at <= end_date,
                MarketingCampaign.status.in_(['sent', 'completed'])
            )
        ).all()
        
        top_campaigns = []
        for campaign, analytics in campaigns_query:
            engagement_rate = 0
            if analytics.recipients_count and analytics.recipients_count > 0:
                engagement_rate = (
                    (analytics.opened_count or 0) + (analytics.clicked_count or 0)
                ) / analytics.recipients_count * 100
            
            top_campaigns.append({
                'id': campaign.id,
                'name': campaign.name,
                'type': campaign.campaign_type,
                'sent_date': campaign.created_at.isoformat(),
                'recipients': analytics.recipients_count or 0,
                'engagement_rate': round(engagement_rate, 2),
                'revenue_attributed': analytics.revenue_attributed or 0
            })
        
        # Sort by engagement rate and return top campaigns
        return sorted(top_campaigns, key=lambda x: x['engagement_rate'], reverse=True)[:limit]
    
    def _get_client_preferences(self, db: Session, user_id: int) -> Dict[str, int]:
        """Get client communication preferences breakdown"""
        
        # Query client notification preferences
        preferences = db.query(NotificationPreferences).join(User).filter(
            User.created_by_id == user_id  # Clients created by this business owner
        ).all()
        
        preference_counts = {
            'email_only': 0,
            'sms_only': 0,
            'both': 0,
            'none': 0
        }
        
        for pref in preferences:
            email_enabled = pref.email_enabled
            sms_enabled = pref.sms_enabled
            
            if email_enabled and sms_enabled:
                preference_counts['both'] += 1
            elif email_enabled:
                preference_counts['email_only'] += 1
            elif sms_enabled:
                preference_counts['sms_only'] += 1
            else:
                preference_counts['none'] += 1
        
        return preference_counts
    
    def _get_automation_breakdown(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, int]:
        """Get breakdown of automated vs manual communications"""
        
        # Query notifications with automation flags
        notifications = db.query(NotificationQueue).filter(
            and_(
                NotificationQueue.user_id == user_id,
                NotificationQueue.created_at >= start_date,
                NotificationQueue.created_at <= end_date
            )
        ).all()
        
        breakdown = {
            'automated': 0,
            'manual': 0,
            'triggered': 0  # Event-triggered automations
        }
        
        for notification in notifications:
            metadata = notification.metadata or {}
            
            if metadata.get('is_automated'):
                if metadata.get('trigger_event'):
                    breakdown['triggered'] += 1
                else:
                    breakdown['automated'] += 1
            else:
                breakdown['manual'] += 1
        
        return breakdown
    
    def _calculate_cost_per_engagement(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> float:
        """Calculate average cost per engagement across all channels"""
        
        # Get marketing usage costs
        usage = db.query(MarketingUsage).filter(
            and_(
                MarketingUsage.user_id == user_id,
                MarketingUsage.date >= start_date,
                MarketingUsage.date <= end_date
            )
        ).all()
        
        total_cost = sum(u.cost for u in usage)
        
        # Get total engagement events (opens + clicks)
        total_engagements = db.query(NotificationQueue).filter(
            and_(
                NotificationQueue.user_id == user_id,
                NotificationQueue.created_at >= start_date,
                NotificationQueue.created_at <= end_date,
                NotificationQueue.status.in_(['opened', 'clicked'])
            )
        ).count()
        
        return (total_cost / total_engagements) if total_engagements > 0 else 0
    
    def _calculate_roi_by_channel(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, float]:
        """Calculate ROI for each communication channel"""
        
        # This would integrate with payment tracking to calculate actual revenue
        # For now, return placeholder data
        return {
            'email': 3.2,  # 320% ROI
            'sms': 2.8,    # 280% ROI
            'campaigns': 4.1,  # 410% ROI
            'reviews': 1.9     # 190% ROI
        }
    
    # Helper methods for conversion and revenue calculations
    def _calculate_email_conversion_rate(self, db: Session, user_id: int, start_date: date, end_date: date) -> float:
        # Track emails that led to appointments within 7 days
        return 2.3  # Placeholder
    
    def _calculate_sms_conversion_rate(self, db: Session, user_id: int, start_date: date, end_date: date) -> float:
        # Track SMS that led to appointments within 24 hours
        return 3.1  # Placeholder
    
    def _calculate_campaign_conversion_rate(self, db: Session, user_id: int, start_date: date, end_date: date) -> float:
        # Track campaigns that led to appointments
        return 1.8  # Placeholder
    
    def _calculate_review_conversion_rate(self, db: Session, user_id: int, start_date: date, end_date: date) -> float:
        # Track review responses that led to new client bookings
        return 0.9  # Placeholder
    
    def _get_sms_click_count(self, db: Session, user_id: int, start_date: date, end_date: date) -> int:
        # Track short URL clicks from SMS messages
        return 0  # Placeholder
    
    def _calculate_email_revenue(self, db: Session, user_id: int, start_date: date, end_date: date) -> float:
        return 0  # Placeholder
    
    def _calculate_sms_revenue(self, db: Session, user_id: int, start_date: date, end_date: date) -> float:
        return 0  # Placeholder
    
    def _calculate_review_revenue(self, db: Session, user_id: int, start_date: date, end_date: date) -> float:
        return 0  # Placeholder


# Export for use in router
def get_unified_communication_analytics():
    """Factory function for dependency injection"""
    return UnifiedCommunicationAnalytics()