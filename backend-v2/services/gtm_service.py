"""
Google Tag Manager (GTM) Server-Side Service
BookedBarber V2 - Advanced Conversion Tracking and Analytics

This service provides comprehensive server-side GTM integration for:
- Server-side event tracking
- Enhanced ecommerce tracking
- Custom dimension and metric management
- GA4 integration through GTM
- Conversion tracking and attribution
- Privacy-compliant data handling
"""

import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
import aiohttp
from enum import Enum

from config import settings

logger = logging.getLogger(__name__)


class GTMEventType(Enum):
    """GTM Event Types for BookedBarber platform"""
    PAGE_VIEW = "page_view"
    APPOINTMENT_BOOKED = "appointment_booked"
    APPOINTMENT_CONFIRMED = "appointment_confirmed"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    USER_REGISTERED = "user_registered"
    USER_LOGIN = "user_login"
    FORM_SUBMITTED = "form_submitted"
    SEARCH_PERFORMED = "search_performed"
    SERVICE_SELECTED = "service_selected"
    BARBER_SELECTED = "barber_selected"
    AVAILABILITY_CHECKED = "availability_checked"
    REVIEW_SUBMITTED = "review_submitted"
    CALENDAR_SYNC = "calendar_sync"
    CUSTOM_EVENT = "custom_event"


@dataclass
class GTMEcommerceItem:
    """GTM Enhanced Ecommerce Item Structure"""
    item_id: str
    item_name: str
    item_category: str
    item_brand: str = "BookedBarber"
    price: float = 0.0
    quantity: int = 1
    item_variant: Optional[str] = None
    item_list_name: Optional[str] = None
    item_list_id: Optional[str] = None
    index: Optional[int] = None
    affiliation: Optional[str] = None
    coupon: Optional[str] = None
    discount: Optional[float] = None
    promotion_id: Optional[str] = None
    promotion_name: Optional[str] = None
    creative_name: Optional[str] = None
    creative_slot: Optional[str] = None
    location_id: Optional[str] = None


@dataclass
class GTMEvent:
    """GTM Event Structure"""
    event_name: str
    event_type: GTMEventType
    client_id: str
    timestamp: datetime
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    page_referrer: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    language: Optional[str] = None
    screen_resolution: Optional[str] = None
    viewport_size: Optional[str] = None
    custom_dimensions: Optional[Dict[str, Any]] = None
    custom_metrics: Optional[Dict[str, Union[int, float]]] = None
    ecommerce_items: Optional[List[GTMEcommerceItem]] = None
    event_parameters: Optional[Dict[str, Any]] = None
    consent_granted: Optional[Dict[str, bool]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to GTM-compatible dictionary"""
        event_dict = {
            "event": self.event_name,
            "event_type": self.event_type.value,
            "client_id": self.client_id,
            "timestamp": self.timestamp.isoformat(),
        }
        
        # Add optional fields if present
        if self.user_id:
            event_dict["user_id"] = self.user_id
        if self.session_id:
            event_dict["session_id"] = self.session_id
        if self.page_url:
            event_dict["page_location"] = self.page_url
        if self.page_title:
            event_dict["page_title"] = self.page_title
        if self.page_referrer:
            event_dict["page_referrer"] = self.page_referrer
        if self.user_agent:
            event_dict["user_agent"] = self.user_agent
        if self.ip_address:
            event_dict["ip_override"] = self.ip_address
        if self.language:
            event_dict["language"] = self.language
        if self.screen_resolution:
            event_dict["screen_resolution"] = self.screen_resolution
        if self.viewport_size:
            event_dict["viewport_size"] = self.viewport_size
            
        # Add custom dimensions and metrics
        if self.custom_dimensions:
            event_dict.update(self.custom_dimensions)
        if self.custom_metrics:
            event_dict.update(self.custom_metrics)
            
        # Add ecommerce data
        if self.ecommerce_items:
            event_dict["ecommerce"] = {
                "items": [asdict(item) for item in self.ecommerce_items]
            }
            
        # Add event parameters
        if self.event_parameters:
            event_dict.update(self.event_parameters)
            
        # Add consent information
        if self.consent_granted:
            event_dict["consent"] = self.consent_granted
            
        return event_dict


class GTMService:
    """Google Tag Manager Server-Side Service"""
    
    def __init__(self):
        self.container_id = settings.gtm_container_id
        self.server_container_url = settings.gtm_server_container_url
        self.server_side_endpoint = settings.gtm_server_side_endpoint
        self.measurement_protocol_url = settings.gtm_measurement_protocol_url
        self.debug_mode = settings.gtm_debug_mode
        self.test_mode = settings.gtm_test_mode
        self.validate_events = settings.gtm_validate_events
        self.log_events = settings.gtm_log_events
        self.batch_events = settings.gtm_batch_events
        self.batch_size = settings.gtm_batch_size
        self.batch_timeout = settings.gtm_batch_timeout
        
        # Event batching
        self.event_batch = []
        self.last_batch_time = datetime.now(timezone.utc)
        
        # Custom dimensions and metrics mapping
        self.custom_dimensions = self._parse_custom_dimensions()
        self.custom_metrics = self._parse_custom_metrics()
        
        # Session for HTTP requests
        self.session = None
        
    def _parse_custom_dimensions(self) -> Dict[str, str]:
        """Parse custom dimensions from settings"""
        try:
            dimensions_str = settings.gtm_custom_dimensions
            if dimensions_str:
                return json.loads(dimensions_str.replace("'", '"'))
            return {}
        except Exception as e:
            logger.error(f"Error parsing GTM custom dimensions: {e}")
            return {}
    
    def _parse_custom_metrics(self) -> Dict[str, str]:
        """Parse custom metrics from settings"""
        try:
            metrics_str = settings.gtm_custom_metrics
            if metrics_str:
                return json.loads(metrics_str.replace("'", '"'))
            return {}
        except Exception as e:
            logger.error(f"Error parsing GTM custom metrics: {e}")
            return {}
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(
                total=settings.gtm_event_timeout / 1000,
                connect=5.0
            )
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session
    
    def _validate_event(self, event: GTMEvent) -> bool:
        """Validate GTM event data"""
        if not self.validate_events:
            return True
            
        try:
            # Basic validation
            if not event.client_id:
                logger.error("GTM event missing client_id")
                return False
            
            if not event.event_name:
                logger.error("GTM event missing event_name")
                return False
                
            # Validate ecommerce items if present
            if event.ecommerce_items:
                for item in event.ecommerce_items:
                    if not item.item_id or not item.item_name:
                        logger.error(f"GTM ecommerce item missing required fields: {item}")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"Error validating GTM event: {e}")
            return False
    
    def _log_event(self, event: GTMEvent, context: str = ""):
        """Log GTM event for debugging"""
        if self.log_events:
            logger.info(f"GTM Event {context}: {event.event_name} - {event.event_type.value}")
            if self.debug_mode:
                logger.debug(f"GTM Event Data: {json.dumps(event.to_dict(), indent=2)}")
    
    async def track_event(self, event: GTMEvent) -> bool:
        """Track individual GTM event"""
        try:
            # Validate event
            if not self._validate_event(event):
                return False
            
            # Log event
            self._log_event(event, "Single")
            
            # Handle batching
            if self.batch_events:
                return await self._add_to_batch(event)
            else:
                return await self._send_event(event)
                
        except Exception as e:
            logger.error(f"Error tracking GTM event: {e}")
            return False
    
    async def _add_to_batch(self, event: GTMEvent) -> bool:
        """Add event to batch for later sending"""
        try:
            self.event_batch.append(event)
            
            # Check if batch should be sent
            current_time = datetime.now(timezone.utc)
            time_since_last_batch = (current_time - self.last_batch_time).total_seconds() * 1000
            
            if (len(self.event_batch) >= self.batch_size or 
                time_since_last_batch >= self.batch_timeout):
                return await self._send_batch()
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding event to GTM batch: {e}")
            return False
    
    async def _send_batch(self) -> bool:
        """Send batched events to GTM"""
        if not self.event_batch:
            return True
            
        try:
            # Prepare batch data
            batch_data = {
                "events": [event.to_dict() for event in self.event_batch],
                "batch_size": len(self.event_batch),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Send batch
            success = await self._send_to_gtm(batch_data, is_batch=True)
            
            if success:
                logger.info(f"GTM batch sent successfully: {len(self.event_batch)} events")
                self.event_batch.clear()
                self.last_batch_time = datetime.now(timezone.utc)
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending GTM batch: {e}")
            return False
    
    async def _send_event(self, event: GTMEvent) -> bool:
        """Send individual event to GTM"""
        try:
            event_data = event.to_dict()
            return await self._send_to_gtm(event_data, is_batch=False)
            
        except Exception as e:
            logger.error(f"Error sending GTM event: {e}")
            return False
    
    async def _send_to_gtm(self, data: Dict[str, Any], is_batch: bool = False) -> bool:
        """Send data to GTM server-side container"""
        try:
            # Skip if no container configured
            if not self.container_id and not self.server_container_url:
                if self.debug_mode:
                    logger.warning("No GTM container configured, skipping event")
                return True
            
            # Use server-side container if available
            if self.server_container_url:
                url = f"{self.server_container_url}/gtm/collect"
            else:
                # Fallback to measurement protocol
                url = f"{self.measurement_protocol_url}?id={self.container_id}"
            
            # Add debug parameters if in debug mode
            if self.debug_mode:
                url += "&debug=1"
            
            # Add test mode parameters
            if self.test_mode:
                url += "&test=1"
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "BookedBarber-GTM-Service/2.0"
            }
            
            # Send request
            session = await self._get_session()
            async with session.post(url, json=data, headers=headers) as response:
                if response.status == 200:
                    if self.debug_mode:
                        response_text = await response.text()
                        logger.debug(f"GTM Response: {response_text}")
                    return True
                else:
                    logger.error(f"GTM request failed: {response.status} - {await response.text()}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending data to GTM: {e}")
            return False
    
    async def track_page_view(
        self,
        client_id: str,
        page_url: str,
        page_title: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        referrer: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None,
        custom_metrics: Optional[Dict[str, Union[int, float]]] = None
    ) -> bool:
        """Track page view event"""
        event = GTMEvent(
            event_name="page_view",
            event_type=GTMEventType.PAGE_VIEW,
            client_id=client_id,
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            session_id=session_id,
            page_url=page_url,
            page_title=page_title,
            page_referrer=referrer,
            custom_dimensions=custom_dimensions,
            custom_metrics=custom_metrics
        )
        
        return await self.track_event(event)
    
    async def track_appointment_booked(
        self,
        client_id: str,
        appointment_id: str,
        barber_id: str,
        service_id: str,
        appointment_value: float,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        location_id: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track appointment booking event"""
        # Create ecommerce item for appointment
        appointment_item = GTMEcommerceItem(
            item_id=appointment_id,
            item_name=f"Appointment - {service_id}",
            item_category="Appointment",
            price=appointment_value,
            quantity=1,
            item_variant=barber_id,
            location_id=location_id
        )
        
        # Prepare custom dimensions
        dimensions = custom_dimensions or {}
        dimensions.update({
            "barber_id": barber_id,
            "service_id": service_id,
            "appointment_value": appointment_value
        })
        
        if location_id:
            dimensions["location_id"] = location_id
        
        event = GTMEvent(
            event_name="appointment_booked",
            event_type=GTMEventType.APPOINTMENT_BOOKED,
            client_id=client_id,
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            session_id=session_id,
            custom_dimensions=dimensions,
            ecommerce_items=[appointment_item],
            event_parameters={
                "currency": "USD",
                "value": appointment_value,
                "transaction_id": appointment_id
            }
        )
        
        return await self.track_event(event)
    
    async def track_payment_completed(
        self,
        client_id: str,
        payment_id: str,
        appointment_id: str,
        amount: float,
        payment_method: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track payment completion event"""
        # Prepare custom dimensions
        dimensions = custom_dimensions or {}
        dimensions.update({
            "payment_method": payment_method,
            "payment_id": payment_id,
            "appointment_id": appointment_id
        })
        
        event = GTMEvent(
            event_name="payment_completed",
            event_type=GTMEventType.PAYMENT_COMPLETED,
            client_id=client_id,
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            session_id=session_id,
            custom_dimensions=dimensions,
            event_parameters={
                "currency": "USD",
                "value": amount,
                "transaction_id": payment_id,
                "payment_method": payment_method
            }
        )
        
        return await self.track_event(event)
    
    async def track_user_registration(
        self,
        client_id: str,
        user_id: str,
        registration_method: str,
        user_role: str,
        session_id: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track user registration event"""
        # Prepare custom dimensions
        dimensions = custom_dimensions or {}
        dimensions.update({
            "user_role": user_role,
            "registration_method": registration_method
        })
        
        event = GTMEvent(
            event_name="user_registered",
            event_type=GTMEventType.USER_REGISTERED,
            client_id=client_id,
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            session_id=session_id,
            custom_dimensions=dimensions,
            event_parameters={
                "method": registration_method,
                "user_role": user_role
            }
        )
        
        return await self.track_event(event)
    
    async def track_custom_event(
        self,
        event_name: str,
        client_id: str,
        event_parameters: Dict[str, Any],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None,
        custom_metrics: Optional[Dict[str, Union[int, float]]] = None,
        ecommerce_items: Optional[List[GTMEcommerceItem]] = None
    ) -> bool:
        """Track custom event"""
        event = GTMEvent(
            event_name=event_name,
            event_type=GTMEventType.CUSTOM_EVENT,
            client_id=client_id,
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            session_id=session_id,
            custom_dimensions=custom_dimensions,
            custom_metrics=custom_metrics,
            ecommerce_items=ecommerce_items,
            event_parameters=event_parameters
        )
        
        return await self.track_event(event)
    
    async def flush_batch(self) -> bool:
        """Manually flush event batch"""
        if self.event_batch:
            return await self._send_batch()
        return True
    
    async def close(self):
        """Close GTM service and flush remaining events"""
        try:
            # Flush remaining events
            if self.event_batch:
                await self._send_batch()
            
            # Close HTTP session
            if self.session and not self.session.closed:
                await self.session.close()
                
        except Exception as e:
            logger.error(f"Error closing GTM service: {e}")
    
    def get_container_info(self) -> Dict[str, Any]:
        """Get GTM container information"""
        return {
            "container_id": self.container_id,
            "server_container_url": self.server_container_url,
            "debug_mode": self.debug_mode,
            "test_mode": self.test_mode,
            "batch_events": self.batch_events,
            "batch_size": self.batch_size,
            "custom_dimensions": self.custom_dimensions,
            "custom_metrics": self.custom_metrics,
            "events_in_batch": len(self.event_batch)
        }


# Global GTM service instance
gtm_service = GTMService()


async def track_gtm_event(event: GTMEvent) -> bool:
    """Global function to track GTM events"""
    return await gtm_service.track_event(event)


async def track_gtm_page_view(
    client_id: str,
    page_url: str,
    page_title: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    referrer: Optional[str] = None,
    custom_dimensions: Optional[Dict[str, Any]] = None,
    custom_metrics: Optional[Dict[str, Union[int, float]]] = None
) -> bool:
    """Global function to track page views"""
    return await gtm_service.track_page_view(
        client_id=client_id,
        page_url=page_url,
        page_title=page_title,
        user_id=user_id,
        session_id=session_id,
        referrer=referrer,
        custom_dimensions=custom_dimensions,
        custom_metrics=custom_metrics
    )


async def track_gtm_appointment_booked(
    client_id: str,
    appointment_id: str,
    barber_id: str,
    service_id: str,
    appointment_value: float,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    location_id: Optional[str] = None,
    custom_dimensions: Optional[Dict[str, Any]] = None
) -> bool:
    """Global function to track appointment bookings"""
    return await gtm_service.track_appointment_booked(
        client_id=client_id,
        appointment_id=appointment_id,
        barber_id=barber_id,
        service_id=service_id,
        appointment_value=appointment_value,
        user_id=user_id,
        session_id=session_id,
        location_id=location_id,
        custom_dimensions=custom_dimensions
    )


async def track_gtm_payment_completed(
    client_id: str,
    payment_id: str,
    appointment_id: str,
    amount: float,
    payment_method: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    custom_dimensions: Optional[Dict[str, Any]] = None
) -> bool:
    """Global function to track payment completion"""
    return await gtm_service.track_payment_completed(
        client_id=client_id,
        payment_id=payment_id,
        appointment_id=appointment_id,
        amount=amount,
        payment_method=payment_method,
        user_id=user_id,
        session_id=session_id,
        custom_dimensions=custom_dimensions
    )


async def track_gtm_user_registration(
    client_id: str,
    user_id: str,
    registration_method: str,
    user_role: str,
    session_id: Optional[str] = None,
    custom_dimensions: Optional[Dict[str, Any]] = None
) -> bool:
    """Global function to track user registration"""
    return await gtm_service.track_user_registration(
        client_id=client_id,
        user_id=user_id,
        registration_method=registration_method,
        user_role=user_role,
        session_id=session_id,
        custom_dimensions=custom_dimensions
    )


async def track_gtm_custom_event(
    event_name: str,
    client_id: str,
    event_parameters: Dict[str, Any],
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    custom_dimensions: Optional[Dict[str, Any]] = None,
    custom_metrics: Optional[Dict[str, Union[int, float]]] = None,
    ecommerce_items: Optional[List[GTMEcommerceItem]] = None
) -> bool:
    """Global function to track custom events"""
    return await gtm_service.track_custom_event(
        event_name=event_name,
        client_id=client_id,
        event_parameters=event_parameters,
        user_id=user_id,
        session_id=session_id,
        custom_dimensions=custom_dimensions,
        custom_metrics=custom_metrics,
        ecommerce_items=ecommerce_items
    )


# Export main classes and functions
__all__ = [
    'GTMService',
    'GTMEvent',
    'GTMEventType',
    'GTMEcommerceItem',
    'gtm_service',
    'track_gtm_event',
    'track_gtm_page_view',
    'track_gtm_appointment_booked',
    'track_gtm_payment_completed',
    'track_gtm_user_registration',
    'track_gtm_custom_event'
]