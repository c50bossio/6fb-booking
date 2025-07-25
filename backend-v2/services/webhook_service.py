"""
Webhook delivery and management service
"""
import httpx
import json
import hmac
import hashlib
import base64
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from models import WebhookEndpoint, WebhookLog, WebhookStatus, WebhookAuthType, WebhookEventType
from utils.encryption import encrypt_data, decrypt_data

logger = logging.getLogger(__name__)


class WebhookService:
    """
    Service for managing webhook configuration and delivery
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def create_endpoint(
        self, 
        db: Session, 
        url: str, 
        name: str,
        events: List[str],
        created_by: str,
        description: Optional[str] = None,
        auth_type: WebhookAuthType = WebhookAuthType.none,
        auth_config: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        **kwargs
    ) -> WebhookEndpoint:
        """Create a new webhook endpoint"""
        # Validate events
        valid_events = [e.value for e in WebhookEventType]
        invalid_events = [e for e in events if e not in valid_events]
        if invalid_events:
            raise ValueError(f"Invalid events: {', '.join(invalid_events)}")
        
        # Encrypt auth config if provided
        encrypted_auth = None
        if auth_config:
            encrypted_auth = encrypt_data(json.dumps(auth_config))
        
        # Generate webhook secret for HMAC
        import secrets
        webhook_secret = secrets.token_urlsafe(32)
        
        endpoint = WebhookEndpoint(
            url=url,
            name=name,
            description=description,
            events=events,
            auth_type=auth_type,
            auth_config=encrypted_auth,
            headers=headers or {},
            secret=webhook_secret,
            created_by=created_by,
            **kwargs
        )
        
        db.add(endpoint)
        db.commit()
        db.refresh(endpoint)
        
        logger.info(f"Created webhook endpoint {endpoint.id} for {url}")
        return endpoint
    
    def update_endpoint(
        self,
        db: Session,
        endpoint: WebhookEndpoint,
        **updates
    ) -> WebhookEndpoint:
        """Update webhook endpoint configuration"""
        # Handle auth config encryption
        if 'auth_config' in updates and updates['auth_config']:
            updates['auth_config'] = encrypt_data(json.dumps(updates['auth_config']))
        
        # Validate events if provided
        if 'events' in updates:
            valid_events = [e.value for e in WebhookEventType]
            invalid_events = [e for e in updates['events'] if e not in valid_events]
            if invalid_events:
                raise ValueError(f"Invalid events: {', '.join(invalid_events)}")
        
        for key, value in updates.items():
            if hasattr(endpoint, key):
                setattr(endpoint, key, value)
        
        endpoint.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(endpoint)
        
        logger.info(f"Updated webhook endpoint {endpoint.id}")
        return endpoint
    
    async def trigger_webhook(
        self,
        db: Session,
        event_type: str,
        event_data: Dict[str, Any],
        event_id: Optional[str] = None
    ):
        """Trigger webhooks for a specific event"""
        # Find all active endpoints subscribed to this event
        endpoints = db.query(WebhookEndpoint).filter(
            WebhookEndpoint.is_active == True,
            WebhookEndpoint.events.contains([event_type])
        ).all()
        
        if not endpoints:
            logger.debug(f"No active webhooks found for event {event_type}")
            return
        
        logger.info(f"Triggering {len(endpoints)} webhooks for event {event_type}")
        
        # Create delivery tasks for each endpoint
        tasks = []
        for endpoint in endpoints:
            task = self._deliver_webhook(db, endpoint, event_type, event_data, event_id)
            tasks.append(task)
        
        # Execute all deliveries concurrently
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _deliver_webhook(
        self,
        db: Session,
        endpoint: WebhookEndpoint,
        event_type: str,
        event_data: Dict[str, Any],
        event_id: Optional[str] = None
    ):
        """Deliver a webhook to a single endpoint"""
        # Create log entry
        log = WebhookLog(
            endpoint_id=endpoint.id,
            event_type=event_type,
            event_id=event_id,
            request_url=endpoint.url,
            status=WebhookStatus.PENDING
        )
        db.add(log)
        db.commit()
        
        try:
            # Prepare payload
            payload = {
                "id": log.id,
                "type": event_type,
                "created": datetime.utcnow().isoformat(),
                "data": event_data
            }
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "6FB-Webhook/1.0",
                "X-Webhook-ID": log.id,
                "X-Webhook-Event": event_type,
                **(endpoint.headers or {})
            }
            
            # Add authentication
            headers.update(self._prepare_auth_headers(endpoint, payload))
            
            # Add HMAC signature if endpoint has secret
            if endpoint.secret:
                signature = self._generate_signature(endpoint.secret, payload)
                headers["X-Webhook-Signature"] = signature
            
            # Store request details
            log.request_headers = headers
            log.request_body = payload
            
            # Make the request
            start_time = datetime.utcnow()
            
            response = await self.client.post(
                endpoint.url,
                json=payload,
                headers=headers,
                timeout=endpoint.timeout_seconds or 30
            )
            
            # Calculate response time
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Update log with response
            log.status_code = response.status_code
            log.response_headers = dict(response.headers)
            log.response_body = response.text[:10000]  # Limit response size
            log.response_time_ms = int(response_time)
            log.delivered_at = datetime.utcnow()
            
            if response.status_code >= 200 and response.status_code < 300:
                log.status = WebhookStatus.SUCCESS
                log.completed_at = datetime.utcnow()
                
                # Update endpoint statistics
                endpoint.total_deliveries += 1
                endpoint.successful_deliveries += 1
                endpoint.last_triggered_at = datetime.utcnow()
                endpoint.last_success_at = datetime.utcnow()
                
                logger.info(f"Successfully delivered webhook {log.id} to {endpoint.url}")
            else:
                log.status = WebhookStatus.FAILED
                log.error_message = f"HTTP {response.status_code}: {response.text[:500]}"
                
                # Schedule retry if applicable
                if log.retry_count < endpoint.max_retries:
                    log.next_retry_at = datetime.utcnow() + timedelta(
                        seconds=endpoint.retry_delay_seconds * (log.retry_count + 1)
                    )
                    log.status = WebhookStatus.RETRYING
                
                # Update endpoint statistics
                endpoint.total_deliveries += 1
                endpoint.failed_deliveries += 1
                endpoint.last_triggered_at = datetime.utcnow()
                endpoint.last_failure_at = datetime.utcnow()
                
                logger.warning(f"Failed to deliver webhook {log.id}: HTTP {response.status_code}")
        
        except asyncio.TimeoutError:
            log.status = WebhookStatus.FAILED
            log.error_message = "Request timeout"
            log.completed_at = datetime.utcnow()
            
            # Schedule retry
            if log.retry_count < endpoint.max_retries:
                log.next_retry_at = datetime.utcnow() + timedelta(
                    seconds=endpoint.retry_delay_seconds * (log.retry_count + 1)
                )
                log.status = WebhookStatus.RETRYING
            
            endpoint.total_deliveries += 1
            endpoint.failed_deliveries += 1
            endpoint.last_triggered_at = datetime.utcnow()
            endpoint.last_failure_at = datetime.utcnow()
            
            logger.error(f"Webhook {log.id} timed out")
        
        except Exception as e:
            log.status = WebhookStatus.FAILED
            log.error_message = str(e)
            log.completed_at = datetime.utcnow()
            
            # Schedule retry
            if log.retry_count < endpoint.max_retries:
                log.next_retry_at = datetime.utcnow() + timedelta(
                    seconds=endpoint.retry_delay_seconds * (log.retry_count + 1)
                )
                log.status = WebhookStatus.RETRYING
            
            endpoint.total_deliveries += 1
            endpoint.failed_deliveries += 1
            endpoint.last_triggered_at = datetime.utcnow()
            endpoint.last_failure_at = datetime.utcnow()
            
            logger.error(f"Error delivering webhook {log.id}: {str(e)}")
        
        finally:
            db.commit()
    
    async def retry_webhook(self, db: Session, log: WebhookLog):
        """Retry a failed webhook delivery"""
        if log.status not in [WebhookStatus.FAILED, WebhookStatus.RETRYING]:
            raise ValueError("Can only retry failed webhooks")
        
        endpoint = log.endpoint
        if not endpoint.is_active:
            raise ValueError("Cannot retry webhook for inactive endpoint")
        
        log.retry_count += 1
        log.status = WebhookStatus.PENDING
        log.next_retry_at = None
        db.commit()
        
        # Re-deliver the webhook
        await self._deliver_webhook(
            db,
            endpoint,
            log.event_type,
            log.request_body.get('data', {}),
            log.event_id
        )
    
    async def test_webhook(
        self,
        db: Session,
        endpoint: WebhookEndpoint,
        event_type: str
    ) -> WebhookLog:
        """Send a test webhook with sample data"""
        # Generate sample data based on event type
        sample_data = self._generate_sample_data(event_type)
        
        # Deliver the test webhook
        await self._deliver_webhook(
            db,
            endpoint,
            event_type,
            sample_data,
            event_id="test-" + datetime.utcnow().isoformat()
        )
        
        # Return the created log
        log = db.query(WebhookLog).filter(
            WebhookLog.endpoint_id == endpoint.id,
            WebhookLog.event_type == event_type
        ).order_by(WebhookLog.created_at.desc()).first()
        
        return log
    
    def _prepare_auth_headers(
        self,
        endpoint: WebhookEndpoint,
        payload: Dict[str, Any]
    ) -> Dict[str, str]:
        """Prepare authentication headers based on endpoint config"""
        headers = {}
        
        if endpoint.auth_type == WebhookAuthType.none:
            return headers
        
        # Decrypt auth config
        auth_config = {}
        if endpoint.auth_config:
            decrypted = decrypt_data(endpoint.auth_config)
            auth_config = json.loads(decrypted)
        
        if endpoint.auth_type == WebhookAuthType.bearer:
            token = auth_config.get('token', '')
            headers['Authorization'] = f"Bearer {token}"
        
        elif endpoint.auth_type == WebhookAuthType.basic:
            username = auth_config.get('username', '')
            password = auth_config.get('password', '')
            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers['Authorization'] = f"Basic {credentials}"
        
        elif endpoint.auth_type == WebhookAuthType.api_key:
            key_name = auth_config.get('key_name', 'X-API-Key')
            key_value = auth_config.get('key_value', '')
            headers[key_name] = key_value
        
        return headers
    
    def _generate_signature(self, secret: str, payload: Dict[str, Any]) -> str:
        """Generate HMAC signature for webhook payload"""
        payload_bytes = json.dumps(payload, sort_keys=True).encode()
        signature = hmac.new(
            secret.encode(),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    def _generate_sample_data(self, event_type: str) -> Dict[str, Any]:
        """Generate sample data for webhook testing"""
        samples = {
            WebhookEventType.BOOKING_CREATED: {
                "booking_id": "sample-booking-123",
                "client_name": "John Doe",
                "service_name": "Premium Haircut",
                "appointment_date": "2024-01-15",
                "appointment_time": "14:00",
                "barber_name": "Jane Smith",
                "total_amount": 50.00
            },
            WebhookEventType.PAYMENT_COMPLETED: {
                "payment_id": "sample-payment-456",
                "booking_id": "sample-booking-123",
                "amount": 50.00,
                "currency": "USD",
                "payment_method": "card",
                "status": "completed"
            },
            WebhookEventType.CLIENT_CREATED: {
                "client_id": "sample-client-789",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "phone": "+1234567890",
                "created_at": datetime.utcnow().isoformat()
            }
        }
        
        # Return sample data or generic data for unknown events
        return samples.get(event_type, {
            "event": event_type,
            "sample": True,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def process_retry_queue(self, db: Session):
        """Process webhooks scheduled for retry"""
        # Find webhooks ready for retry
        ready_for_retry = db.query(WebhookLog).filter(
            WebhookLog.status == WebhookStatus.RETRYING,
            WebhookLog.next_retry_at <= datetime.utcnow()
        ).all()
        
        if not ready_for_retry:
            return
        
        logger.info(f"Processing {len(ready_for_retry)} webhook retries")
        
        # Retry each webhook
        tasks = []
        for log in ready_for_retry:
            if log.endpoint.is_active:
                task = self.retry_webhook(db, log)
                tasks.append(task)
        
        await asyncio.gather(*tasks, return_exceptions=True)


# Global webhook service instance
webhook_service = WebhookService()