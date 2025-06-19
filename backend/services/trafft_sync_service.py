"""
Trafft Sync Service - Handles webhook data processing and database sync
"""
import logging
from datetime import datetime
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from models.location import Location

logger = logging.getLogger(__name__)


class TrafftSyncService:
    """Service to sync Trafft webhook data with local database"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def process_appointment_webhook(self, webhook_data: Dict) -> Dict:
        """Process appointment webhook from Trafft"""
        try:
            # Parse dates and times
            start_datetime = self._parse_datetime(webhook_data.get("appointmentStartDateTime"))
            end_datetime = self._parse_datetime(webhook_data.get("appointmentEndDateTime"))
            
            # Find or create location
            location = await self._find_or_create_location(webhook_data)
            
            # Find or create barber (employee)
            barber = await self._find_or_create_barber(webhook_data, location.id if location else None)
            
            # Find or create client (customer)
            client = await self._find_or_create_client(webhook_data, barber.id if barber else None)
            
            # Find or create appointment
            appointment = await self._find_or_create_appointment(
                webhook_data, barber, client, start_datetime, end_datetime
            )
            
            # Commit all changes
            self.db.commit()
            
            return {
                "status": "success",
                "appointment_id": appointment.id,
                "trafft_id": appointment.trafft_appointment_id,
                "message": f"Appointment {webhook_data.get('appointmentStatus')} processed"
            }
            
        except Exception as e:
            logger.error(f"Error processing appointment webhook: {str(e)}")
            self.db.rollback()
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def _find_or_create_location(self, webhook_data: Dict) -> Optional[Location]:
        """Find or create location from webhook data"""
        location_name = webhook_data.get("locationName")
        if not location_name:
            return None
        
        # Try to find existing location
        location = self.db.query(Location).filter_by(name=location_name).first()
        
        if not location:
            location = Location(
                name=location_name,
                address=webhook_data.get("locationAddress"),
                phone=webhook_data.get("locationPhone"),
                is_active=True
            )
            self.db.add(location)
            self.db.flush()  # Get ID without committing
            logger.info(f"Created new location: {location_name}")
        
        return location
    
    async def _find_or_create_barber(self, webhook_data: Dict, location_id: Optional[int]) -> Optional[Barber]:
        """Find or create barber from webhook data"""
        employee_email = webhook_data.get("employeeEmail")
        employee_name = webhook_data.get("employeeFullName", "")
        
        if not employee_email:
            return None
        
        # Try to find by Trafft email or main email
        barber = self.db.query(Barber).filter(
            or_(
                Barber.email == employee_email,
                Barber.trafft_employee_email == employee_email
            )
        ).first()
        
        if not barber:
            # Parse name
            name_parts = employee_name.split(" ", 1)
            first_name = name_parts[0] if name_parts else "Unknown"
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            barber = Barber(
                email=employee_email,
                first_name=webhook_data.get("employeeFirstName", first_name),
                last_name=webhook_data.get("employeeLastName", last_name),
                phone=webhook_data.get("employeePhone"),
                trafft_employee_email=employee_email,
                is_active=True
            )
            
            if location_id:
                barber.location_id = location_id
            
            self.db.add(barber)
            self.db.flush()
            logger.info(f"Created new barber: {employee_name}")
        else:
            # Update Trafft email if not set
            if not barber.trafft_employee_email:
                barber.trafft_employee_email = employee_email
        
        return barber
    
    async def _find_or_create_client(self, webhook_data: Dict, barber_id: Optional[int]) -> Optional[Client]:
        """Find or create client from webhook data"""
        customer_email = webhook_data.get("customerEmail")
        customer_name = webhook_data.get("customerFullName", "")
        
        if not customer_email and not customer_name:
            return None
        
        # Try to find existing client
        if customer_email:
            client = self.db.query(Client).filter_by(
                email=customer_email
            ).first()
        else:
            # Try by name if no email
            client = self.db.query(Client).filter_by(
                first_name=webhook_data.get("customerFirstName"),
                last_name=webhook_data.get("customerLastName")
            ).first()
        
        if not client:
            client = Client(
                first_name=webhook_data.get("customerFirstName", "Unknown"),
                last_name=webhook_data.get("customerLastName", ""),
                email=customer_email,
                phone=webhook_data.get("customerPhone"),
                barber_id=barber_id or 1,  # Default to first barber if not found
                customer_type="new"
            )
            self.db.add(client)
            self.db.flush()
            logger.info(f"Created new client: {customer_name}")
        else:
            # Update client info if missing
            if not client.phone and webhook_data.get("customerPhone"):
                client.phone = webhook_data.get("customerPhone")
            
            # Update customer type to returning if they have appointments
            if client.total_visits > 0:
                client.customer_type = "returning"
        
        return client
    
    async def _find_or_create_appointment(
        self, 
        webhook_data: Dict, 
        barber: Optional[Barber], 
        client: Optional[Client],
        start_datetime: Optional[datetime],
        end_datetime: Optional[datetime]
    ) -> Appointment:
        """Find or create appointment from webhook data"""
        trafft_id = webhook_data.get("appointmentId")
        booking_uuid = webhook_data.get("bookingUuid")
        
        # Try to find existing appointment
        appointment = self.db.query(Appointment).filter(
            or_(
                Appointment.trafft_appointment_id == trafft_id,
                Appointment.trafft_booking_uuid == booking_uuid
            )
        ).first()
        
        # Parse price
        price_str = webhook_data.get("appointmentPrice", "$0.00")
        try:
            price = float(price_str.replace("$", "").replace(",", ""))
        except:
            price = 0.0
        
        # Parse duration
        duration_str = webhook_data.get("serviceDuration", "60min")
        try:
            duration = int(duration_str.replace("min", ""))
        except:
            duration = 60
        
        # Determine status
        status = "scheduled"
        if webhook_data.get("appointmentStatus") == "Canceled":
            status = "cancelled"
        elif webhook_data.get("appointmentStatus") == "Approved":
            status = "confirmed"
        
        if not appointment:
            # Create new appointment
            appointment = Appointment(
                trafft_appointment_id=trafft_id,
                trafft_booking_uuid=booking_uuid,
                barber_id=barber.id if barber else 1,
                client_id=client.id if client else 1,
                appointment_date=start_datetime.date() if start_datetime else datetime.now().date(),
                appointment_time=start_datetime,
                duration_minutes=duration,
                service_revenue=price,
                service_name=webhook_data.get("serviceName"),
                service_category=webhook_data.get("serviceCategory"),
                status=status,
                trafft_location_name=webhook_data.get("locationName"),
                trafft_sync_status="synced",
                trafft_last_sync=datetime.utcnow()
            )
            
            # Set customer type
            if client:
                appointment.customer_type = "new" if client.total_visits == 0 else "returning"
            
            self.db.add(appointment)
            logger.info(f"Created new appointment: {trafft_id}")
        else:
            # Update existing appointment
            appointment.status = status
            appointment.service_revenue = price
            appointment.trafft_last_sync = datetime.utcnow()
            
            # Update cancellation reason if cancelled
            if status == "cancelled" and webhook_data.get("reasonForCanceling"):
                appointment.notes = f"Cancellation reason: {webhook_data.get('reasonForCanceling')}"
            
            logger.info(f"Updated appointment: {trafft_id}")
        
        # Update client statistics
        if client and status != "cancelled":
            self._update_client_statistics(client)
        
        return appointment
    
    def _update_client_statistics(self, client: Client):
        """Update client visit statistics"""
        # Count total visits
        total_visits = self.db.query(Appointment).filter_by(
            client_id=client.id,
            status="completed"
        ).count()
        
        # Calculate total spent
        total_spent = self.db.query(Appointment).filter_by(
            client_id=client.id,
            status="completed"
        ).with_entities(
            Appointment.service_revenue + Appointment.tip_amount + Appointment.product_revenue
        ).scalar() or 0
        
        client.total_visits = total_visits
        client.total_spent = float(total_spent)
        client.average_ticket = float(total_spent) / total_visits if total_visits > 0 else 0
    
    def _parse_datetime(self, datetime_str: str) -> Optional[datetime]:
        """Parse Trafft datetime string to Python datetime"""
        if not datetime_str:
            return None
        
        # Trafft format: "June 20, 2025 5:30 pm"
        try:
            return datetime.strptime(datetime_str, "%B %d, %Y %I:%M %p")
        except:
            try:
                # Try alternative format
                return datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
            except:
                logger.error(f"Failed to parse datetime: {datetime_str}")
                return None

    async def process_customer_webhook(self, webhook_data: Dict) -> Dict:
        """Process customer creation webhook from Trafft"""
        try:
            # For now, we handle customers during appointment creation
            # This method is here for future customer-only webhooks
            logger.info(f"Customer webhook received: {webhook_data}")
            
            return {
                "status": "success",
                "message": "Customer webhook processed"
            }
            
        except Exception as e:
            logger.error(f"Error processing customer webhook: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }