"""
SMS Response Handler for BookedBarber
Handles two-way SMS communication for appointment management
"""

import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from models import Appointment, User, Client, NotificationQueue, NotificationStatus
from services.notification_service import notification_service
from utils.url_shortener import create_appointment_short_url, create_booking_short_url
from config import settings

logger = logging.getLogger(__name__)

class SMSResponseHandler:
    """Handle incoming SMS responses and provide appropriate actions"""
    
    def __init__(self):
        # Define SMS keywords and their patterns
        self.keywords = {
            'CONFIRM': [
                r'\bCONFIRM\b', r'\bCONFIRMED\b', r'\bYES\b', r'\bY\b', 
                r'\bOK\b', r'\bOKAY\b', r'\b1\b', r'\bACCEPT\b'
            ],
            'CANCEL': [
                r'\bCANCEL\b', r'\bCANCELLED\b', r'\bNO\b', r'\bN\b', 
                r'\bSTOP\b', r'\b2\b', r'\bDELETE\b', r'\bREMOVE\b'
            ],
            'RESCHEDULE': [
                r'\bRESCHEDULE\b', r'\bRESCHED\b', r'\bCHANGE\b', r'\bMOVE\b', 
                r'\bSWITCH\b', r'\b3\b', r'\bUPDATE\b', r'\bMODIFY\b'
            ],
            'HELP': [
                r'\bHELP\b', r'\bINFO\b', r'\bSUPPORT\b', r'\bOPTIONS\b', 
                r'\bCOMMANDS\b', r'\b4\b', r'\b\?\b'
            ],
            'STATUS': [
                r'\bSTATUS\b', r'\bCHECK\b', r'\bWHEN\b', r'\bTIME\b', 
                r'\bDETAILS\b', r'\b5\b', r'\bINFO\b'
            ]
        }
        
        # Response templates
        self.responses = {
            'confirm_success': "Your appointment has been confirmed. We'll see you {appointment_time} on {appointment_date}. - {business_name}",
            'cancel_success': "Your appointment on {appointment_date} has been cancelled. {refund_info}Book again: {booking_url} - {business_name}",
            'reschedule_prompt': "To reschedule your {appointment_date} appointment, please call {business_phone} or visit {reschedule_url} - {business_name}",
            'help_message': "Reply: CONFIRM to confirm, CANCEL to cancel, RESCHEDULE to change time, STATUS for details, or call {business_phone} - {business_name}",
            'status_info': "Your appointment: {appointment_date} at {appointment_time} for {service_name}. {barber_info}Questions? Call {business_phone} - {business_name}",
            'not_found': "We couldn't find your appointment. Please call {business_phone} for assistance. - {business_name}",
            'already_processed': "This appointment has already been {status}. Call {business_phone} if you need help. - {business_name}",
            'error': "Sorry, we couldn't process your request. Please call {business_phone} for assistance. - {business_name}",
            'unrecognized': "We didn't understand your message. Reply HELP for options or call {business_phone} - {business_name}"
        }
    
    def detect_keyword(self, message: str) -> Optional[str]:
        """
        Detect SMS keywords in the message
        
        Args:
            message: The incoming SMS message
            
        Returns:
            Detected keyword or None
        """
        message_upper = message.upper().strip()
        
        for keyword, patterns in self.keywords.items():
            for pattern in patterns:
                if re.search(pattern, message_upper):
                    return keyword
        
        return None
    
    def find_recent_appointment(self, db: Session, phone_number: str) -> Optional[Appointment]:
        """
        Find the most recent appointment for a phone number
        
        Args:
            db: Database session
            phone_number: Phone number to search for
            
        Returns:
            Most recent appointment or None
        """
        try:
            # Format phone number for search
            formatted_phone = self._format_phone_for_search(phone_number)
            
            # Search in User table first
            user = db.query(User).filter(
                or_(
                    User.phone == phone_number,
                    User.phone == formatted_phone,
                    User.phone.contains(formatted_phone[-10:])  # Last 10 digits
                )
            ).first()
            
            if user:
                # Find most recent appointment for this user
                appointment = db.query(Appointment).filter(
                    and_(
                        Appointment.user_id == user.id,
                        Appointment.start_time > datetime.utcnow() - timedelta(days=7),  # Within last 7 days or future
                        Appointment.status.in_(['confirmed', 'pending'])
                    )
                ).order_by(Appointment.start_time.desc()).first()
                
                if appointment:
                    return appointment
            
            # Search in Client table as backup
            client = db.query(Client).filter(
                or_(
                    Client.phone == phone_number,
                    Client.phone == formatted_phone,
                    Client.phone.contains(formatted_phone[-10:])
                )
            ).first()
            
            if client:
                # Find most recent appointment for this client
                appointment = db.query(Appointment).filter(
                    and_(
                        Appointment.client_id == client.id,
                        Appointment.start_time > datetime.utcnow() - timedelta(days=7),
                        Appointment.status.in_(['confirmed', 'pending'])
                    )
                ).order_by(Appointment.start_time.desc()).first()
                
                return appointment
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding appointment for {phone_number}: {str(e)}")
            return None
    
    def handle_confirm(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Handle appointment confirmation"""
        try:
            if appointment.status == 'confirmed':
                return {
                    'success': True,
                    'response': self._format_response('already_processed', appointment, status='confirmed'),
                    'action': 'already_confirmed'
                }
            
            # Update appointment status
            appointment.status = 'confirmed'
            appointment.updated_at = datetime.utcnow()
            db.commit()
            
            # Log the confirmation
            logger.info(f"Appointment {appointment.id} confirmed via SMS from {phone_number}")
            
            # Send confirmation response
            response = self._format_response('confirm_success', appointment)
            
            return {
                'success': True,
                'response': response,
                'action': 'confirmed',
                'appointment_id': appointment.id
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error confirming appointment {appointment.id}: {str(e)}")
            return {
                'success': False,
                'response': self._format_response('error', appointment),
                'action': 'error'
            }
    
    def handle_cancel(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Handle appointment cancellation"""
        try:
            if appointment.status == 'cancelled':
                return {
                    'success': True,
                    'response': self._format_response('already_processed', appointment, status='cancelled'),
                    'action': 'already_cancelled'
                }
            
            # Check cancellation policy (e.g., 24 hours notice)
            hours_until_appointment = (appointment.start_time - datetime.utcnow()).total_seconds() / 3600
            cancellation_fee = 0
            refund_amount = appointment.price or 0
            
            if hours_until_appointment < 24:  # Less than 24 hours notice
                cancellation_fee = refund_amount * 0.5  # 50% cancellation fee
                refund_amount = refund_amount - cancellation_fee
            
            # Update appointment status
            appointment.status = 'cancelled'
            appointment.cancelled_at = datetime.utcnow()
            appointment.cancelled_by = 'client'
            appointment.cancellation_reason = 'Cancelled via SMS'
            appointment.updated_at = datetime.utcnow()
            
            # Cancel any pending notifications for this appointment
            notification_service.cancel_appointment_notifications(db, appointment.id)
            
            db.commit()
            
            # Log the cancellation
            logger.info(f"Appointment {appointment.id} cancelled via SMS from {phone_number}")
            
            # Prepare refund info
            refund_info = ""
            if refund_amount > 0:
                refund_info = f"Refund: ${refund_amount:.2f} will be processed within 3-5 days. "
            elif cancellation_fee > 0:
                refund_info = f"Late cancellation fee: ${cancellation_fee:.2f} applies. "
            
            # Create booking URL for rebooking
            booking_url = create_booking_short_url(db)
            
            response = self._format_response(
                'cancel_success', 
                appointment, 
                refund_info=refund_info,
                booking_url=booking_url or f"https://app.bookedbarber.com/book"
            )
            
            return {
                'success': True,
                'response': response,
                'action': 'cancelled',
                'appointment_id': appointment.id,
                'refund_amount': refund_amount,
                'cancellation_fee': cancellation_fee
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error cancelling appointment {appointment.id}: {str(e)}")
            return {
                'success': False,
                'response': self._format_response('error', appointment),
                'action': 'error'
            }
    
    def handle_reschedule(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Handle reschedule request"""
        try:
            # Create reschedule URL
            reschedule_url = create_appointment_short_url(db, appointment.id, 'reschedule')
            
            response = self._format_response(
                'reschedule_prompt',
                appointment,
                reschedule_url=reschedule_url or f"https://app.bookedbarber.com/appointments/{appointment.id}/reschedule"
            )
            
            # Log the reschedule request
            logger.info(f"Reschedule request for appointment {appointment.id} via SMS from {phone_number}")
            
            return {
                'success': True,
                'response': response,
                'action': 'reschedule_prompted',
                'appointment_id': appointment.id
            }
            
        except Exception as e:
            logger.error(f"Error handling reschedule for appointment {appointment.id}: {str(e)}")
            return {
                'success': False,
                'response': self._format_response('error', appointment),
                'action': 'error'
            }
    
    def handle_help(self, db: Session, appointment: Optional[Appointment], phone_number: str) -> Dict[str, Any]:
        """Handle help request"""
        try:
            if appointment:
                response = self._format_response('help_message', appointment)
            else:
                # Generic help message
                business_phone = getattr(settings, 'business_phone', None) or getattr(settings, 'twilio_phone_number', 'us')
                app_name = getattr(settings, 'app_name', 'BookedBarber')
                response = f"Reply: HELP for options or call {business_phone} for assistance. - {app_name}"
            
            return {
                'success': True,
                'response': response,
                'action': 'help_provided'
            }
            
        except Exception as e:
            logger.error(f"Error providing help for {phone_number}: {str(e)}")
            return {
                'success': False,
                'response': "Sorry, we couldn't process your request. Please call us for assistance.",
                'action': 'error'
            }
    
    def handle_status(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Handle status request"""
        try:
            barber_info = ""
            if appointment.barber_id:
                barber_info = f"With: {appointment.barber.name}. " if appointment.barber else ""
            
            response = self._format_response(
                'status_info',
                appointment,
                barber_info=barber_info
            )
            
            return {
                'success': True,
                'response': response,
                'action': 'status_provided',
                'appointment_id': appointment.id
            }
            
        except Exception as e:
            logger.error(f"Error providing status for appointment {appointment.id}: {str(e)}")
            return {
                'success': False,
                'response': self._format_response('error', appointment),
                'action': 'error'
            }
    
    def process_sms_response(self, db: Session, from_phone: str, message_body: str) -> Dict[str, Any]:
        """
        Main method to process incoming SMS responses
        
        Args:
            db: Database session
            from_phone: Phone number that sent the SMS
            message_body: Content of the SMS message
            
        Returns:
            Dict with response and action details
        """
        try:
            # Clean and detect keyword
            keyword = self.detect_keyword(message_body)
            
            # Find recent appointment
            appointment = self.find_recent_appointment(db, from_phone)
            
            # Log the incoming SMS
            logger.info(f"Incoming SMS from {from_phone}: '{message_body}' - Keyword: {keyword}, Appointment: {appointment.id if appointment else 'None'}")
            
            # Handle based on keyword
            if keyword == 'CONFIRM':
                if appointment:
                    return self.handle_confirm(db, appointment, from_phone)
                else:
                    return {
                        'success': False,
                        'response': self._format_generic_response('not_found'),
                        'action': 'no_appointment'
                    }
            
            elif keyword == 'CANCEL':
                if appointment:
                    return self.handle_cancel(db, appointment, from_phone)
                else:
                    return {
                        'success': False,
                        'response': self._format_generic_response('not_found'),
                        'action': 'no_appointment'
                    }
            
            elif keyword == 'RESCHEDULE':
                if appointment:
                    return self.handle_reschedule(db, appointment, from_phone)
                else:
                    return {
                        'success': False,
                        'response': self._format_generic_response('not_found'),
                        'action': 'no_appointment'
                    }
            
            elif keyword == 'HELP':
                return self.handle_help(db, appointment, from_phone)
            
            elif keyword == 'STATUS':
                if appointment:
                    return self.handle_status(db, appointment, from_phone)
                else:
                    return {
                        'success': False,
                        'response': self._format_generic_response('not_found'),
                        'action': 'no_appointment'
                    }
            
            else:
                # Unrecognized message
                if appointment:
                    response = self._format_response('unrecognized', appointment)
                else:
                    response = self._format_generic_response('unrecognized')
                
                return {
                    'success': False,
                    'response': response,
                    'action': 'unrecognized'
                }
        
        except Exception as e:
            logger.error(f"Error processing SMS from {from_phone}: {str(e)}")
            return {
                'success': False,
                'response': self._format_generic_response('error'),
                'action': 'error'
            }
    
    def _format_response(self, template_key: str, appointment: Appointment, **kwargs) -> str:
        """Format a response template with appointment data"""
        try:
            template = self.responses.get(template_key, self.responses['error'])
            
            # Prepare context
            context = {
                'appointment_date': appointment.start_time.strftime('%B %d'),
                'appointment_time': appointment.start_time.strftime('%I:%M %p'),
                'service_name': appointment.service_name or 'your service',
                'business_name': getattr(settings, 'app_name', 'BookedBarber'),
                'business_phone': getattr(settings, 'business_phone', None) or getattr(settings, 'twilio_phone_number', 'us'),
                **kwargs
            }
            
            return template.format(**context)
            
        except Exception as e:
            logger.error(f"Error formatting response template {template_key}: {str(e)}")
            return self.responses['error'].format(
                business_phone=getattr(settings, 'business_phone', None) or getattr(settings, 'twilio_phone_number', 'us'),
                business_name=getattr(settings, 'app_name', 'BookedBarber')
            )
    
    def _format_generic_response(self, template_key: str, **kwargs) -> str:
        """Format a generic response template without appointment data"""
        try:
            template = self.responses.get(template_key, self.responses['error'])
            
            context = {
                'business_name': getattr(settings, 'app_name', 'BookedBarber'),
                'business_phone': getattr(settings, 'business_phone', None) or getattr(settings, 'twilio_phone_number', 'us'),
                **kwargs
            }
            
            return template.format(**context)
            
        except Exception as e:
            logger.error(f"Error formatting generic response template {template_key}: {str(e)}")
            business_phone = getattr(settings, 'business_phone', None) or getattr(settings, 'twilio_phone_number', 'us')
            app_name = getattr(settings, 'app_name', 'BookedBarber')
            return f"Please call {business_phone} for assistance. - {app_name}"
    
    def _format_phone_for_search(self, phone: str) -> str:
        """Format phone number for database search"""
        # Remove all non-digit characters
        digits_only = ''.join(filter(str.isdigit, phone))
        
        # Return formatted versions for search
        if len(digits_only) == 10:
            return f'+1{digits_only}'
        elif len(digits_only) == 11 and digits_only.startswith('1'):
            return f'+{digits_only}'
        else:
            return phone
    
    def get_response_stats(self, db: Session, days: int = 30) -> Dict[str, Any]:
        """Get statistics about SMS responses"""
        # This would require additional tracking tables
        # For now, return basic stats
        return {
            'period_days': days,
            'keywords_supported': list(self.keywords.keys()),
            'response_templates': len(self.responses)
        }

# Singleton instance
sms_response_handler = SMSResponseHandler()