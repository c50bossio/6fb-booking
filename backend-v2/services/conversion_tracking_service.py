"""
Conversion tracking service for BookedBarber V2.
Handles server-side conversion tracking for Google Tag Manager and Meta Conversions API.
Supports multi-touch attribution and cross-platform analytics.
"""

import os
import json
import hashlib
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, timezone
from enum import Enum
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException
import uuid

from models.tracking import (
    ConversionEvent, AttributionPath, TrackingConfiguration,
    EventType, AttributionModel, ConversionStatus
)
from models import User
from models import Appointment
from models import Payment
from utils.encryption import encrypt_text, decrypt_text
from schemas_new.tracking import (
    ConversionEventCreate, AttributionReport, TrackingConfigUpdate,
    ConversionAnalytics, ChannelPerformance
)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConversionChannel(str, Enum):
    """Supported conversion tracking channels"""
    ORGANIC = "organic"
    GOOGLE_ADS = "google_ads"
    META_ADS = "meta_ads"
    EMAIL = "email"
    SMS = "sms"
    DIRECT = "direct"
    REFERRAL = "referral"
    SOCIAL = "social"
    OTHER = "other"


class ConversionTrackingService:
    """Service for managing conversion tracking across multiple platforms"""
    
    def __init__(self):
        # Google Tag Manager Server-side configuration
        self.gtm_server_url = os.getenv("GTM_SERVER_CONTAINER_URL")
        self.gtm_measurement_id = os.getenv("GTM_MEASUREMENT_ID")
        
        # Meta Conversions API configuration
        self.meta_pixel_id = os.getenv("META_PIXEL_ID")
        self.meta_access_token = os.getenv("META_CONVERSION_API_TOKEN")
        self.meta_api_version = "v18.0"
        
        # Attribution window settings (in days)
        self.click_attribution_window = 30
        self.view_attribution_window = 1
        
        # Event deduplication window (in minutes)
        self.deduplication_window = 30
        
        if not all([self.gtm_server_url, self.gtm_measurement_id]):
            logger.warning("Google Tag Manager server-side not fully configured")
        
        if not all([self.meta_pixel_id, self.meta_access_token]):
            logger.warning("Meta Conversions API not fully configured")
    
    async def track_event(
        self,
        db: Session,
        user_id: int,
        event_data: ConversionEventCreate
    ) -> ConversionEvent:
        """
        Track a conversion event and send to configured platforms.
        Handles deduplication and attribution assignment.
        """
        try:
            # Check for duplicate events
            if await self._is_duplicate_event(db, user_id, event_data):
                logger.info(f"Duplicate event detected for user {user_id}: {event_data.event_name}")
                raise HTTPException(
                    status_code=400,
                    detail="Duplicate event detected within deduplication window"
                )
            
            # Create event record
            event = ConversionEvent(
                user_id=user_id,
                event_id=event_data.event_id or str(uuid.uuid4()),
                event_name=event_data.event_name,
                event_type=event_data.event_type,
                event_value=event_data.event_value,
                event_currency=event_data.event_currency,
                event_data=event_data.event_data or {},
                source_url=event_data.source_url,
                user_agent=event_data.user_agent,
                ip_address=self._hash_ip(event_data.ip_address) if event_data.ip_address else None,
                client_id=event_data.client_id,
                session_id=event_data.session_id,
                channel=self._determine_channel(event_data),
                utm_source=event_data.utm_source,
                utm_medium=event_data.utm_medium,
                utm_campaign=event_data.utm_campaign,
                utm_term=event_data.utm_term,
                utm_content=event_data.utm_content,
                referrer=event_data.referrer
            )
            
            # Save event to database first to get created_at timestamp
            db.add(event)
            db.commit()
            db.refresh(event)
            
            # Assign attribution after event is saved
            attribution_path = await self._assign_attribution(db, user_id, event)
            if attribution_path:
                event.attribution_path_id = attribution_path.id
                db.commit()
                db.refresh(event)
            
            # Send to external platforms asynchronously
            await self._send_to_platforms(db, event, user_id)
            
            # Update user lifetime value if it's a purchase event
            if event.event_type == EventType.PURCHASE and event.event_value:
                await self._update_user_ltv(db, user_id, event.event_value)
            
            return event
            
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            logger.error(f"Error tracking conversion event: {str(e)}\n{traceback.format_exc()}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to track conversion event: {str(e)}"
            )
    
    async def _is_duplicate_event(
        self,
        db: Session,
        user_id: int,
        event_data: ConversionEventCreate
    ) -> bool:
        """Check if this is a duplicate event within the deduplication window"""
        window_start = datetime.utcnow() - timedelta(minutes=self.deduplication_window)
        
        # Check by event_id if provided
        if event_data.event_id:
            existing = db.query(ConversionEvent).filter(
                ConversionEvent.event_id == event_data.event_id,
                ConversionEvent.user_id == user_id,
                ConversionEvent.created_at >= window_start
            ).first()
            if existing:
                return True
        
        # Check by event characteristics
        query = db.query(ConversionEvent).filter(
            ConversionEvent.user_id == user_id,
            ConversionEvent.event_name == event_data.event_name,
            ConversionEvent.event_type == event_data.event_type,
            ConversionEvent.created_at >= window_start
        )
        
        # Handle event_value comparison (can be None)
        if event_data.event_value is not None:
            query = query.filter(ConversionEvent.event_value == event_data.event_value)
        else:
            query = query.filter(ConversionEvent.event_value.is_(None))
        
        existing = query.first()
        
        return existing is not None
    
    def _hash_ip(self, ip_address: str) -> str:
        """Hash IP address for privacy compliance"""
        return hashlib.sha256(ip_address.encode()).hexdigest()
    
    def _determine_channel(self, event_data: ConversionEventCreate) -> ConversionChannel:
        """Determine the conversion channel based on UTM parameters and referrer"""
        # Check UTM parameters first
        if event_data.utm_source:
            utm_source_lower = event_data.utm_source.lower()
            if "google" in utm_source_lower:
                return ConversionChannel.GOOGLE_ADS
            elif "facebook" in utm_source_lower or "meta" in utm_source_lower:
                return ConversionChannel.META_ADS
            elif "email" in utm_source_lower:
                return ConversionChannel.EMAIL
            elif "sms" in utm_source_lower:
                return ConversionChannel.SMS
            else:
                return ConversionChannel.OTHER
        
        # Check referrer
        if event_data.referrer:
            referrer_lower = event_data.referrer.lower()
            if "google.com" in referrer_lower:
                return ConversionChannel.ORGANIC
            elif "facebook.com" in referrer_lower or "instagram.com" in referrer_lower:
                return ConversionChannel.SOCIAL
            elif event_data.source_url and referrer_lower != event_data.source_url.lower():
                return ConversionChannel.REFERRAL
        
        # Default to direct if no referrer or UTM
        return ConversionChannel.DIRECT
    
    async def _assign_attribution(
        self,
        db: Session,
        user_id: int,
        event: ConversionEvent
    ) -> Optional[AttributionPath]:
        """
        Assign attribution to the conversion event based on the user's journey.
        Supports multiple attribution models.
        """
        # Get user's touchpoints within attribution window
        window_start = datetime.utcnow() - timedelta(days=self.click_attribution_window)
        
        touchpoints = db.query(ConversionEvent).filter(
            ConversionEvent.user_id == user_id,
            ConversionEvent.created_at >= window_start,
            ConversionEvent.created_at <= event.created_at,
            ConversionEvent.event_type.in_([
                EventType.PAGE_VIEW,
                EventType.CLICK,
                EventType.FORM_SUBMIT,
                EventType.ADD_TO_CART
            ])
        ).order_by(ConversionEvent.created_at).all()
        
        if not touchpoints:
            return None
        
        # Create attribution path
        attribution_path = AttributionPath(
            user_id=user_id,
            conversion_event_id=event.id,
            touchpoints=[{
                "event_id": tp.id,
                "event_name": tp.event_name,
                "channel": tp.channel,
                "timestamp": tp.created_at.isoformat(),
                "utm_source": tp.utm_source,
                "utm_medium": tp.utm_medium,
                "utm_campaign": tp.utm_campaign
            } for tp in touchpoints],
            first_touch_channel=touchpoints[0].channel if touchpoints else None,
            last_touch_channel=touchpoints[-1].channel if touchpoints else None,
            attribution_model=AttributionModel.DATA_DRIVEN,  # Default model
            path_length=len(touchpoints)
        )
        
        # Calculate attribution weights
        weights = self._calculate_attribution_weights(
            touchpoints,
            attribution_path.attribution_model
        )
        attribution_path.attribution_weights = weights
        
        db.add(attribution_path)
        db.commit()
        
        return attribution_path
    
    def _calculate_attribution_weights(
        self,
        touchpoints: List[ConversionEvent],
        model: AttributionModel
    ) -> Dict[str, float]:
        """Calculate attribution weights based on the selected model"""
        weights = {}
        
        if model == AttributionModel.LAST_CLICK:
            # 100% credit to last touchpoint
            if touchpoints:
                last_channel = touchpoints[-1].channel
                weights[last_channel] = 1.0
                
        elif model == AttributionModel.FIRST_CLICK:
            # 100% credit to first touchpoint
            if touchpoints:
                first_channel = touchpoints[0].channel
                weights[first_channel] = 1.0
                
        elif model == AttributionModel.LINEAR:
            # Equal credit to all touchpoints
            if touchpoints:
                credit_per_touch = 1.0 / len(touchpoints)
                for tp in touchpoints:
                    weights[tp.channel] = weights.get(tp.channel, 0) + credit_per_touch
                    
        elif model == AttributionModel.TIME_DECAY:
            # More credit to recent touchpoints
            if touchpoints:
                total_weight = 0
                touch_weights = []
                
                for i, tp in enumerate(touchpoints):
                    # Exponential decay with half-life of 7 days
                    days_ago = (touchpoints[-1].created_at - tp.created_at).days
                    weight = 0.5 ** (days_ago / 7)
                    touch_weights.append(weight)
                    total_weight += weight
                
                # Normalize weights
                for i, tp in enumerate(touchpoints):
                    normalized_weight = touch_weights[i] / total_weight
                    weights[tp.channel] = weights.get(tp.channel, 0) + normalized_weight
                    
        elif model == AttributionModel.POSITION_BASED:
            # 40% to first, 40% to last, 20% distributed among middle
            if len(touchpoints) == 1:
                weights[touchpoints[0].channel] = 1.0
            elif len(touchpoints) == 2:
                weights[touchpoints[0].channel] = 0.5
                weights[touchpoints[1].channel] = 0.5
            else:
                # First touch: 40%
                weights[touchpoints[0].channel] = 0.4
                # Last touch: 40%
                last_channel = touchpoints[-1].channel
                weights[last_channel] = weights.get(last_channel, 0) + 0.4
                # Middle touches: 20% distributed
                middle_credit = 0.2 / (len(touchpoints) - 2)
                for tp in touchpoints[1:-1]:
                    weights[tp.channel] = weights.get(tp.channel, 0) + middle_credit
                    
        elif model == AttributionModel.DATA_DRIVEN:
            # Simplified data-driven model (would need ML in production)
            # For now, use a weighted combination based on conversion likelihood
            conversion_weights = {
                ConversionChannel.GOOGLE_ADS: 0.3,
                ConversionChannel.META_ADS: 0.25,
                ConversionChannel.EMAIL: 0.2,
                ConversionChannel.ORGANIC: 0.15,
                ConversionChannel.DIRECT: 0.05,
                ConversionChannel.OTHER: 0.05
            }
            
            total_weight = 0
            for tp in touchpoints:
                channel_weight = conversion_weights.get(tp.channel, 0.05)
                weights[tp.channel] = weights.get(tp.channel, 0) + channel_weight
                total_weight += channel_weight
            
            # Normalize
            if total_weight > 0:
                for channel in weights:
                    weights[channel] /= total_weight
        
        return weights
    
    async def _send_to_platforms(
        self,
        db: Session,
        event: ConversionEvent,
        user_id: int
    ) -> None:
        """Send conversion event to configured platforms"""
        # Get user data for enhanced matching
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"User {user_id} not found for conversion tracking")
            return
        
        # Send to Google Tag Manager
        if self.gtm_server_url and self.gtm_measurement_id:
            await self._send_to_gtm(event, user)
        
        # Send to Meta Conversions API
        if self.meta_pixel_id and self.meta_access_token:
            await self._send_to_meta(event, user)
    
    async def _send_to_gtm(
        self,
        event: ConversionEvent,
        user: User
    ) -> None:
        """Send event to Google Tag Manager Server-side"""
        try:
            # Prepare GTM event data
            gtm_event = {
                "client_id": event.client_id or f"bookedbarber_{user.id}",
                "user_id": str(user.id),
                "timestamp_micros": int(event.created_at.timestamp() * 1000000),
                "non_personalized_ads": False,
                "events": [{
                    "name": event.event_name,
                    "params": {
                        "event_id": event.event_id,
                        "value": float(event.event_value) if event.event_value else 0,
                        "currency": event.event_currency or "USD",
                        "transaction_id": event.event_data.get("transaction_id"),
                        "user_properties": {
                            "user_type": user.role,
                            "lifetime_value": float(getattr(user, 'lifetime_value', 0))
                        }
                    }
                }]
            }
            
            # Add enhanced conversions data (hashed)
            if user.email:
                gtm_event["user_data"] = {
                    "email": hashlib.sha256(user.email.lower().encode()).hexdigest(),
                    "phone_number": hashlib.sha256(user.phone.encode()).hexdigest() if user.phone else None
                }
            
            # Add UTM parameters
            if event.utm_source:
                gtm_event["events"][0]["params"].update({
                    "source": event.utm_source,
                    "medium": event.utm_medium,
                    "campaign": event.utm_campaign,
                    "term": event.utm_term,
                    "content": event.utm_content
                })
            
            # Send to GTM server
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.gtm_server_url}/mp/collect",
                    params={
                        "measurement_id": self.gtm_measurement_id,
                        "api_secret": os.getenv("GTM_API_SECRET")
                    },
                    json=gtm_event,
                    timeout=10.0
                )
                
                if response.status_code != 204:
                    logger.error(f"GTM tracking failed: {response.status_code} - {response.text}")
                else:
                    logger.info(f"Successfully sent event to GTM: {event.event_name}")
                    
        except Exception as e:
            logger.error(f"Error sending event to GTM: {str(e)}")
    
    async def _send_to_meta(
        self,
        event: ConversionEvent,
        user: User
    ) -> None:
        """Send event to Meta Conversions API"""
        try:
            # Prepare Meta event data
            meta_event = {
                "event_name": self._map_to_meta_event_name(event.event_name),
                "event_time": int(event.created_at.timestamp()),
                "event_id": event.event_id,
                "event_source_url": event.source_url,
                "action_source": "website",
                "user_data": {
                    "external_id": hashlib.sha256(str(user.id).encode()).hexdigest(),
                    "client_ip_address": event.ip_address,  # Already hashed
                    "client_user_agent": event.user_agent,
                    "fbc": event.event_data.get("fbc"),  # Facebook click ID
                    "fbp": event.event_data.get("fbp")   # Facebook pixel ID
                }
            }
            
            # Add enhanced matching data (hashed)
            if user.email:
                meta_event["user_data"]["em"] = hashlib.sha256(
                    user.email.lower().encode()
                ).hexdigest()
            
            if user.phone:
                # Remove non-numeric characters and hash
                clean_phone = ''.join(filter(str.isdigit, user.phone))
                meta_event["user_data"]["ph"] = hashlib.sha256(
                    clean_phone.encode()
                ).hexdigest()
            
            # Add custom data
            if event.event_value:
                meta_event["custom_data"] = {
                    "value": float(event.event_value),
                    "currency": event.event_currency or "USD"
                }
                
                # Add e-commerce data if available
                if event.event_type == EventType.PURCHASE:
                    meta_event["custom_data"].update({
                        "content_type": "product",
                        "contents": event.event_data.get("items", []),
                        "num_items": len(event.event_data.get("items", []))
                    })
            
            # Send to Meta Conversions API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://graph.facebook.com/{self.meta_api_version}/{self.meta_pixel_id}/events",
                    params={
                        "access_token": self.meta_access_token
                    },
                    json={
                        "data": [meta_event],
                        "test_event_code": os.getenv("META_TEST_EVENT_CODE")  # For testing
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Meta tracking failed: {response.status_code} - {response.text}")
                else:
                    result = response.json()
                    logger.info(f"Successfully sent event to Meta: {event.event_name} - "
                              f"Events received: {result.get('events_received', 0)}")
                    
        except Exception as e:
            logger.error(f"Error sending event to Meta: {str(e)}")
    
    def _map_to_meta_event_name(self, event_name: str) -> str:
        """Map custom event names to Meta standard events"""
        mapping = {
            "booking_completed": "Purchase",
            "booking_started": "InitiateCheckout",
            "service_viewed": "ViewContent",
            "add_to_cart": "AddToCart",
            "registration_completed": "CompleteRegistration",
            "search": "Search",
            "contact_form_submitted": "Contact",
            "lead_generated": "Lead"
        }
        
        return mapping.get(event_name.lower(), event_name)
    
    async def _update_user_ltv(
        self,
        db: Session,
        user_id: int,
        purchase_value: float
    ) -> None:
        """Update user lifetime value after a purchase"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            current_ltv = float(getattr(user, 'lifetime_value', 0))
            setattr(user, 'lifetime_value', current_ltv + purchase_value)
            db.commit()
    
    async def get_conversion_analytics(
        self,
        db: Session,
        user_id: int,
        start_date: datetime = None,
        end_date: datetime = None,
        group_by: str = "day"
    ) -> ConversionAnalytics:
        """Get comprehensive conversion analytics"""
        # Default to last 30 days
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Base query
        query = db.query(ConversionEvent).filter(
            ConversionEvent.user_id == user_id,
            ConversionEvent.created_at >= start_date,
            ConversionEvent.created_at <= end_date
        )
        
        # Get total conversions
        total_conversions = query.filter(
            ConversionEvent.event_type == EventType.PURCHASE
        ).count()
        
        # Get total revenue
        total_revenue = query.filter(
            ConversionEvent.event_type == EventType.PURCHASE
        ).with_entities(
            func.sum(ConversionEvent.event_value)
        ).scalar() or 0
        
        # Get conversion rate
        total_events = query.count()
        conversion_rate = (total_conversions / total_events * 100) if total_events > 0 else 0
        
        # Get average order value
        avg_order_value = (total_revenue / total_conversions) if total_conversions > 0 else 0
        
        # Get channel performance
        channel_performance = []
        channel_data = query.filter(
            ConversionEvent.event_type == EventType.PURCHASE
        ).with_entities(
            ConversionEvent.channel,
            func.count(ConversionEvent.id).label('conversions'),
            func.sum(ConversionEvent.event_value).label('revenue')
        ).group_by(ConversionEvent.channel).all()
        
        for channel, conversions, revenue in channel_data:
            # Get attributed revenue based on attribution model
            attributed_revenue = self._get_attributed_revenue(
                db, user_id, channel, start_date, end_date
            )
            
            channel_performance.append(ChannelPerformance(
                channel=channel,
                conversions=conversions,
                revenue=float(revenue or 0),
                attributed_revenue=attributed_revenue,
                conversion_rate=0,  # Would need total traffic data
                roi=0  # Would need cost data
            ))
        
        # Get top converting pages
        top_pages = query.filter(
            ConversionEvent.event_type == EventType.PURCHASE
        ).with_entities(
            ConversionEvent.source_url,
            func.count(ConversionEvent.id).label('conversions')
        ).group_by(
            ConversionEvent.source_url
        ).order_by(
            desc('conversions')
        ).limit(10).all()
        
        # Get conversion funnel
        funnel_steps = [
            (EventType.PAGE_VIEW, "Page Views"),
            (EventType.CLICK, "Clicks"),
            (EventType.ADD_TO_CART, "Add to Cart"),
            (EventType.PURCHASE, "Purchases")
        ]
        
        funnel_data = []
        for event_type, label in funnel_steps:
            count = query.filter(
                ConversionEvent.event_type == event_type
            ).count()
            funnel_data.append({
                "step": label,
                "count": count
            })
        
        return ConversionAnalytics(
            total_conversions=total_conversions,
            total_revenue=float(total_revenue),
            conversion_rate=round(conversion_rate, 2),
            average_order_value=round(avg_order_value, 2),
            channel_performance=channel_performance,
            top_converting_pages=[
                {"url": url, "conversions": count} 
                for url, count in top_pages
            ],
            conversion_funnel=funnel_data,
            period_start=start_date,
            period_end=end_date
        )
    
    def _get_attributed_revenue(
        self,
        db: Session,
        user_id: int,
        channel: str,
        start_date: datetime,
        end_date: datetime
    ) -> float:
        """Calculate attributed revenue for a channel based on attribution model"""
        # Get all conversions with attribution paths
        conversions = db.query(ConversionEvent).join(
            AttributionPath,
            ConversionEvent.id == AttributionPath.conversion_event_id
        ).filter(
            ConversionEvent.user_id == user_id,
            ConversionEvent.event_type == EventType.PURCHASE,
            ConversionEvent.created_at >= start_date,
            ConversionEvent.created_at <= end_date
        ).all()
        
        attributed_revenue = 0
        for conversion in conversions:
            if conversion.attribution_path and conversion.attribution_path.attribution_weights:
                channel_weight = conversion.attribution_path.attribution_weights.get(channel, 0)
                attributed_revenue += float(conversion.event_value or 0) * channel_weight
        
        return round(attributed_revenue, 2)
    
    async def get_attribution_report(
        self,
        db: Session,
        user_id: int,
        model: AttributionModel = AttributionModel.DATA_DRIVEN,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> AttributionReport:
        """Generate attribution report for different models"""
        # Default to last 30 days
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get all conversions in the period
        conversions = db.query(ConversionEvent).filter(
            ConversionEvent.user_id == user_id,
            ConversionEvent.event_type == EventType.PURCHASE,
            ConversionEvent.created_at >= start_date,
            ConversionEvent.created_at <= end_date
        ).all()
        
        # Recalculate attribution for the specified model
        channel_attribution = {}
        total_revenue = 0
        
        for conversion in conversions:
            if not conversion.event_value:
                continue
                
            total_revenue += float(conversion.event_value)
            
            # Get touchpoints for this conversion
            touchpoints = db.query(ConversionEvent).filter(
                ConversionEvent.user_id == user_id,
                ConversionEvent.created_at <= conversion.created_at,
                ConversionEvent.created_at >= conversion.created_at - timedelta(days=self.click_attribution_window),
                ConversionEvent.event_type.in_([
                    EventType.PAGE_VIEW,
                    EventType.CLICK,
                    EventType.FORM_SUBMIT,
                    EventType.ADD_TO_CART
                ])
            ).order_by(ConversionEvent.created_at).all()
            
            # Calculate attribution weights for this model
            weights = self._calculate_attribution_weights(touchpoints, model)
            
            # Distribute revenue based on weights
            for channel, weight in weights.items():
                attributed_value = float(conversion.event_value) * weight
                if channel not in channel_attribution:
                    channel_attribution[channel] = {
                        "revenue": 0,
                        "conversions": 0,
                        "touchpoints": 0
                    }
                channel_attribution[channel]["revenue"] += attributed_value
                channel_attribution[channel]["conversions"] += weight
                channel_attribution[channel]["touchpoints"] += 1
        
        # Format report
        channels = []
        for channel, data in channel_attribution.items():
            channels.append({
                "channel": channel,
                "attributed_revenue": round(data["revenue"], 2),
                "attributed_conversions": round(data["conversions"], 2),
                "touchpoints": data["touchpoints"],
                "revenue_share": round((data["revenue"] / total_revenue * 100) if total_revenue > 0 else 0, 2)
            })
        
        # Sort by attributed revenue
        channels.sort(key=lambda x: x["attributed_revenue"], reverse=True)
        
        return AttributionReport(
            model=model,
            total_revenue=round(total_revenue, 2),
            total_conversions=len(conversions),
            channels=channels,
            period_start=start_date,
            period_end=end_date
        )
    
    async def update_tracking_config(
        self,
        db: Session,
        user_id: int,
        config_update: TrackingConfigUpdate
    ) -> TrackingConfiguration:
        """Update tracking configuration for a user"""
        config = db.query(TrackingConfiguration).filter(
            TrackingConfiguration.user_id == user_id
        ).first()
        
        if not config:
            config = TrackingConfiguration(user_id=user_id)
            db.add(config)
        
        # Update configuration
        if config_update.gtm_container_id is not None:
            config.gtm_container_id = config_update.gtm_container_id
        
        if config_update.gtm_enabled is not None:
            config.gtm_enabled = config_update.gtm_enabled
        
        if config_update.meta_pixel_id is not None:
            config.meta_pixel_id = config_update.meta_pixel_id
        
        if config_update.meta_enabled is not None:
            config.meta_enabled = config_update.meta_enabled
        
        if config_update.google_ads_conversion_id is not None:
            config.google_ads_conversion_id = config_update.google_ads_conversion_id
        
        if config_update.google_ads_enabled is not None:
            config.google_ads_enabled = config_update.google_ads_enabled
        
        if config_update.attribution_window_days is not None:
            config.attribution_window_days = config_update.attribution_window_days
        
        if config_update.default_attribution_model is not None:
            config.default_attribution_model = config_update.default_attribution_model
        
        if config_update.conversion_value_rules is not None:
            config.conversion_value_rules = config_update.conversion_value_rules
        
        if config_update.excluded_domains is not None:
            config.excluded_domains = config_update.excluded_domains
        
        db.commit()
        db.refresh(config)
        
        return config
    
    async def test_platform_connection(
        self,
        platform: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Test connection to a tracking platform"""
        try:
            if platform == "gtm":
                # Test GTM connection
                test_event = {
                    "client_id": "test_client",
                    "events": [{
                        "name": "test_connection",
                        "params": {"test": True}
                    }]
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{config['server_url']}/mp/collect",
                        params={
                            "measurement_id": config['measurement_id'],
                            "api_secret": config['api_secret']
                        },
                        json=test_event,
                        timeout=5.0
                    )
                    
                    return {
                        "success": response.status_code == 204,
                        "message": "GTM connection successful" if response.status_code == 204 
                                 else f"GTM connection failed: {response.status_code}"
                    }
                    
            elif platform == "meta":
                # Test Meta Conversions API
                test_event = {
                    "data": [{
                        "event_name": "TestEvent",
                        "event_time": int(datetime.utcnow().timestamp()),
                        "action_source": "website",
                        "user_data": {"external_id": "test_user"}
                    }],
                    "test_event_code": "TEST_CONNECTION"
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"https://graph.facebook.com/{self.meta_api_version}/{config['pixel_id']}/events",
                        params={"access_token": config['access_token']},
                        json=test_event,
                        timeout=5.0
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        return {
                            "success": True,
                            "message": f"Meta connection successful. Events received: {result.get('events_received', 0)}"
                        }
                    else:
                        return {
                            "success": False,
                            "message": f"Meta connection failed: {response.text}"
                        }
                        
            else:
                return {
                    "success": False,
                    "message": f"Unknown platform: {platform}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection test failed: {str(e)}"
            }