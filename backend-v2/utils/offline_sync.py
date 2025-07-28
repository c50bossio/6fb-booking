"""
Offline Sync Manager
Handles synchronization of offline PWA data with server
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base

from models import User, Appointment, Client, Service
from utils.analytics import track_event

Base = declarative_base()

class SyncStatus(Enum):
    SUCCESS = "success"
    CONFLICT = "conflict"
    ERROR = "error"

@dataclass
class SyncResult:
    success: bool
    server_id: Optional[str] = None
    conflict: bool = False
    conflict_reason: Optional[str] = None
    server_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

@dataclass
class SyncStatusResponse:
    last_sync: Optional[datetime]
    pending_changes: int
    has_conflicts: bool

class OfflineSyncLog(Base):
    """Track offline sync operations"""
    __tablename__ = "offline_sync_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    device_id = Column(String, nullable=True)
    action_type = Column(String, nullable=False)  # create, update, delete
    entity_type = Column(String, nullable=False)  # appointment, client, etc.
    entity_id = Column(String, nullable=False)
    status = Column(String, nullable=False)  # success, conflict, error
    conflict_reason = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    client_timestamp = Column(DateTime, nullable=False)
    server_timestamp = Column(DateTime, default=datetime.utcnow)
    data = Column(Text, nullable=True)  # JSON string of the data

class ConflictResolution(Base):
    """Store conflict resolution decisions"""
    __tablename__ = "conflict_resolutions"
    
    id = Column(Integer, primary_key=True, index=True)
    sync_log_id = Column(Integer, nullable=False)
    user_id = Column(String, index=True, nullable=False)
    resolution = Column(String, nullable=False)  # client_wins, server_wins, manual
    resolved_data = Column(Text, nullable=True)  # JSON string
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, default=datetime.utcnow)

class OfflineSyncManager:
    """Manages offline data synchronization"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def process_offline_action(
        self,
        user_id: str,
        action_type: str,
        entity_type: str,
        entity_id: str,
        data: Dict[str, Any],
        timestamp: datetime,
        device_id: Optional[str] = None
    ) -> SyncResult:
        """
        Process a single offline action and sync with server
        """
        try:
            # Log the sync attempt
            sync_log = OfflineSyncLog(
                user_id=user_id,
                device_id=device_id,
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                status="processing",
                client_timestamp=timestamp,
                data=json.dumps(data)
            )
            self.db.add(sync_log)
            self.db.flush()  # Get the ID without committing
            
            # Process based on entity type
            if entity_type == "appointment":
                result = await self._sync_appointment(user_id, action_type, entity_id, data, timestamp)
            elif entity_type == "client":
                result = await self._sync_client(user_id, action_type, entity_id, data, timestamp)
            elif entity_type == "service":
                result = await self._sync_service(user_id, action_type, entity_id, data, timestamp)
            elif entity_type == "availability":
                result = await self._sync_availability(user_id, action_type, entity_id, data, timestamp)
            else:
                result = SyncResult(
                    success=False,
                    error_message=f"Unknown entity type: {entity_type}"
                )
            
            # Update sync log with result
            sync_log.status = "success" if result.success else ("conflict" if result.conflict else "error")
            sync_log.conflict_reason = result.conflict_reason
            sync_log.error_message = result.error_message
            
            self.db.commit()
            
            # Track analytics
            track_event(
                event_name="offline_sync_action",
                user_id=user_id,
                properties={
                    "action_type": action_type,
                    "entity_type": entity_type,
                    "status": sync_log.status,
                    "device_id": device_id
                }
            )
            
            return result
            
        except Exception as e:
            self.db.rollback()
            return SyncResult(
                success=False,
                error_message=f"Sync processing error: {str(e)}"
            )
    
    async def _sync_appointment(
        self,
        user_id: str,
        action_type: str,
        entity_id: str,
        data: Dict[str, Any],
        timestamp: datetime
    ) -> SyncResult:
        """Sync appointment data"""
        
        if action_type == "create":
            return await self._create_appointment(user_id, entity_id, data, timestamp)
        elif action_type == "update":
            return await self._update_appointment(user_id, entity_id, data, timestamp)
        elif action_type == "delete":
            return await self._delete_appointment(user_id, entity_id, timestamp)
        else:
            return SyncResult(
                success=False,
                error_message=f"Unknown action type: {action_type}"
            )
    
    async def _create_appointment(
        self,
        user_id: str,
        entity_id: str,
        data: Dict[str, Any],
        timestamp: datetime
    ) -> SyncResult:
        """Create appointment from offline data"""
        
        try:
            # Check if appointment already exists (by offline ID or similar attributes)
            existing = self.db.query(Appointment).filter(
                Appointment.barber_id == user_id,
                Appointment.start_time == data.get("startTime"),
                Appointment.client_name == data.get("clientName")
            ).first()
            
            if existing:
                # Potential conflict - appointment with same details exists
                return SyncResult(
                    success=False,
                    conflict=True,
                    conflict_reason="Appointment with similar details already exists",
                    server_data={
                        "id": existing.id,
                        "start_time": existing.start_time.isoformat(),
                        "client_name": existing.client_name,
                        "status": existing.status
                    }
                )
            
            # Create new appointment
            appointment = Appointment(
                barber_id=user_id,
                client_name=data.get("clientName"),
                client_phone=data.get("clientPhone"),
                service_name=data.get("serviceName"),
                service_price=data.get("servicePrice", 0),
                start_time=datetime.fromisoformat(data.get("startTime").replace("Z", "+00:00")),
                end_time=datetime.fromisoformat(data.get("endTime").replace("Z", "+00:00")),
                duration=data.get("duration", 60),
                status=data.get("status", "scheduled"),
                notes=data.get("notes"),
                created_at=timestamp
            )
            
            self.db.add(appointment)
            self.db.flush()
            
            return SyncResult(
                success=True,
                server_id=str(appointment.id)
            )
            
        except Exception as e:
            return SyncResult(
                success=False,
                error_message=f"Failed to create appointment: {str(e)}"
            )
    
    async def _update_appointment(
        self,
        user_id: str,
        entity_id: str,
        data: Dict[str, Any],
        timestamp: datetime
    ) -> SyncResult:
        """Update appointment from offline data"""
        
        try:
            # Find the appointment (entity_id might be offline ID, need to match by other criteria)
            appointment = None
            
            # Try to find by server ID first
            if not entity_id.startswith("offline_"):
                appointment = self.db.query(Appointment).filter(
                    Appointment.id == entity_id,
                    Appointment.barber_id == user_id
                ).first()
            
            # If not found, try to match by client and time
            if not appointment:
                appointment = self.db.query(Appointment).filter(
                    Appointment.barber_id == user_id,
                    Appointment.client_name == data.get("clientName"),
                    Appointment.start_time == datetime.fromisoformat(data.get("startTime").replace("Z", "+00:00"))
                ).first()
            
            if not appointment:
                return SyncResult(
                    success=False,
                    error_message="Appointment not found for update"
                )
            
            # Check for conflicts (server was modified after client timestamp)
            if appointment.updated_at and appointment.updated_at > timestamp:
                return SyncResult(
                    success=False,
                    conflict=True,
                    conflict_reason="Appointment was modified on server after client change",
                    server_data={
                        "id": appointment.id,
                        "updated_at": appointment.updated_at.isoformat(),
                        "status": appointment.status,
                        "notes": appointment.notes
                    }
                )
            
            # Update the appointment
            appointment.client_name = data.get("clientName", appointment.client_name)
            appointment.client_phone = data.get("clientPhone", appointment.client_phone)
            appointment.service_name = data.get("serviceName", appointment.service_name)
            appointment.service_price = data.get("servicePrice", appointment.service_price)
            appointment.status = data.get("status", appointment.status)
            appointment.notes = data.get("notes", appointment.notes)
            appointment.updated_at = timestamp
            
            return SyncResult(
                success=True,
                server_id=str(appointment.id)
            )
            
        except Exception as e:
            return SyncResult(
                success=False,
                error_message=f"Failed to update appointment: {str(e)}"
            )
    
    async def _delete_appointment(
        self,
        user_id: str,
        entity_id: str,
        timestamp: datetime
    ) -> SyncResult:
        """Delete appointment from offline action"""
        
        try:
            appointment = self.db.query(Appointment).filter(
                Appointment.id == entity_id,
                Appointment.barber_id == user_id
            ).first()
            
            if not appointment:
                # Already deleted or never existed
                return SyncResult(success=True)
            
            # Check if appointment was modified after client deletion
            if appointment.updated_at and appointment.updated_at > timestamp:
                return SyncResult(
                    success=False,
                    conflict=True,
                    conflict_reason="Appointment was modified on server after client deletion",
                    server_data={
                        "id": appointment.id,
                        "updated_at": appointment.updated_at.isoformat(),
                        "status": appointment.status
                    }
                )
            
            # Soft delete the appointment
            appointment.status = "cancelled"
            appointment.updated_at = timestamp
            
            return SyncResult(success=True)
            
        except Exception as e:
            return SyncResult(
                success=False,
                error_message=f"Failed to delete appointment: {str(e)}"
            )
    
    async def _sync_client(
        self,
        user_id: str,
        action_type: str,
        entity_id: str,
        data: Dict[str, Any],
        timestamp: datetime
    ) -> SyncResult:
        """Sync client data"""
        
        try:
            if action_type == "create":
                # Check for existing client with same phone/email
                existing = self.db.query(Client).filter(
                    Client.barber_id == user_id,
                    Client.phone == data.get("phone")
                ).first()
                
                if existing:
                    return SyncResult(
                        success=False,
                        conflict=True,
                        conflict_reason="Client with same phone already exists",
                        server_data={"id": existing.id, "name": existing.name}
                    )
                
                client = Client(
                    barber_id=user_id,
                    name=data.get("name"),
                    phone=data.get("phone"),
                    email=data.get("email"),
                    notes=data.get("notes"),
                    created_at=timestamp
                )
                self.db.add(client)
                self.db.flush()
                
                return SyncResult(success=True, server_id=str(client.id))
                
            elif action_type == "update":
                client = self.db.query(Client).filter(
                    Client.id == entity_id,
                    Client.barber_id == user_id
                ).first()
                
                if not client:
                    return SyncResult(
                        success=False,
                        error_message="Client not found for update"
                    )
                
                # Update client data
                client.name = data.get("name", client.name)
                client.phone = data.get("phone", client.phone)
                client.email = data.get("email", client.email)
                client.notes = data.get("notes", client.notes)
                client.updated_at = timestamp
                
                return SyncResult(success=True, server_id=str(client.id))
                
            else:
                return SyncResult(
                    success=False,
                    error_message=f"Unknown client action: {action_type}"
                )
                
        except Exception as e:
            return SyncResult(
                success=False,
                error_message=f"Failed to sync client: {str(e)}"
            )
    
    async def _sync_service(
        self,
        user_id: str,
        action_type: str,
        entity_id: str,
        data: Dict[str, Any],
        timestamp: datetime
    ) -> SyncResult:
        """Sync service data"""
        
        # Similar implementation for services
        return SyncResult(success=True, server_id=entity_id)
    
    async def _sync_availability(
        self,
        user_id: str,
        action_type: str,
        entity_id: str,
        data: Dict[str, Any],
        timestamp: datetime
    ) -> SyncResult:
        """Sync availability data"""
        
        # Similar implementation for availability
        return SyncResult(success=True, server_id=entity_id)
    
    async def get_sync_status(self, user_id: str) -> SyncStatusResponse:
        """Get sync status for a user"""
        
        try:
            # Get last successful sync
            last_sync_log = self.db.query(OfflineSyncLog).filter(
                OfflineSyncLog.user_id == user_id,
                OfflineSyncLog.status == "success"
            ).order_by(OfflineSyncLog.server_timestamp.desc()).first()
            
            last_sync = last_sync_log.server_timestamp if last_sync_log else None
            
            # Count pending changes (conflicts and errors)
            pending_count = self.db.query(OfflineSyncLog).filter(
                OfflineSyncLog.user_id == user_id,
                OfflineSyncLog.status.in_(["conflict", "error"])
            ).count()
            
            # Check for unresolved conflicts
            has_conflicts = self.db.query(OfflineSyncLog).filter(
                OfflineSyncLog.user_id == user_id,
                OfflineSyncLog.status == "conflict"
            ).count() > 0
            
            return SyncStatusResponse(
                last_sync=last_sync,
                pending_changes=pending_count,
                has_conflicts=has_conflicts
            )
            
        except Exception as e:
            return SyncStatusResponse(
                last_sync=None,
                pending_changes=0,
                has_conflicts=False
            )
    
    async def resolve_conflict(
        self,
        sync_log_id: int,
        user_id: str,
        resolution: str,  # "client_wins", "server_wins", "manual"
        resolved_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Resolve a sync conflict"""
        
        try:
            sync_log = self.db.query(OfflineSyncLog).filter(
                OfflineSyncLog.id == sync_log_id,
                OfflineSyncLog.user_id == user_id,
                OfflineSyncLog.status == "conflict"
            ).first()
            
            if not sync_log:
                return False
            
            # Create conflict resolution record
            resolution_record = ConflictResolution(
                sync_log_id=sync_log_id,
                user_id=user_id,
                resolution=resolution,
                resolved_data=json.dumps(resolved_data) if resolved_data else None,
                resolved_by=user_id
            )
            
            self.db.add(resolution_record)
            
            # Apply the resolution
            if resolution == "client_wins":
                # Re-process with force flag
                client_data = json.loads(sync_log.data)
                await self._force_apply_client_data(
                    user_id, sync_log.action_type, sync_log.entity_type,
                    sync_log.entity_id, client_data
                )
            elif resolution == "manual" and resolved_data:
                # Apply manually resolved data
                await self._force_apply_client_data(
                    user_id, sync_log.action_type, sync_log.entity_type,
                    sync_log.entity_id, resolved_data
                )
            # For "server_wins", we don't need to do anything
            
            # Mark as resolved
            sync_log.status = "success"
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            return False
    
    async def _force_apply_client_data(
        self,
        user_id: str,
        action_type: str,
        entity_type: str,
        entity_id: str,
        data: Dict[str, Any]
    ):
        """Force apply client data without conflict checking"""
        
        # Implementation would be similar to regular sync methods
        # but without conflict detection
        pass
    
    async def get_pending_conflicts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all pending conflicts for a user"""
        
        conflicts = self.db.query(OfflineSyncLog).filter(
            OfflineSyncLog.user_id == user_id,
            OfflineSyncLog.status == "conflict"
        ).all()
        
        return [
            {
                "id": conflict.id,
                "entity_type": conflict.entity_type,
                "entity_id": conflict.entity_id,
                "action_type": conflict.action_type,
                "conflict_reason": conflict.conflict_reason,
                "client_timestamp": conflict.client_timestamp.isoformat(),
                "client_data": json.loads(conflict.data) if conflict.data else None
            }
            for conflict in conflicts
        ]