"""
Notification Gateway Service
Handles multi-channel message delivery (SMS, Email, Push) for appointment reminders
Integrates with Twilio, SendGrid, and Firebase Cloud Messaging
"""

import asyncio
import aiohttp
from typing import Dict, Optional, List
from datetime import datetime
import json
import base64

from core.config import settings
from core.logging import get_logger
from services.twilio_service import TwilioService
from services.sendgrid_service import SendGridService
from services.firebase_service import FirebaseService

logger = get_logger(__name__)


class NotificationGatewayService:
    """
    Central gateway for all notification delivery
    Abstracts provider-specific implementations and handles failover
    """
    
    def __init__(self):
        self.twilio = TwilioService()
        self.sendgrid = SendGridService()
        self.firebase = FirebaseService()
        
    async def send_sms(self, phone: str, message: str, appointment_id: int) -> Dict:
        """
        Send SMS reminder via Twilio
        
        Business Logic:
        - Phone number validation and formatting
        - Character limit handling (160 chars for SMS)
        - Delivery tracking and retry logic
        """
        try:
            # Validate and format phone number
            formatted_phone = self._format_phone_number(phone)
            if not formatted_phone:
                return {
                    "success": False,
                    "error": "Invalid phone number format",
                    "provider": "twilio"
                }
            
            # Truncate message if too long (SMS limit)
            if len(message) > 160:
                message = message[:157] + "..."
                logger.warning(f"SMS message truncated for appointment {appointment_id}")
            
            # Send via Twilio
            result = await self.twilio.send_message(
                to_number=formatted_phone,
                message_body=message,
                callback_data={
                    "appointment_id": appointment_id,
                    "channel": "sms"
                }
            )
            
            return {
                "success": result.get("success", False),
                "provider": "twilio",
                "provider_message_id": result.get("message_sid"),
                "provider_response": result,
                "channel": "sms",
                "message_length": len(message)
            }
            
        except Exception as e:
            logger.error(f"SMS delivery failed for appointment {appointment_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "twilio",
                "channel": "sms"
            }
    
    async def send_email(self, email: str, subject: str, body: str, appointment_id: int) -> Dict:
        """
        Send email reminder via SendGrid
        
        Business Logic:
        - HTML and plain text versions
        - Professional branding and styling
        - Unsubscribe link compliance
        """
        try:
            # Validate email format
            if not self._is_valid_email(email):
                return {
                    "success": False,
                    "error": "Invalid email address format",
                    "provider": "sendgrid"
                }
            
            # Send via SendGrid
            result = await self.sendgrid.send_email(
                to_email=email,
                subject=subject,
                html_content=body,
                plain_content=self._html_to_plain_text(body),
                custom_args={
                    "appointment_id": str(appointment_id),
                    "channel": "email",
                    "type": "appointment_reminder"
                }
            )
            
            return {
                "success": result.get("success", False),
                "provider": "sendgrid",
                "provider_message_id": result.get("message_id"),
                "provider_response": result,
                "channel": "email"
            }
            
        except Exception as e:
            logger.error(f"Email delivery failed for appointment {appointment_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "sendgrid",
                "channel": "email"
            }
    
    async def send_push(self, device_token: str, title: str, body: str, appointment_id: int) -> Dict:
        """
        Send push notification via Firebase Cloud Messaging
        
        Business Logic:
        - Device token validation
        - Platform-specific formatting (iOS/Android)
        - Badge count management
        """
        try:
            if not device_token:
                return {
                    "success": False,
                    "error": "No device token provided",
                    "provider": "firebase"
                }
            
            # Send via Firebase
            result = await self.firebase.send_notification(
                device_token=device_token,
                title=title,
                body=body,
                data={
                    "appointment_id": str(appointment_id),
                    "channel": "push",
                    "type": "appointment_reminder",
                    "action": "view_appointment"
                }
            )
            
            return {
                "success": result.get("success", False),
                "provider": "firebase",
                "provider_message_id": result.get("message_id"),
                "provider_response": result,
                "channel": "push"
            }
            
        except Exception as e:
            logger.error(f"Push notification failed for appointment {appointment_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "firebase",
                "channel": "push"
            }
    
    async def send_multi_channel(self, channels: List[Dict], appointment_id: int) -> Dict:
        """
        Send reminder across multiple channels simultaneously
        
        Args:
            channels: List of channel configurations
            [
                {"type": "sms", "phone": "+1234567890", "message": "..."},
                {"type": "email", "email": "user@example.com", "subject": "...", "body": "..."}
            ]
        """
        results = []
        tasks = []
        
        for channel_config in channels:
            channel_type = channel_config.get("type")
            
            if channel_type == "sms":
                task = self.send_sms(
                    phone=channel_config.get("phone"),
                    message=channel_config.get("message"),
                    appointment_id=appointment_id
                )
                tasks.append(task)
                
            elif channel_type == "email":
                task = self.send_email(
                    email=channel_config.get("email"),
                    subject=channel_config.get("subject"),
                    body=channel_config.get("body"),
                    appointment_id=appointment_id
                )
                tasks.append(task)
                
            elif channel_type == "push":
                task = self.send_push(
                    device_token=channel_config.get("device_token"),
                    title=channel_config.get("title"),
                    body=channel_config.get("body"),
                    appointment_id=appointment_id
                )
                tasks.append(task)
        
        # Execute all channels in parallel
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        successful_channels = 0
        failed_channels = 0
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                results[i] = {
                    "success": False,
                    "error": str(result),
                    "channel": channels[i].get("type")
                }
                failed_channels += 1
            elif result.get("success"):
                successful_channels += 1
            else:
                failed_channels += 1
        
        return {
            "success": successful_channels > 0,
            "total_channels": len(channels),
            "successful": successful_channels,
            "failed": failed_channels,
            "results": results
        }
    
    def _format_phone_number(self, phone: str) -> Optional[str]:
        """Format phone number to E.164 format"""
        if not phone:
            return None
            
        # Remove all non-digit characters
        digits_only = ''.join(filter(str.isdigit, phone))
        
        # Add country code if missing (assume US)
        if len(digits_only) == 10:
            digits_only = "1" + digits_only
        elif len(digits_only) == 11 and digits_only.startswith("1"):
            pass  # Already has country code
        else:
            return None  # Invalid format
            
        return "+" + digits_only
    
    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def _html_to_plain_text(self, html_content: str) -> str:
        """Convert HTML to plain text for email"""
        import re
        # Remove HTML tags
        plain_text = re.sub(r'<[^>]+>', '', html_content)
        # Replace common HTML entities
        plain_text = plain_text.replace('&nbsp;', ' ')
        plain_text = plain_text.replace('&amp;', '&')
        plain_text = plain_text.replace('&lt;', '<')
        plain_text = plain_text.replace('&gt;', '>')
        return plain_text.strip()
    
    async def get_delivery_status(self, provider: str, message_id: str) -> Dict:
        """
        Check delivery status from provider
        Used for tracking and analytics
        """
        try:
            if provider == "twilio":
                return await self.twilio.get_message_status(message_id)
            elif provider == "sendgrid":
                return await self.sendgrid.get_email_status(message_id)
            elif provider == "firebase":
                return await self.firebase.get_notification_status(message_id)
            else:
                return {"success": False, "error": "Unknown provider"}
                
        except Exception as e:
            logger.error(f"Failed to get delivery status from {provider}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def handle_webhook(self, provider: str, webhook_data: Dict) -> Dict:
        """
        Handle delivery status webhooks from providers
        Updates delivery status and processes client responses
        """
        try:
            if provider == "twilio":
                return await self._handle_twilio_webhook(webhook_data)
            elif provider == "sendgrid":
                return await self._handle_sendgrid_webhook(webhook_data)
            elif provider == "firebase":
                return await self._handle_firebase_webhook(webhook_data)
            else:
                return {"success": False, "error": "Unknown provider"}
                
        except Exception as e:
            logger.error(f"Webhook handling failed for {provider}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _handle_twilio_webhook(self, data: Dict) -> Dict:
        """Process Twilio delivery status webhook"""
        message_sid = data.get("MessageSid")
        status = data.get("MessageStatus")
        
        # Process client responses (if SMS reply)
        if "Body" in data:
            response_text = data.get("Body", "").lower().strip()
            if any(word in response_text for word in ["yes", "confirm", "ok"]):
                client_response = "confirmed"
            elif any(word in response_text for word in ["reschedule", "change"]):
                client_response = "reschedule"
            elif any(word in response_text for word in ["cancel", "no"]):
                client_response = "cancel"
            else:
                client_response = "other"
                
            return {
                "success": True,
                "message_id": message_sid,
                "delivery_status": status,
                "client_response": client_response,
                "response_text": data.get("Body")
            }
        
        return {
            "success": True,
            "message_id": message_sid,
            "delivery_status": status
        }
    
    async def _handle_sendgrid_webhook(self, data: Dict) -> Dict:
        """Process SendGrid event webhook"""
        events = []
        
        # SendGrid sends array of events
        for event in data if isinstance(data, list) else [data]:
            message_id = event.get("sg_message_id")
            event_type = event.get("event")
            
            events.append({
                "message_id": message_id,
                "event_type": event_type,
                "timestamp": event.get("timestamp")
            })
        
        return {
            "success": True,
            "events": events
        }
    
    async def _handle_firebase_webhook(self, data: Dict) -> Dict:
        """Process Firebase notification webhook"""
        # Firebase webhook handling
        return {
            "success": True,
            "data": data
        }


# Singleton instance
notification_gateway = NotificationGatewayService()