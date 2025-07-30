"""
Appointment Reminder Engine Service
Handles scheduling, triggering, and managing appointment reminders
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models import Appointment, Client, ReminderSchedule, ReminderPreference, ReminderDelivery
from services.notification_gateway_service import NotificationGatewayService
from services.reminder_template_service import ReminderTemplateService
from core.database import get_db
from core.logging import get_logger

logger = get_logger(__name__)


class ReminderEngineService:
    """
    Central reminder engine coordinating all reminder operations
    Follows Six Figure Barber methodology - revenue protection through professional communication
    """
    
    def __init__(self):
        self.notification_gateway = NotificationGatewayService()
        self.template_service = ReminderTemplateService()
        
    async def schedule_appointment_reminders(self, appointment_id: int, db: Session) -> Dict:
        """
        Create reminder schedule when appointment is booked
        
        Business Logic:
        - 24-hour reminder (default)
        - 2-hour reminder (for premium clients)
        - Follow-up reminder (post-appointment)
        """
        try:
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                raise ValueError(f"Appointment {appointment_id} not found")
            
            client = db.query(Client).filter(Client.id == appointment.client_id).first()
            preferences = self._get_client_preferences(client.id, db)
            
            # Calculate reminder times based on appointment datetime
            appointment_time = appointment.scheduled_at
            
            reminder_schedules = []
            
            # 24-hour reminder
            if preferences.get('24_hour_enabled', True):
                reminder_24h = ReminderSchedule(
                    appointment_id=appointment_id,
                    reminder_type='24_hour',
                    scheduled_for=appointment_time - timedelta(hours=24),
                    status='pending'
                )
                reminder_schedules.append(reminder_24h)
            
            # 2-hour reminder (for premium service positioning)
            if preferences.get('2_hour_enabled', True):
                reminder_2h = ReminderSchedule(
                    appointment_id=appointment_id,
                    reminder_type='2_hour', 
                    scheduled_for=appointment_time - timedelta(hours=2),
                    status='pending'
                )
                reminder_schedules.append(reminder_2h)
            
            # Follow-up reminder (post-appointment for rebooking)
            followup_time = appointment_time + timedelta(hours=2)
            reminder_followup = ReminderSchedule(
                appointment_id=appointment_id,
                reminder_type='followup',
                scheduled_for=followup_time,
                status='pending'
            )
            reminder_schedules.append(reminder_followup)
            
            # Save to database
            for schedule in reminder_schedules:
                db.add(schedule)
            db.commit()
            
            logger.info(f"Scheduled {len(reminder_schedules)} reminders for appointment {appointment_id}")
            
            return {
                "status": "success",
                "appointment_id": appointment_id,
                "reminders_scheduled": len(reminder_schedules),
                "schedules": [
                    {
                        "type": schedule.reminder_type,
                        "scheduled_for": schedule.scheduled_for,
                        "id": schedule.id
                    } for schedule in reminder_schedules
                ]
            }
            
        except Exception as e:
            logger.error(f"Error scheduling reminders for appointment {appointment_id}: {str(e)}")
            db.rollback()
            raise
    
    async def process_pending_reminders(self, db: Session) -> Dict:
        """
        Process all pending reminders that are due to be sent
        Called by scheduled job every 15 minutes
        """
        current_time = datetime.utcnow()
        
        # Get all pending reminders that are due
        pending_reminders = db.query(ReminderSchedule).filter(
            and_(
                ReminderSchedule.status == 'pending',
                ReminderSchedule.scheduled_for <= current_time
            )
        ).all()
        
        results = {
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "details": []
        }
        
        for reminder in pending_reminders:
            try:
                # Update status to processing
                reminder.status = 'processing'
                db.commit()
                
                # Send the reminder
                delivery_result = await self._send_reminder(reminder, db)
                
                if delivery_result["success"]:
                    reminder.status = 'sent'
                    results["successful"] += 1
                else:
                    reminder.status = 'failed'
                    reminder.delivery_attempts += 1
                    results["failed"] += 1
                
                results["details"].append({
                    "reminder_id": reminder.id,
                    "appointment_id": reminder.appointment_id,
                    "type": reminder.reminder_type,
                    "status": reminder.status,
                    "delivery_result": delivery_result
                })
                
                db.commit()
                results["processed"] += 1
                
            except Exception as e:
                logger.error(f"Error processing reminder {reminder.id}: {str(e)}")
                reminder.status = 'failed'
                reminder.delivery_attempts += 1
                db.commit()
                results["failed"] += 1
        
        logger.info(f"Processed {results['processed']} reminders: {results['successful']} successful, {results['failed']} failed")
        return results
    
    async def _send_reminder(self, reminder: ReminderSchedule, db: Session) -> Dict:
        """
        Send individual reminder through appropriate channels
        """
        try:
            # Get appointment and client details
            appointment = db.query(Appointment).filter(Appointment.id == reminder.appointment_id).first()
            client = db.query(Client).filter(Client.id == appointment.client_id).first()
            preferences = self._get_client_preferences(client.id, db)
            
            # Generate personalized message
            message_content = await self.template_service.generate_reminder_message(
                reminder.reminder_type,
                appointment,
                client,
                db
            )
            
            # Determine delivery channels based on preferences
            channels = self._get_enabled_channels(preferences)
            
            delivery_results = []
            
            for channel in channels:
                try:
                    if channel == 'sms' and client.phone:
                        result = await self.notification_gateway.send_sms(
                            phone=client.phone,
                            message=message_content["sms"],
                            appointment_id=appointment.id
                        )
                        delivery_results.append({"channel": "sms", "result": result})
                        
                    elif channel == 'email' and client.email:
                        result = await self.notification_gateway.send_email(
                            email=client.email,
                            subject=message_content["email_subject"],
                            body=message_content["email_body"],
                            appointment_id=appointment.id
                        )
                        delivery_results.append({"channel": "email", "result": result})
                        
                    elif channel == 'push' and client.device_token:
                        result = await self.notification_gateway.send_push(
                            device_token=client.device_token,
                            title=message_content["push_title"],
                            body=message_content["push_body"],
                            appointment_id=appointment.id
                        )
                        delivery_results.append({"channel": "push", "result": result})
                        
                except Exception as channel_error:
                    logger.error(f"Failed to send {channel} reminder: {str(channel_error)}")
                    delivery_results.append({
                        "channel": channel,
                        "result": {"success": False, "error": str(channel_error)}
                    })
            
            # Record delivery attempts
            for delivery in delivery_results:
                delivery_record = ReminderDelivery(
                    schedule_id=reminder.id,
                    channel=delivery["channel"],
                    provider_response=delivery["result"],
                    delivered_at=datetime.utcnow() if delivery["result"].get("success") else None
                )
                db.add(delivery_record)
            
            db.commit()
            
            # Return overall success (at least one channel succeeded)
            success = any(d["result"].get("success", False) for d in delivery_results)
            
            return {
                "success": success,
                "channels_attempted": len(delivery_results),
                "delivery_results": delivery_results
            }
            
        except Exception as e:
            logger.error(f"Error sending reminder {reminder.id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _get_client_preferences(self, client_id: int, db: Session) -> Dict:
        """Get client reminder preferences or return defaults"""
        preferences = db.query(ReminderPreference).filter(
            ReminderPreference.client_id == client_id
        ).first()
        
        if preferences:
            return {
                "sms_enabled": preferences.sms_enabled,
                "email_enabled": preferences.email_enabled,
                "push_enabled": preferences.push_enabled,
                "24_hour_enabled": True,  # Default business rule
                "2_hour_enabled": True,   # Premium service positioning
                "advance_hours": preferences.advance_hours or 24
            }
        
        # Default preferences aligned with Six Figure Barber methodology
        return {
            "sms_enabled": True,      # Primary channel for immediate reach
            "email_enabled": True,    # Professional communication
            "push_enabled": False,    # Opt-in only
            "24_hour_enabled": True,  # Standard business practice
            "2_hour_enabled": True,   # Premium service reminder
            "advance_hours": 24
        }
    
    def _get_enabled_channels(self, preferences: Dict) -> List[str]:
        """Determine which channels to use based on preferences"""
        channels = []
        
        if preferences.get("sms_enabled", True):
            channels.append("sms")
        if preferences.get("email_enabled", True):
            channels.append("email")  
        if preferences.get("push_enabled", False):
            channels.append("push")
            
        # Ensure at least one channel (business requirement)
        if not channels:
            channels = ["sms"]  # Fallback to SMS
            
        return channels
    
    async def handle_client_response(self, response_data: Dict, db: Session) -> Dict:
        """
        Handle client responses to reminders (confirmations, reschedules, cancellations)
        """
        try:
            appointment_id = response_data.get("appointment_id")
            response_type = response_data.get("response_type")  # 'confirmed', 'reschedule', 'cancel'
            
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                return {"success": False, "error": "Appointment not found"}
            
            # Update appointment based on response
            if response_type == "confirmed":
                appointment.reminder_confirmed = True
                appointment.confirmation_time = datetime.utcnow()
                
            elif response_type == "reschedule":
                # Mark for staff follow-up
                appointment.status = "reschedule_requested"
                appointment.notes = appointment.notes + f"\nClient requested reschedule via reminder response at {datetime.utcnow()}"
                
            elif response_type == "cancel":
                appointment.status = "cancelled"
                appointment.cancelled_at = datetime.utcnow()
                appointment.cancellation_reason = "Client cancelled via reminder response"
            
            db.commit()
            
            # Record the response
            response_record = ReminderDelivery(
                schedule_id=response_data.get("schedule_id"),
                channel="response",
                client_response=response_type,
                delivered_at=datetime.utcnow()
            )
            db.add(response_record)
            db.commit()
            
            logger.info(f"Processed client response for appointment {appointment_id}: {response_type}")
            
            return {
                "success": True,
                "appointment_id": appointment_id,
                "response_processed": response_type,
                "appointment_status": appointment.status
            }
            
        except Exception as e:
            logger.error(f"Error handling client response: {str(e)}")
            db.rollback()
            return {"success": False, "error": str(e)}


# Singleton instance
reminder_engine = ReminderEngineService()