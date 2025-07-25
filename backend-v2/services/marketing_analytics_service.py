"""
Marketing Analytics Service for BookedBarber V2.

Provides marketing-specific analytics including:
- Landing page performance metrics
- Conversion funnel analysis
- ROI attribution by marketing channel
- Marketing campaign effectiveness
- Real-time conversion tracking status
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from dataclasses import dataclass

from models import Organization
from models.tracking import ConversionEvent, EventType
from models.integration import Integration, IntegrationType
from services.conversion_tracking_service import ConversionTrackingService
from services.analytics_service import AnalyticsService
from utils.cache_decorators import cache_analytics

logger = logging.getLogger(__name__)


@dataclass
class MarketingMetrics:
    """Marketing performance metrics"""
    total_visits: int
    total_conversions: int
    conversion_rate: float
    total_revenue: float
    cost_per_acquisition: float
    return_on_ad_spend: float
    average_order_value: float
    
    
@dataclass
class ChannelPerformance:
    """Performance metrics by marketing channel"""
    channel: str
    visits: int
    conversions: int
    conversion_rate: float
    revenue: float
    cost: float
    roi: float


@dataclass
class LandingPageMetrics:
    """Landing page specific metrics"""
    page_views: int
    unique_visitors: int
    bounce_rate: float
    time_on_page: float
    cta_clicks: int
    form_submissions: int
    conversions: int
    conversion_rate: float


class MarketingAnalyticsService:
    """Service for marketing-specific analytics and performance tracking"""
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
        self.conversion_service = ConversionTrackingService()
        
    @cache_analytics(ttl=300)  # Cache for 5 minutes
    async def get_marketing_overview(
        self,
        organization_id: int,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """Get comprehensive marketing analytics overview"""
        
        # Default to last 30 days if no date range provided
        if not date_range:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            date_range = (start_date, end_date)
        
        start_date, end_date = date_range
        
        # Get organization
        organization = self.db.query(Organization).filter(
            Organization.id == organization_id
        ).first()
        
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")
        
        # Get conversion events for the period
        conversion_events = self.db.query(ConversionEvent).filter(
            and_(
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.organization_id == organization_id
            )
        ).all()
        
        # Calculate basic metrics
        total_conversions = len(conversion_events)
        total_revenue = sum(event.event_value or 0 for event in conversion_events)
        
        # Get landing page metrics
        landing_page_metrics = await self._get_landing_page_metrics(
            organization, start_date, end_date
        )
        
        # Get channel performance
        channel_performance = await self._get_channel_performance(
            organization_id, start_date, end_date
        )
        
        # Get conversion funnel
        conversion_funnel = await self._get_conversion_funnel(
            organization_id, start_date, end_date
        )
        
        # Get integration health
        integration_health = await self._get_integration_health(organization_id)
        
        # Calculate derived metrics
        conversion_rate = (total_conversions / max(landing_page_metrics.page_views, 1)) * 100
        average_order_value = total_revenue / max(total_conversions, 1)
        
        return {
            "overview": {
                "total_conversions": total_conversions,
                "total_revenue": total_revenue,
                "conversion_rate": round(conversion_rate, 2),
                "average_order_value": round(average_order_value, 2),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            },
            "landing_page": landing_page_metrics.__dict__,
            "channels": [channel.__dict__ for channel in channel_performance],
            "funnel": conversion_funnel,
            "integrations": integration_health,
            "trends": await self._get_performance_trends(organization_id, start_date, end_date)
        }
    
    async def _get_landing_page_metrics(
        self,
        organization: Organization,
        start_date: datetime,
        end_date: datetime
    ) -> LandingPageMetrics:
        """Calculate landing page performance metrics"""
        
        # Get page view events
        page_views = self.db.query(ConversionEvent).filter(
            and_(
                ConversionEvent.event_type == EventType.PAGE_VIEW,
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.source_url.contains(organization.slug)
            )
        ).count()
        
        # Get unique visitors (by client_id)
        unique_visitors = self.db.query(ConversionEvent.client_id).filter(
            and_(
                ConversionEvent.event_type == EventType.PAGE_VIEW,
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.source_url.contains(organization.slug)
            )
        ).distinct().count()
        
        # Get CTA clicks
        cta_clicks = self.db.query(ConversionEvent).filter(
            and_(
                ConversionEvent.event_type == EventType.CLICK,
                ConversionEvent.event_name.contains("cta"),
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.source_url.contains(organization.slug)
            )
        ).count()
        
        # Get form submissions (lead events)
        form_submissions = self.db.query(ConversionEvent).filter(
            and_(
                ConversionEvent.event_type == EventType.LEAD,
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.source_url.contains(organization.slug)
            )
        ).count()
        
        # Get conversions (purchase events)
        conversions = self.db.query(ConversionEvent).filter(
            and_(
                ConversionEvent.event_type == EventType.PURCHASE,
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.source_url.contains(organization.slug)
            )
        ).count()
        
        # Calculate derived metrics
        bounce_rate = max(0, (page_views - unique_visitors) / max(page_views, 1)) * 100
        conversion_rate = (conversions / max(page_views, 1)) * 100
        
        return LandingPageMetrics(
            page_views=page_views,
            unique_visitors=unique_visitors,
            bounce_rate=round(bounce_rate, 2),
            time_on_page=45.0,  # TODO: Calculate from actual session data
            cta_clicks=cta_clicks,
            form_submissions=form_submissions,
            conversions=conversions,
            conversion_rate=round(conversion_rate, 2)
        )
    
    async def _get_channel_performance(
        self,
        organization_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[ChannelPerformance]:
        """Calculate performance metrics by marketing channel"""
        
        # Query conversion events grouped by channel
        channel_data = self.db.query(
            ConversionEvent.channel,
            func.count(ConversionEvent.id).label('total_events'),
            func.sum(case([(ConversionEvent.event_type == EventType.PURCHASE, 1)], else_=0)).label('conversions'),
            func.sum(ConversionEvent.event_value).label('total_revenue')
        ).filter(
            and_(
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.organization_id == organization_id
            )
        ).group_by(ConversionEvent.channel).all()
        
        channel_performance = []
        
        for channel, total_events, conversions, total_revenue in channel_data:
            if not channel:
                channel = "direct"
            
            conversion_rate = (conversions / max(total_events, 1)) * 100
            
            # TODO: Get actual advertising costs from integration data
            estimated_cost = conversions * 25.0  # Placeholder: $25 CPA
            roi = ((total_revenue or 0) - estimated_cost) / max(estimated_cost, 1) * 100
            
            channel_performance.append(ChannelPerformance(
                channel=channel,
                visits=total_events,
                conversions=conversions or 0,
                conversion_rate=round(conversion_rate, 2),
                revenue=round(total_revenue or 0, 2),
                cost=round(estimated_cost, 2),
                roi=round(roi, 2)
            ))
        
        return sorted(channel_performance, key=lambda x: x.revenue, reverse=True)
    
    async def _get_conversion_funnel(
        self,
        organization_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate conversion funnel metrics"""
        
        # Count events by type
        event_counts = self.db.query(
            ConversionEvent.event_type,
            func.count(ConversionEvent.id).label('count')
        ).filter(
            and_(
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.organization_id == organization_id
            )
        ).group_by(ConversionEvent.event_type).all()
        
        # Build funnel data
        funnel_data = {}
        for event_type, count in event_counts:
            funnel_data[event_type.value] = count
        
        # Define funnel stages
        page_views = funnel_data.get(EventType.PAGE_VIEW.value, 0)
        clicks = funnel_data.get(EventType.CLICK.value, 0)
        leads = funnel_data.get(EventType.LEAD.value, 0)
        purchases = funnel_data.get(EventType.PURCHASE.value, 0)
        
        # Calculate conversion rates between stages
        view_to_click = (clicks / max(page_views, 1)) * 100
        click_to_lead = (leads / max(clicks, 1)) * 100
        lead_to_purchase = (purchases / max(leads, 1)) * 100
        overall_conversion = (purchases / max(page_views, 1)) * 100
        
        return {
            "stages": [
                {"name": "Page Views", "count": page_views, "rate": 100.0},
                {"name": "CTA Clicks", "count": clicks, "rate": round(view_to_click, 2)},
                {"name": "Leads", "count": leads, "rate": round(click_to_lead, 2)},
                {"name": "Purchases", "count": purchases, "rate": round(lead_to_purchase, 2)}
            ],
            "overall_conversion_rate": round(overall_conversion, 2),
            "biggest_dropoff": self._identify_biggest_dropoff([
                view_to_click, click_to_lead, lead_to_purchase
            ])
        }
    
    def _identify_biggest_dropoff(self, conversion_rates: List[float]) -> Dict[str, Any]:
        """Identify the biggest conversion rate drop in the funnel"""
        stage_names = ["View to Click", "Click to Lead", "Lead to Purchase"]
        
        if not conversion_rates:
            return {"stage": "Unknown", "rate": 0.0}
        
        min_rate = min(conversion_rates)
        min_index = conversion_rates.index(min_rate)
        
        return {
            "stage": stage_names[min_index],
            "rate": round(min_rate, 2)
        }
    
    async def _get_integration_health(self, organization_id: int) -> Dict[str, Any]:
        """Check health status of marketing integrations"""
        
        # Get organization
        organization = self.db.query(Organization).filter(
            Organization.id == organization_id
        ).first()
        
        if not organization or not organization.primary_owner:
            return {"status": "no_owner", "integrations": []}
        
        # Check key marketing integrations
        marketing_integrations = [
            IntegrationType.GOOGLE_MY_BUSINESS,
            IntegrationType.META_BUSINESS,
            IntegrationType.GOOGLE_ADS
        ]
        
        integration_status = []
        
        for integration_type in marketing_integrations:
            integration = self.db.query(Integration).filter(
                and_(
                    Integration.user_id == organization.primary_owner.id,
                    Integration.integration_type == integration_type,
                    Integration.is_active == True
                )
            ).first()
            
            if integration:
                # Check if token is expired
                is_healthy = not integration.is_token_expired()
                last_sync = integration.last_sync_at.isoformat() if integration.last_sync_at else None
                
                integration_status.append({
                    "type": integration_type.value,
                    "status": "healthy" if is_healthy else "expired",
                    "last_sync": last_sync,
                    "error": integration.last_error
                })
            else:
                integration_status.append({
                    "type": integration_type.value,
                    "status": "not_connected",
                    "last_sync": None,
                    "error": None
                })
        
        # Overall health status
        healthy_count = sum(1 for status in integration_status if status["status"] == "healthy")
        total_count = len(integration_status)
        
        overall_status = "excellent" if healthy_count == total_count else \
                        "good" if healthy_count >= total_count * 0.7 else \
                        "needs_attention"
        
        return {
            "status": overall_status,
            "healthy_integrations": healthy_count,
            "total_integrations": total_count,
            "integrations": integration_status
        }
    
    async def _get_performance_trends(
        self,
        organization_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate performance trends over time"""
        
        # Get daily conversion counts
        daily_conversions = self.db.query(
            func.date(ConversionEvent.created_at).label('date'),
            func.count(ConversionEvent.id).label('conversions'),
            func.sum(ConversionEvent.event_value).label('revenue')
        ).filter(
            and_(
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.organization_id == organization_id,
                ConversionEvent.event_type == EventType.PURCHASE
            )
        ).group_by(func.date(ConversionEvent.created_at)).all()
        
        # Format trend data
        trend_data = []
        for date, conversions, revenue in daily_conversions:
            trend_data.append({
                "date": date.isoformat(),
                "conversions": conversions,
                "revenue": float(revenue or 0)
            })
        
        # Sort by date
        trend_data.sort(key=lambda x: x["date"])
        
        # Calculate growth rate (last 7 days vs previous 7 days)
        if len(trend_data) >= 14:
            recent_revenue = sum(day["revenue"] for day in trend_data[-7:])
            previous_revenue = sum(day["revenue"] for day in trend_data[-14:-7])
            growth_rate = ((recent_revenue - previous_revenue) / max(previous_revenue, 1)) * 100
        else:
            growth_rate = 0.0
        
        return {
            "daily_data": trend_data,
            "growth_rate": round(growth_rate, 2),
            "trend_direction": "up" if growth_rate > 5 else "down" if growth_rate < -5 else "stable"
        }
    
    async def get_campaign_performance(
        self,
        organization_id: int,
        campaign_id: Optional[str] = None,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """Get detailed performance metrics for specific campaigns"""
        
        # Default to last 30 days
        if not date_range:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            date_range = (start_date, end_date)
        
        start_date, end_date = date_range
        
        # Build query filters
        filters = [
            ConversionEvent.created_at >= start_date,
            ConversionEvent.created_at <= end_date,
            ConversionEvent.organization_id == organization_id
        ]
        
        if campaign_id:
            filters.append(ConversionEvent.utm_campaign == campaign_id)
        
        # Get campaign data
        campaign_events = self.db.query(ConversionEvent).filter(
            and_(*filters)
        ).all()
        
        # Analyze campaign performance
        total_events = len(campaign_events)
        conversions = sum(1 for event in campaign_events if event.event_type == EventType.PURCHASE)
        total_revenue = sum(event.event_value or 0 for event in campaign_events)
        
        # Group by UTM parameters
        utm_analysis = {}
        for event in campaign_events:
            utm_key = f"{event.utm_source or 'unknown'}_{event.utm_medium or 'unknown'}"
            if utm_key not in utm_analysis:
                utm_analysis[utm_key] = {"events": 0, "conversions": 0, "revenue": 0}
            
            utm_analysis[utm_key]["events"] += 1
            if event.event_type == EventType.PURCHASE:
                utm_analysis[utm_key]["conversions"] += 1
                utm_analysis[utm_key]["revenue"] += event.event_value or 0
        
        return {
            "campaign_id": campaign_id,
            "date_range": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "summary": {
                "total_events": total_events,
                "conversions": conversions,
                "conversion_rate": round((conversions / max(total_events, 1)) * 100, 2),
                "total_revenue": round(total_revenue, 2),
                "average_order_value": round(total_revenue / max(conversions, 1), 2)
            },
            "utm_breakdown": utm_analysis
        }


# Create singleton instance
marketing_analytics_service = MarketingAnalyticsService