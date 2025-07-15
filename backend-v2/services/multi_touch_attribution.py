"""
Multi-Touch Attribution Service for BookedBarber V2.
Tracks and attributes conversions across multiple marketing touchpoints.
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import numpy as np
from collections import defaultdict

from models import User, Client, MarketingCampaign
from models.tracking import ConversionEvent, CampaignTracking

logger = logging.getLogger(__name__)

class AttributionModel(Enum):
    """Attribution model types"""
    FIRST_TOUCH = "first_touch"
    LAST_TOUCH = "last_touch"
    LINEAR = "linear"
    TIME_DECAY = "time_decay"
    POSITION_BASED = "position_based"
    DATA_DRIVEN = "data_driven"

@dataclass
class TouchPoint:
    """Individual marketing touchpoint"""
    touchpoint_id: str
    channel: str
    campaign_id: Optional[int]
    timestamp: datetime
    client_id: int
    event_type: str
    value: float
    source: str
    medium: str
    content: Optional[str]
    metadata: Dict[str, Any]

@dataclass
class CustomerJourney:
    """Complete customer journey with all touchpoints"""
    client_id: int
    journey_id: str
    touchpoints: List[TouchPoint]
    conversion_event: Optional[ConversionEvent]
    total_value: float
    journey_duration: timedelta
    touchpoint_count: int
    channels_involved: List[str]

@dataclass
class AttributionResult:
    """Attribution analysis result"""
    touchpoint_id: str
    channel: str
    campaign_id: Optional[int]
    attribution_value: float
    attribution_weight: float
    position_in_journey: int
    days_to_conversion: float

@dataclass
class ChannelPerformance:
    """Channel performance metrics"""
    channel: str
    total_touchpoints: int
    attributed_conversions: float
    attributed_revenue: float
    avg_position: float
    conversion_assist_rate: float
    first_touch_rate: float
    last_touch_rate: float

class MultiTouchAttributionService:
    """
    Advanced multi-touch attribution service.
    Analyzes customer journeys and attributes conversions across touchpoints.
    """
    
    def __init__(self):
        self.attribution_window_days = 30  # Default attribution window
        self.min_touchpoints = 1
        self.max_touchpoints = 50  # Prevent extremely long journeys
    
    def track_touchpoint(self, db: Session, touchpoint_data: Dict[str, Any]) -> TouchPoint:
        """Track a new marketing touchpoint"""
        touchpoint = TouchPoint(
            touchpoint_id=touchpoint_data.get('touchpoint_id', f"tp_{datetime.now().timestamp()}"),
            channel=touchpoint_data['channel'],
            campaign_id=touchpoint_data.get('campaign_id'),
            timestamp=touchpoint_data.get('timestamp', datetime.utcnow()),
            client_id=touchpoint_data['client_id'],
            event_type=touchpoint_data['event_type'],
            value=touchpoint_data.get('value', 0.0),
            source=touchpoint_data.get('source', 'unknown'),
            medium=touchpoint_data.get('medium', 'unknown'),
            content=touchpoint_data.get('content'),
            metadata=touchpoint_data.get('metadata', {})
        )
        
        # Store touchpoint as conversion event for tracking
        conversion_event = ConversionEvent(
            user_id=touchpoint_data['user_id'],
            client_id=touchpoint_data['client_id'],
            event_type=f"touchpoint_{touchpoint.event_type}",
            event_name=f"Touchpoint: {touchpoint.channel}",
            value=touchpoint.value,
            currency='USD',
            source=touchpoint.source,
            medium=touchpoint.medium,
            campaign=touchpoint_data.get('campaign_name'),
            metadata={
                'touchpoint_id': touchpoint.touchpoint_id,
                'channel': touchpoint.channel,
                'position': 'unknown',  # Will be calculated during attribution
                **touchpoint.metadata
            }
        )
        
        db.add(conversion_event)
        db.commit()
        
        logger.info(f"Tracked touchpoint {touchpoint.touchpoint_id} for client {touchpoint.client_id}")
        return touchpoint
    
    def build_customer_journey(self, db: Session, client_id: int, 
                             end_date: Optional[datetime] = None,
                             attribution_window_days: Optional[int] = None) -> CustomerJourney:
        """Build complete customer journey from touchpoints"""
        if not end_date:
            end_date = datetime.utcnow()
        
        if not attribution_window_days:
            attribution_window_days = self.attribution_window_days
        
        start_date = end_date - timedelta(days=attribution_window_days)
        
        # Get all touchpoint events for this client
        touchpoint_events = db.query(ConversionEvent).filter(
            and_(
                ConversionEvent.client_id == client_id,
                ConversionEvent.event_type.like('touchpoint_%'),
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date
            )
        ).order_by(ConversionEvent.created_at).all()
        
        # Convert to TouchPoint objects
        touchpoints = []
        for event in touchpoint_events:
            touchpoint = TouchPoint(
                touchpoint_id=event.metadata.get('touchpoint_id', f"tp_{event.id}"),
                channel=event.metadata.get('channel', 'unknown'),
                campaign_id=event.campaign_id,
                timestamp=event.created_at,
                client_id=event.client_id,
                event_type=event.event_type.replace('touchpoint_', ''),
                value=event.value or 0.0,
                source=event.source or 'unknown',
                medium=event.medium or 'unknown',
                content=event.metadata.get('content'),
                metadata=event.metadata or {}
            )
            touchpoints.append(touchpoint)
        
        # Get conversion event (if any)
        conversion_event = db.query(ConversionEvent).filter(
            and_(
                ConversionEvent.client_id == client_id,
                ConversionEvent.event_type.in_(['conversion', 'purchase', 'booking']),
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date
            )
        ).order_by(desc(ConversionEvent.created_at)).first()
        
        # Calculate journey metrics
        total_value = conversion_event.value if conversion_event else 0
        journey_duration = timedelta(0)
        if touchpoints and conversion_event:
            journey_duration = conversion_event.created_at - touchpoints[0].timestamp
        
        channels_involved = list(set(tp.channel for tp in touchpoints))
        
        journey = CustomerJourney(
            client_id=client_id,
            journey_id=f"journey_{client_id}_{end_date.strftime('%Y%m%d')}",
            touchpoints=touchpoints,
            conversion_event=conversion_event,
            total_value=total_value,
            journey_duration=journey_duration,
            touchpoint_count=len(touchpoints),
            channels_involved=channels_involved
        )
        
        return journey
    
    def apply_attribution_model(self, journey: CustomerJourney, 
                              model: AttributionModel = AttributionModel.LINEAR) -> List[AttributionResult]:
        """Apply attribution model to customer journey"""
        if not journey.touchpoints or not journey.conversion_event:
            return []
        
        touchpoints = journey.touchpoints
        total_value = journey.total_value
        
        attribution_results = []
        
        if model == AttributionModel.FIRST_TOUCH:
            # 100% credit to first touchpoint
            weights = [1.0] + [0.0] * (len(touchpoints) - 1)
        
        elif model == AttributionModel.LAST_TOUCH:
            # 100% credit to last touchpoint
            weights = [0.0] * (len(touchpoints) - 1) + [1.0]
        
        elif model == AttributionModel.LINEAR:
            # Equal credit to all touchpoints
            weight = 1.0 / len(touchpoints)
            weights = [weight] * len(touchpoints)
        
        elif model == AttributionModel.TIME_DECAY:
            # More credit to touchpoints closer to conversion
            weights = self._calculate_time_decay_weights(touchpoints, journey.conversion_event.created_at)
        
        elif model == AttributionModel.POSITION_BASED:
            # 40% to first, 40% to last, 20% distributed among middle
            if len(touchpoints) == 1:
                weights = [1.0]
            elif len(touchpoints) == 2:
                weights = [0.5, 0.5]
            else:
                middle_weight = 0.2 / (len(touchpoints) - 2)
                weights = [0.4] + [middle_weight] * (len(touchpoints) - 2) + [0.4]
        
        elif model == AttributionModel.DATA_DRIVEN:
            # Advanced algorithmic attribution (simplified implementation)
            weights = self._calculate_data_driven_weights(touchpoints, journey)
        
        else:
            # Default to linear
            weight = 1.0 / len(touchpoints)
            weights = [weight] * len(touchpoints)
        
        # Create attribution results
        for i, (touchpoint, weight) in enumerate(zip(touchpoints, weights)):
            days_to_conversion = 0
            if journey.conversion_event:
                days_to_conversion = (journey.conversion_event.created_at - touchpoint.timestamp).days
            
            result = AttributionResult(
                touchpoint_id=touchpoint.touchpoint_id,
                channel=touchpoint.channel,
                campaign_id=touchpoint.campaign_id,
                attribution_value=total_value * weight,
                attribution_weight=weight,
                position_in_journey=i + 1,
                days_to_conversion=days_to_conversion
            )
            attribution_results.append(result)
        
        return attribution_results
    
    def _calculate_time_decay_weights(self, touchpoints: List[TouchPoint], 
                                    conversion_time: datetime, 
                                    half_life_days: float = 7.0) -> List[float]:
        """Calculate time decay weights with exponential decay"""
        weights = []
        
        for touchpoint in touchpoints:
            days_to_conversion = (conversion_time - touchpoint.timestamp).days
            # Exponential decay: weight = exp(-ln(2) * days / half_life)
            weight = np.exp(-np.log(2) * days_to_conversion / half_life_days)
            weights.append(weight)
        
        # Normalize weights to sum to 1
        total_weight = sum(weights)
        if total_weight > 0:
            weights = [w / total_weight for w in weights]
        else:
            # Fallback to equal weights
            weights = [1.0 / len(touchpoints)] * len(touchpoints)
        
        return weights
    
    def _calculate_data_driven_weights(self, touchpoints: List[TouchPoint], 
                                     journey: CustomerJourney) -> List[float]:
        """Calculate data-driven attribution weights (simplified)"""
        # This is a simplified implementation
        # In practice, this would use machine learning models trained on historical data
        
        weights = []
        
        for i, touchpoint in enumerate(touchpoints):
            base_weight = 1.0 / len(touchpoints)
            
            # Adjust based on channel performance (simplified)
            channel_multiplier = self._get_channel_performance_multiplier(touchpoint.channel)
            
            # Adjust based on position
            position_multiplier = 1.0
            if i == 0:  # First touch
                position_multiplier = 1.2
            elif i == len(touchpoints) - 1:  # Last touch
                position_multiplier = 1.3
            
            # Adjust based on time to conversion
            if journey.conversion_event:
                days_to_conversion = (journey.conversion_event.created_at - touchpoint.timestamp).days
                time_multiplier = max(0.5, 1.0 - (days_to_conversion / 30.0))  # Decay over 30 days
            else:
                time_multiplier = 1.0
            
            weight = base_weight * channel_multiplier * position_multiplier * time_multiplier
            weights.append(weight)
        
        # Normalize weights
        total_weight = sum(weights)
        if total_weight > 0:
            weights = [w / total_weight for w in weights]
        else:
            weights = [1.0 / len(touchpoints)] * len(touchpoints)
        
        return weights
    
    def _get_channel_performance_multiplier(self, channel: str) -> float:
        """Get performance multiplier for a channel (simplified)"""
        # This would typically be calculated from historical data
        channel_multipliers = {
            'email': 1.1,
            'sms': 1.0,
            'social': 0.9,
            'paid_search': 1.2,
            'organic_search': 1.3,
            'direct': 1.4,
            'referral': 1.1,
            'display': 0.8,
        }
        
        return channel_multipliers.get(channel.lower(), 1.0)
    
    def analyze_channel_performance(self, db: Session, user_id: int,
                                  start_date: datetime, end_date: datetime,
                                  attribution_model: AttributionModel = AttributionModel.LINEAR) -> List[ChannelPerformance]:
        """Analyze performance of different marketing channels"""
        
        # Get all clients for this user
        clients = db.query(Client).filter(Client.user_id == user_id).all()
        client_ids = [c.id for c in clients]
        
        if not client_ids:
            return []
        
        # Build journeys for all clients
        all_attribution_results = []
        channel_stats = defaultdict(lambda: {
            'total_touchpoints': 0,
            'attributed_conversions': 0,
            'attributed_revenue': 0,
            'positions': [],
            'first_touches': 0,
            'last_touches': 0,
            'total_journeys': 0
        })
        
        for client_id in client_ids:
            journey = self.build_customer_journey(
                db, client_id, end_date, 
                (end_date - start_date).days
            )
            
            if journey.touchpoints:
                attribution_results = self.apply_attribution_model(journey, attribution_model)
                all_attribution_results.extend(attribution_results)
                
                # Track channel statistics
                for i, touchpoint in enumerate(journey.touchpoints):
                    channel = touchpoint.channel
                    stats = channel_stats[channel]
                    stats['total_touchpoints'] += 1
                    stats['positions'].append(i + 1)
                    
                    if i == 0:  # First touch
                        stats['first_touches'] += 1
                    if i == len(journey.touchpoints) - 1:  # Last touch
                        stats['last_touches'] += 1
                
                # Add attribution values
                for result in attribution_results:
                    stats = channel_stats[result.channel]
                    stats['attributed_conversions'] += result.attribution_weight
                    stats['attributed_revenue'] += result.attribution_value
        
        # Calculate performance metrics
        performance_results = []
        
        for channel, stats in channel_stats.items():
            if stats['total_touchpoints'] > 0:
                avg_position = np.mean(stats['positions']) if stats['positions'] else 0
                
                # Calculate assist rate (touchpoints that didn't directly convert)
                assist_rate = 0
                if stats['total_touchpoints'] > 0:
                    assists = stats['attributed_conversions'] - stats['last_touches']
                    assist_rate = assists / stats['total_touchpoints']
                
                performance = ChannelPerformance(
                    channel=channel,
                    total_touchpoints=stats['total_touchpoints'],
                    attributed_conversions=stats['attributed_conversions'],
                    attributed_revenue=stats['attributed_revenue'],
                    avg_position=avg_position,
                    conversion_assist_rate=max(0, assist_rate),
                    first_touch_rate=stats['first_touches'] / stats['total_touchpoints'],
                    last_touch_rate=stats['last_touches'] / stats['total_touchpoints']
                )
                performance_results.append(performance)
        
        # Sort by attributed revenue
        performance_results.sort(key=lambda x: x.attributed_revenue, reverse=True)
        
        return performance_results
    
    def get_attribution_insights(self, db: Session, user_id: int,
                               days_back: int = 30) -> Dict[str, Any]:
        """Get comprehensive attribution insights"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        insights = {}
        
        # Analyze performance for different attribution models
        models = [AttributionModel.FIRST_TOUCH, AttributionModel.LAST_TOUCH, 
                 AttributionModel.LINEAR, AttributionModel.TIME_DECAY]
        
        model_comparisons = {}
        for model in models:
            performance = self.analyze_channel_performance(db, user_id, start_date, end_date, model)
            model_comparisons[model.value] = {
                'channels': [
                    {
                        'channel': p.channel,
                        'attributed_revenue': p.attributed_revenue,
                        'attributed_conversions': p.attributed_conversions
                    }
                    for p in performance[:5]  # Top 5 channels
                ]
            }
        
        insights['model_comparison'] = model_comparisons
        
        # Get detailed analysis for default model (Linear)
        linear_performance = self.analyze_channel_performance(db, user_id, start_date, end_date)
        
        insights['channel_performance'] = [
            {
                'channel': p.channel,
                'total_touchpoints': p.total_touchpoints,
                'attributed_conversions': round(p.attributed_conversions, 2),
                'attributed_revenue': round(p.attributed_revenue, 2),
                'avg_position': round(p.avg_position, 1),
                'conversion_assist_rate': round(p.conversion_assist_rate, 3),
                'first_touch_rate': round(p.first_touch_rate, 3),
                'last_touch_rate': round(p.last_touch_rate, 3)
            }
            for p in linear_performance
        ]
        
        # Calculate summary metrics
        total_revenue = sum(p.attributed_revenue for p in linear_performance)
        total_conversions = sum(p.attributed_conversions for p in linear_performance)
        
        insights['summary'] = {
            'total_attributed_revenue': round(total_revenue, 2),
            'total_attributed_conversions': round(total_conversions, 2),
            'active_channels': len(linear_performance),
            'analysis_period_days': days_back,
            'top_performing_channel': linear_performance[0].channel if linear_performance else None
        }
        
        # Channel recommendations
        recommendations = []
        
        if linear_performance:
            # Find underperforming channels
            avg_revenue_per_touchpoint = total_revenue / sum(p.total_touchpoints for p in linear_performance)
            
            for perf in linear_performance:
                revenue_per_touchpoint = perf.attributed_revenue / max(perf.total_touchpoints, 1)
                
                if revenue_per_touchpoint < avg_revenue_per_touchpoint * 0.5:
                    recommendations.append(f"Consider optimizing {perf.channel} - low revenue per touchpoint")
                
                if perf.conversion_assist_rate > 0.7:
                    recommendations.append(f"{perf.channel} is great for nurturing - consider upper-funnel campaigns")
                
                if perf.last_touch_rate > 0.6:
                    recommendations.append(f"{perf.channel} is effective for closing - consider retargeting campaigns")
        
        insights['recommendations'] = recommendations[:5]  # Top 5 recommendations
        
        return insights
    
    def calculate_incremental_value(self, db: Session, user_id: int, 
                                  test_channel: str, days_back: int = 30) -> Dict[str, float]:
        """Calculate incremental value of a specific channel"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        # Get performance with all channels
        all_channels_performance = self.analyze_channel_performance(db, user_id, start_date, end_date)
        total_revenue_all = sum(p.attributed_revenue for p in all_channels_performance)
        
        # Simulate performance without the test channel
        # This is a simplified simulation - in practice you'd need holdout testing
        test_channel_performance = next((p for p in all_channels_performance if p.channel == test_channel), None)
        
        if not test_channel_performance:
            return {'incremental_revenue': 0, 'incremental_conversions': 0}
        
        # Estimate incremental impact (simplified)
        # This assumes some cannibalization from other channels
        cannibalization_rate = 0.3  # 30% of test channel value would be captured by other channels
        
        incremental_revenue = test_channel_performance.attributed_revenue * (1 - cannibalization_rate)
        incremental_conversions = test_channel_performance.attributed_conversions * (1 - cannibalization_rate)
        
        return {
            'incremental_revenue': round(incremental_revenue, 2),
            'incremental_conversions': round(incremental_conversions, 2),
            'total_channel_revenue': round(test_channel_performance.attributed_revenue, 2),
            'estimated_cannibalization_rate': cannibalization_rate
        }