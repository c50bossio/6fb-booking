"""
Google Analytics 4 (GA4) Analytics Service for BookedBarber V2

This service provides comprehensive GA4 integration including:
- Server-side event tracking via Measurement Protocol API
- Enhanced ecommerce tracking for appointments and payments
- Privacy compliance (GDPR/CCPA) with consent management
- Custom dimensions for barber business metrics
- Real-time event validation and error handling
"""

import json
import time
import uuid
import hashlib
import aiohttp
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

from config import settings


# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class GA4Event:
    """GA4 Event data structure"""
    name: str
    parameters: Dict[str, Any]
    timestamp_micros: Optional[int] = None
    
    def __post_init__(self):
        if self.timestamp_micros is None:
            self.timestamp_micros = int(time.time() * 1_000_000)


@dataclass
class GA4User:
    """GA4 User identification"""
    client_id: str
    user_id: Optional[str] = None
    user_properties: Optional[Dict[str, Dict[str, Any]]] = None


@dataclass
class GA4EcommerceItem:
    """GA4 Enhanced Ecommerce Item"""
    item_id: str
    item_name: str
    category: Optional[str] = None
    quantity: int = 1
    price: float = 0.0
    item_brand: Optional[str] = None
    item_variant: Optional[str] = None
    currency: str = "USD"


class GA4AnalyticsService:
    """Google Analytics 4 integration service"""
    
    def __init__(self):
        self.measurement_id = settings.ga4_measurement_id
        self.api_secret = settings.ga4_api_secret
        self.debug_mode = settings.ga4_debug_mode
        self.test_mode = settings.ga4_test_mode
        self.validate_events = settings.ga4_validate_events
        self.log_events = settings.ga4_log_events
        self.batch_events = settings.ga4_batch_events
        self.batch_size = settings.ga4_batch_size
        self.batch_timeout = settings.ga4_batch_timeout / 1000  # Convert to seconds
        
        # Event batch for improved performance
        self._event_batch: List[Dict[str, Any]] = []
        self._last_batch_time = time.time()
        
        # URLs
        if self.debug_mode:
            self.base_url = settings.ga4_measurement_protocol_debug_url
        else:
            self.base_url = settings.ga4_measurement_protocol_url
        
        # Custom dimensions mapping
        try:
            self.custom_dimensions = json.loads(settings.ga4_custom_dimensions) if settings.ga4_custom_dimensions else {}
        except (json.JSONDecodeError, AttributeError):
            self.custom_dimensions = {}
            logger.warning("Failed to parse ga4_custom_dimensions, using empty mapping")
        
        # Privacy settings
        self.anonymize_ip = settings.ga4_anonymize_ip
        self.respect_dnt = settings.ga4_respect_dnt
        self.consent_mode = settings.ga4_consent_mode
        
        # Validation
        if not self.measurement_id or not self.api_secret:
            logger.warning("GA4 Measurement ID or API Secret not configured. Events will not be sent.")
            self.enabled = False
        else:
            self.enabled = True
        
        logger.info(f"GA4AnalyticsService initialized. Enabled: {self.enabled}, Debug: {self.debug_mode}")

    async def track_event(
        self,
        event: GA4Event,
        user: GA4User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        consent_granted: bool = True,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Track a single GA4 event
        
        Args:
            event: GA4Event object
            user: GA4User object
            user_agent: User agent string
            ip_address: Client IP address
            consent_granted: Whether user has granted analytics consent
            custom_dimensions: Additional custom dimensions for this event
            
        Returns:
            bool: True if event was successfully queued/sent
        """
        if not self.enabled:
            logger.debug("GA4 not enabled, skipping event tracking")
            return False
        
        # Check consent
        if self.consent_mode and not consent_granted:
            logger.debug("User has not granted consent, skipping event tracking")
            return False
        
        # Check Do Not Track
        if self.respect_dnt and self._is_dnt_enabled(user_agent):
            logger.debug("Do Not Track enabled, skipping event tracking")
            return False
        
        # Validate event
        if self.validate_events and not self._validate_event(event):
            logger.warning(f"Event validation failed for event: {event.name}")
            return False
        
        # Add custom dimensions
        if custom_dimensions:
            for key, value in custom_dimensions.items():
                if key in self.custom_dimensions:
                    dimension_key = self.custom_dimensions[key]
                    event.parameters[dimension_key] = value
        
        # Build payload
        payload = self._build_payload(event, user, user_agent, ip_address)
        
        # Log event if enabled
        if self.log_events:
            logger.info(f"GA4 Event: {event.name} - {json.dumps(payload, indent=2)}")
        
        # Handle batching
        if self.batch_events:
            self._add_to_batch(payload)
            # Check if we should send batch
            if (len(self._event_batch) >= self.batch_size or 
                time.time() - self._last_batch_time >= self.batch_timeout):
                return await self._send_batch()
        else:
            return await self._send_single_event(payload)
        
        return True

    async def track_page_view(
        self,
        page_title: str,
        page_location: str,
        user: GA4User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track a page view event"""
        event = GA4Event(
            name="page_view",
            parameters={
                "page_title": page_title,
                "page_location": page_location,
                "page_referrer": "",
                "engagement_time_msec": 1000
            }
        )
        
        return await self.track_event(event, user, user_agent, ip_address, True, custom_dimensions)

    async def track_appointment_booked(
        self,
        appointment_id: str,
        user: GA4User,
        barber_id: Optional[str] = None,
        service_name: Optional[str] = None,
        price: Optional[float] = None,
        duration_minutes: Optional[int] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track appointment booking event"""
        parameters = {
            "appointment_id": appointment_id,
            "currency": "USD",
            "value": price or 0
        }
        
        if barber_id:
            parameters["barber_id"] = barber_id
        if service_name:
            parameters["service_name"] = service_name
        if duration_minutes:
            parameters["duration_minutes"] = duration_minutes
        
        event = GA4Event(name="appointment_booked", parameters=parameters)
        
        # Add barber business dimensions
        business_dimensions = {
            "barber_id": barber_id,
            "appointment_service": service_name
        }
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_appointment_confirmed(
        self,
        appointment_id: str,
        user: GA4User,
        barber_id: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track appointment confirmation event"""
        event = GA4Event(
            name="appointment_confirmed",
            parameters={
                "appointment_id": appointment_id,
                "barber_id": barber_id or ""
            }
        )
        
        business_dimensions = {"barber_id": barber_id}
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_appointment_completed(
        self,
        appointment_id: str,
        user: GA4User,
        barber_id: Optional[str] = None,
        service_name: Optional[str] = None,
        actual_duration: Optional[int] = None,
        customer_rating: Optional[float] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track appointment completion event"""
        parameters = {
            "appointment_id": appointment_id,
            "barber_id": barber_id or "",
            "service_name": service_name or ""
        }
        
        if actual_duration:
            parameters["actual_duration"] = actual_duration
        if customer_rating:
            parameters["customer_rating"] = customer_rating
        
        event = GA4Event(name="appointment_completed", parameters=parameters)
        
        business_dimensions = {
            "barber_id": barber_id,
            "appointment_service": service_name
        }
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_payment_initiated(
        self,
        transaction_id: str,
        user: GA4User,
        amount: float,
        currency: str = "USD",
        payment_method: Optional[str] = None,
        appointment_id: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track payment initiation event"""
        event = GA4Event(
            name="begin_checkout",
            parameters={
                "transaction_id": transaction_id,
                "value": amount,
                "currency": currency,
                "payment_method": payment_method or "unknown",
                "appointment_id": appointment_id or ""
            }
        )
        
        business_dimensions = {"payment_method": payment_method}
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_payment_completed(
        self,
        transaction_id: str,
        user: GA4User,
        amount: float,
        currency: str = "USD",
        payment_method: Optional[str] = None,
        appointment_id: Optional[str] = None,
        barber_id: Optional[str] = None,
        service_name: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track successful payment event with enhanced ecommerce"""
        # Create ecommerce item
        items = []
        if service_name and appointment_id:
            item = GA4EcommerceItem(
                item_id=appointment_id,
                item_name=service_name,
                category="barber_service",
                price=amount,
                currency=currency,
                item_brand="BookedBarber"
            )
            items.append(asdict(item))
        
        parameters = {
            "transaction_id": transaction_id,
            "value": amount,
            "currency": currency,
            "payment_method": payment_method or "unknown",
            "appointment_id": appointment_id or "",
            "barber_id": barber_id or ""
        }
        
        if items:
            parameters["items"] = items
        
        event = GA4Event(name="purchase", parameters=parameters)
        
        business_dimensions = {
            "payment_method": payment_method,
            "barber_id": barber_id,
            "appointment_service": service_name
        }
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_payment_failed(
        self,
        transaction_id: str,
        user: GA4User,
        amount: float,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        payment_method: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track failed payment event"""
        event = GA4Event(
            name="payment_failed",
            parameters={
                "transaction_id": transaction_id,
                "value": amount,
                "currency": "USD",
                "error_code": error_code or "unknown",
                "error_message": error_message or "unknown_error",
                "payment_method": payment_method or "unknown"
            }
        )
        
        business_dimensions = {"payment_method": payment_method}
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_user_signup(
        self,
        user: GA4User,
        user_role: str,
        signup_method: Optional[str] = None,
        referral_source: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track user registration event"""
        event = GA4Event(
            name="sign_up",
            parameters={
                "method": signup_method or "email",
                "user_role": user_role,
                "referral_source": referral_source or "direct"
            }
        )
        
        business_dimensions = {
            "user_role": user_role,
            "subscription_tier": "free"  # Default for new users
        }
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_user_login(
        self,
        user: GA4User,
        user_role: str,
        login_method: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track user login event"""
        event = GA4Event(
            name="login",
            parameters={
                "method": login_method or "email",
                "user_role": user_role
            }
        )
        
        business_dimensions = {"user_role": user_role}
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_service_viewed(
        self,
        service_id: str,
        service_name: str,
        user: GA4User,
        barber_id: Optional[str] = None,
        price: Optional[float] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track service page view event"""
        parameters = {
            "service_id": service_id,
            "service_name": service_name,
            "content_type": "service"
        }
        
        if barber_id:
            parameters["barber_id"] = barber_id
        if price:
            parameters["value"] = price
            parameters["currency"] = "USD"
        
        event = GA4Event(name="view_item", parameters=parameters)
        
        business_dimensions = {
            "barber_id": barber_id,
            "appointment_service": service_name
        }
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_barber_viewed(
        self,
        barber_id: str,
        barber_name: str,
        user: GA4User,
        location_id: Optional[str] = None,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track barber profile view event"""
        event = GA4Event(
            name="view_item",
            parameters={
                "item_id": barber_id,
                "item_name": barber_name,
                "content_type": "barber_profile",
                "barber_id": barber_id,
                "location_id": location_id or ""
            }
        )
        
        business_dimensions = {
            "barber_id": barber_id,
            "location_id": location_id
        }
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_availability_checked(
        self,
        user: GA4User,
        barber_id: str,
        date_requested: str,
        available_slots: int,
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track availability check event"""
        event = GA4Event(
            name="availability_checked",
            parameters={
                "barber_id": barber_id,
                "date_requested": date_requested,
                "available_slots": available_slots,
                "action": "check_availability"
            }
        )
        
        business_dimensions = {"barber_id": barber_id}
        if custom_dimensions:
            business_dimensions.update(custom_dimensions)
        
        return await self.track_event(event, user, custom_dimensions=business_dimensions)

    async def track_custom_event(
        self,
        event_name: str,
        user: GA4User,
        parameters: Dict[str, Any],
        custom_dimensions: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track a custom event with arbitrary parameters"""
        # Validate event name
        if not self._validate_event_name(event_name):
            logger.warning(f"Invalid event name: {event_name}")
            return False
        
        event = GA4Event(name=event_name, parameters=parameters)
        return await self.track_event(event, user, custom_dimensions=custom_dimensions)

    async def flush_batch(self) -> bool:
        """Manually flush the current event batch"""
        if self.batch_events and self._event_batch:
            return await self._send_batch()
        return True

    def _build_payload(
        self,
        event: GA4Event,
        user: GA4User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build GA4 Measurement Protocol payload"""
        payload = {
            "client_id": user.client_id,
            "events": [asdict(event)]
        }
        
        # Add user ID if available
        if user.user_id:
            payload["user_id"] = str(user.user_id)
        
        # Add user properties
        if user.user_properties:
            payload["user_properties"] = user.user_properties
        
        # Add IP address if not anonymized
        if ip_address and not self.anonymize_ip:
            payload["ip_override"] = ip_address
        
        # Add user agent
        if user_agent:
            payload["user_agent"] = user_agent
        
        # Add timestamp
        payload["timestamp_micros"] = event.timestamp_micros
        
        return payload

    def _add_to_batch(self, payload: Dict[str, Any]) -> None:
        """Add event payload to batch"""
        self._event_batch.append(payload)
        
        # Update batch time if this is the first event
        if len(self._event_batch) == 1:
            self._last_batch_time = time.time()

    async def _send_single_event(self, payload: Dict[str, Any]) -> bool:
        """Send a single event to GA4"""
        url = f"{self.base_url}?measurement_id={self.measurement_id}&api_secret={self.api_secret}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 204:
                        logger.debug("GA4 event sent successfully")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"GA4 API error: {response.status} - {error_text}")
                        return False
        
        except Exception as e:
            logger.error(f"Failed to send GA4 event: {str(e)}")
            return False

    async def _send_batch(self) -> bool:
        """Send batch of events to GA4"""
        if not self._event_batch:
            return True
        
        # Create batch payload
        batch_payload = {
            "events": []
        }
        
        # Combine events from all payloads in batch
        for payload in self._event_batch:
            batch_payload["events"].extend(payload["events"])
            
            # Use client_id and user_id from first event
            if "client_id" not in batch_payload:
                batch_payload["client_id"] = payload["client_id"]
            if "user_id" in payload and "user_id" not in batch_payload:
                batch_payload["user_id"] = payload["user_id"]
        
        success = await self._send_single_event(batch_payload)
        
        # Clear batch
        self._event_batch.clear()
        self._last_batch_time = time.time()
        
        if success:
            logger.debug(f"GA4 batch sent successfully with {len(batch_payload['events'])} events")
        
        return success

    def _validate_event(self, event: GA4Event) -> bool:
        """Validate GA4 event"""
        # Check event name
        if not self._validate_event_name(event.name):
            return False
        
        # Check parameter count (max 25)
        if len(event.parameters) > 25:
            logger.warning(f"Event {event.name} has too many parameters: {len(event.parameters)}")
            return False
        
        # Check parameter names and values
        for key, value in event.parameters.items():
            if not self._validate_parameter_name(key):
                logger.warning(f"Invalid parameter name: {key}")
                return False
            
            if not self._validate_parameter_value(value):
                logger.warning(f"Invalid parameter value for {key}: {value}")
                return False
        
        return True

    def _validate_event_name(self, name: str) -> bool:
        """Validate GA4 event name"""
        if not name or len(name) > 40:
            return False
        
        # Must start with letter or underscore
        if not (name[0].isalpha() or name[0] == '_'):
            return False
        
        # Can only contain letters, numbers, and underscores
        return all(c.isalnum() or c == '_' for c in name)

    def _validate_parameter_name(self, name: str) -> bool:
        """Validate GA4 parameter name"""
        if not name or len(name) > 40:
            return False
        
        # Must start with letter or underscore
        if not (name[0].isalpha() or name[0] == '_'):
            return False
        
        # Can only contain letters, numbers, and underscores
        return all(c.isalnum() or c == '_' for c in name)

    def _validate_parameter_value(self, value: Any) -> bool:
        """Validate GA4 parameter value"""
        if value is None:
            return True
        
        if isinstance(value, str):
            return len(value) <= 100
        
        if isinstance(value, (int, float)):
            return True
        
        if isinstance(value, bool):
            return True
        
        if isinstance(value, list):
            return len(value) <= 200
        
        return False

    def _is_dnt_enabled(self, user_agent: Optional[str]) -> bool:
        """Check if Do Not Track is enabled"""
        # This would typically be checked from request headers
        # For now, return False as we don't have access to headers
        return False

    @staticmethod
    def generate_client_id() -> str:
        """Generate a GA4 client ID"""
        return str(uuid.uuid4())

    @staticmethod
    def hash_user_id(user_id: str, salt: str = "") -> str:
        """Hash user ID for privacy"""
        combined = f"{user_id}{salt}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]


# Singleton instance
ga4_analytics = GA4AnalyticsService()


# Convenience functions for common events
async def track_appointment_event(
    event_type: str,
    appointment_id: str,
    user_id: str,
    **kwargs
) -> bool:
    """Convenience function for tracking appointment events"""
    client_id = kwargs.get('client_id', GA4AnalyticsService.generate_client_id())
    user = GA4User(client_id=client_id, user_id=user_id)
    
    if event_type == "booked":
        return await ga4_analytics.track_appointment_booked(appointment_id, user, **kwargs)
    elif event_type == "confirmed":
        return await ga4_analytics.track_appointment_confirmed(appointment_id, user, **kwargs)
    elif event_type == "completed":
        return await ga4_analytics.track_appointment_completed(appointment_id, user, **kwargs)
    else:
        logger.warning(f"Unknown appointment event type: {event_type}")
        return False


async def track_payment_event(
    event_type: str,
    transaction_id: str,
    user_id: str,
    amount: float,
    **kwargs
) -> bool:
    """Convenience function for tracking payment events"""
    client_id = kwargs.get('client_id', GA4AnalyticsService.generate_client_id())
    user = GA4User(client_id=client_id, user_id=user_id)
    
    if event_type == "initiated":
        return await ga4_analytics.track_payment_initiated(transaction_id, user, amount, **kwargs)
    elif event_type == "completed":
        return await ga4_analytics.track_payment_completed(transaction_id, user, amount, **kwargs)
    elif event_type == "failed":
        return await ga4_analytics.track_payment_failed(transaction_id, user, amount, **kwargs)
    else:
        logger.warning(f"Unknown payment event type: {event_type}")
        return False


async def track_user_event(
    event_type: str,
    user_id: str,
    user_role: str,
    **kwargs
) -> bool:
    """Convenience function for tracking user events"""
    client_id = kwargs.get('client_id', GA4AnalyticsService.generate_client_id())
    user = GA4User(client_id=client_id, user_id=user_id)
    
    if event_type == "signup":
        return await ga4_analytics.track_user_signup(user, user_role, **kwargs)
    elif event_type == "login":
        return await ga4_analytics.track_user_login(user, user_role, **kwargs)
    else:
        logger.warning(f"Unknown user event type: {event_type}")
        return False