"""
Walk-in Queue Service for BookedBarber V2
Manages walk-in customers and integrates with appointment booking system
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import models
import logging
from services.redis_service import get_redis_client
from services.optimized_booking_service import get_optimized_booking_service
import json

logger = logging.getLogger(__name__)

class WalkInQueueService:
    """Manages walk-in customer queue for barbershops"""
    
    def __init__(self, db: Session):
        self.db = db
        self.redis_client = get_redis_client()
        self.booking_service = get_optimized_booking_service(db)
    
    def add_to_queue(
        self,
        name: str,
        phone: Optional[str] = None,
        preferred_barber_id: Optional[int] = None,
        service_type: str = "Haircut",
        estimated_duration: int = 30
    ) -> Dict[str, Any]:
        """Add a walk-in customer to the queue"""
        
        queue_entry = {
            'id': self._generate_queue_id(),
            'name': name,
            'phone': phone,
            'preferred_barber_id': preferred_barber_id,
            'service_type': service_type,
            'estimated_duration': estimated_duration,
            'added_at': datetime.now().isoformat(),
            'status': 'waiting',
            'estimated_wait_minutes': self._calculate_estimated_wait(preferred_barber_id, estimated_duration),
            'position': self._get_next_position()
        }
        
        # Store in Redis for real-time updates
        if self.redis_client:
            queue_key = f"walkin_queue:{queue_entry['id']}"
            self.redis_client.setex(queue_key, 14400, json.dumps(queue_entry))  # 4 hours
            
            # Add to active queue list
            self.redis_client.zadd(
                "active_walkin_queue", 
                {queue_entry['id']: queue_entry['added_at']}
            )
        
        logger.info(f"Added walk-in customer {name} to queue (ID: {queue_entry['id']})")
        return queue_entry
    
    def get_queue_status(self) -> List[Dict[str, Any]]:
        """Get current walk-in queue status"""
        
        if not self.redis_client:
            return []
        
        try:
            # Get all active queue entries
            queue_ids = self.redis_client.zrange("active_walkin_queue", 0, -1)
            queue_entries = []
            
            for queue_id in queue_ids:
                queue_key = f"walkin_queue:{queue_id.decode()}"
                entry_data = self.redis_client.get(queue_key)
                
                if entry_data:
                    entry = json.loads(entry_data)
                    # Update estimated wait time
                    entry['estimated_wait_minutes'] = self._calculate_estimated_wait(
                        entry.get('preferred_barber_id'),
                        entry.get('estimated_duration', 30)
                    )
                    queue_entries.append(entry)
            
            # Sort by position
            queue_entries.sort(key=lambda x: x.get('position', 0))
            return queue_entries
            
        except Exception as e:
            logger.error(f"Error getting queue status: {e}")
            return []
    
    def convert_to_appointment(
        self,
        queue_id: str,
        barber_id: int,
        user_id: Optional[int] = None
    ) -> Optional[models.Appointment]:
        """Convert a walk-in queue entry to an appointment"""
        
        if not self.redis_client:
            return None
        
        try:
            # Get queue entry
            queue_key = f"walkin_queue:{queue_id}"
            entry_data = self.redis_client.get(queue_key)
            
            if not entry_data:
                logger.warning(f"Queue entry {queue_id} not found")
                return None
            
            entry = json.loads(entry_data)
            
            # Find next available slot for the barber
            start_time = self._find_next_slot_for_barber(barber_id, entry['estimated_duration'])
            
            if not start_time:
                logger.warning(f"No available slots for barber {barber_id}")
                return None
            
            # Create appointment
            appointment = self.booking_service.create_appointment_optimized(
                user_id=user_id or self._create_guest_user(entry),
                barber_id=barber_id,
                start_time=start_time,
                duration_minutes=entry['estimated_duration'],
                service_name=entry['service_type'],
                notes=f"Walk-in converted from queue (ID: {queue_id})"
            )
            
            # Remove from queue
            self._remove_from_queue(queue_id)
            
            logger.info(f"Converted walk-in {queue_id} to appointment {appointment.id}")
            return appointment
            
        except Exception as e:
            logger.error(f"Error converting walk-in to appointment: {e}")
            return None
    
    def update_queue_position(self, queue_id: str, new_position: int) -> bool:
        """Update a customer's position in the queue"""
        
        if not self.redis_client:
            return False
        
        try:
            queue_key = f"walkin_queue:{queue_id}"
            entry_data = self.redis_client.get(queue_key)
            
            if entry_data:
                entry = json.loads(entry_data)
                entry['position'] = new_position
                self.redis_client.setex(queue_key, 14400, json.dumps(entry))
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating queue position: {e}")
            return False
    
    def remove_from_queue(self, queue_id: str, reason: str = "completed") -> bool:
        """Remove a customer from the walk-in queue"""
        return self._remove_from_queue(queue_id, reason)
    
    def get_barber_availability_with_walkins(self, barber_id: int) -> Dict[str, Any]:
        """Get barber availability considering both appointments and walk-in queue"""
        
        # Get scheduled appointments
        today = datetime.now().date()
        slots = self.booking_service.get_barber_availability_optimized(
            target_date=today,
            barber_id=barber_id
        )
        
        # Get walk-in queue for this barber
        queue_entries = [
            entry for entry in self.get_queue_status()
            if entry.get('preferred_barber_id') == barber_id or entry.get('preferred_barber_id') is None
        ]
        
        # Calculate realistic availability
        estimated_queue_time = sum(entry.get('estimated_duration', 30) for entry in queue_entries)
        
        return {
            'barber_id': barber_id,
            'scheduled_slots': len([s for s in slots if not s['available']]),
            'available_slots': len([s for s in slots if s['available']]),
            'walk_in_queue_count': len(queue_entries),
            'estimated_queue_time_minutes': estimated_queue_time,
            'next_available_appointment': self._find_next_slot_for_barber(barber_id, 30),
            'recommended_walk_in_wait': max(15, estimated_queue_time + 10)  # Minimum 15 min wait
        }
    
    def get_queue_analytics(self, days_back: int = 7) -> Dict[str, Any]:
        """Get analytics on walk-in queue performance"""
        
        # This would typically pull from a more persistent storage
        # For now, provide mock analytics based on current queue
        current_queue = self.get_queue_status()
        
        return {
            'current_queue_length': len(current_queue),
            'average_wait_time': sum(entry.get('estimated_wait_minutes', 0) for entry in current_queue) / max(len(current_queue), 1),
            'peak_hours': [10, 11, 12, 14, 15, 16],  # Typical barbershop peak hours
            'conversion_rate': 0.85,  # 85% of walk-ins typically convert to appointments
            'average_service_time': 30,
            'recommended_booking_buffer': 15  # Minutes to keep open for walk-ins
        }
    
    # Private helper methods
    
    def _generate_queue_id(self) -> str:
        """Generate a unique queue ID"""
        import uuid
        return f"walkin_{int(datetime.now().timestamp())}_{str(uuid.uuid4())[:8]}"
    
    def _get_next_position(self) -> int:
        """Get the next position in queue"""
        if not self.redis_client:
            return 1
        
        try:
            current_count = self.redis_client.zcard("active_walkin_queue")
            return current_count + 1
        except:
            return 1
    
    def _calculate_estimated_wait(self, preferred_barber_id: Optional[int], duration: int) -> int:
        """Calculate estimated wait time in minutes"""
        
        # Base wait time
        base_wait = 15  # Minimum 15 minutes
        
        # Get current queue ahead of this customer
        queue = self.get_queue_status()
        
        if preferred_barber_id:
            # Calculate wait for specific barber
            ahead_in_queue = [
                entry for entry in queue
                if (entry.get('preferred_barber_id') == preferred_barber_id or 
                    entry.get('preferred_barber_id') is None)
            ]
            queue_time = sum(entry.get('estimated_duration', 30) for entry in ahead_in_queue)
        else:
            # Any available barber - shorter wait
            queue_time = sum(entry.get('estimated_duration', 30) for entry in queue) // 3  # Assume 3 barbers
        
        # Factor in current appointments
        current_appointments = self._get_current_appointments()
        appointment_buffer = len(current_appointments) * 5  # 5 min buffer per appointment
        
        total_wait = base_wait + queue_time + appointment_buffer
        return min(total_wait, 120)  # Cap at 2 hours
    
    def _find_next_slot_for_barber(self, barber_id: int, duration: int) -> Optional[datetime]:
        """Find the next available slot for a specific barber"""
        
        # Look for slots starting from now
        now = datetime.now()
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        
        # Check next 4 hours for availability
        for hour_offset in range(4):
            check_time = current_hour + timedelta(hours=hour_offset)
            
            # Check 30-minute intervals
            for minute_offset in [0, 30]:
                slot_time = check_time + timedelta(minutes=minute_offset)
                
                # Skip past times
                if slot_time <= now:
                    continue
                
                # Check for conflicts
                conflicts = self.booking_service.check_slot_conflicts_optimized(
                    barber_id, slot_time, duration
                )
                
                if not conflicts:
                    return slot_time
        
        return None
    
    def _create_guest_user(self, queue_entry: Dict[str, Any]) -> int:
        """Create a guest user record for walk-in customers"""
        
        # Check if user already exists by phone
        if queue_entry.get('phone'):
            existing_user = self.db.query(models.User).filter(
                models.User.phone == queue_entry['phone']
            ).first()
            
            if existing_user:
                return existing_user.id
        
        # Create new guest user
        guest_user = models.User(
            email=f"guest_{queue_entry['id']}@bookedbarber.com",
            name=queue_entry['name'],
            phone=queue_entry.get('phone'),
            hashed_password="guest_user",  # Placeholder
            role="client",
            unified_role="client",
            is_active=True,
            created_at=datetime.now()
        )
        
        self.db.add(guest_user)
        self.db.commit()
        self.db.refresh(guest_user)
        
        return guest_user.id
    
    def _remove_from_queue(self, queue_id: str, reason: str = "completed") -> bool:
        """Internal method to remove from queue"""
        
        if not self.redis_client:
            return False
        
        try:
            # Remove from sorted set
            self.redis_client.zrem("active_walkin_queue", queue_id)
            
            # Remove individual entry
            queue_key = f"walkin_queue:{queue_id}"
            self.redis_client.delete(queue_key)
            
            # Log removal
            logger.info(f"Removed queue entry {queue_id} (reason: {reason})")
            return True
            
        except Exception as e:
            logger.error(f"Error removing from queue: {e}")
            return False
    
    def _get_current_appointments(self) -> List[models.Appointment]:
        """Get current ongoing appointments"""
        now = datetime.now()
        return self.db.query(models.Appointment).filter(
            models.Appointment.start_time <= now,
            func.datetime(
                models.Appointment.start_time, 
                '+' + func.cast(models.Appointment.duration_minutes, models.String) + ' minutes'
            ) > now,
            models.Appointment.status.in_(['confirmed', 'checked_in'])
        ).all()

# Factory function
def get_walkin_queue_service(db: Session) -> WalkInQueueService:
    """Get an instance of the walk-in queue service"""
    return WalkInQueueService(db)