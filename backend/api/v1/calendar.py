"""
Comprehensive Calendar API
Includes appointments, availability, Google Calendar integration, and real-time updates
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date, time
from pydantic import BaseModel, Field, validator
import json
import logging

from config.database import get_db
from models import (
    User, Barber, Service, ServiceCategory, BarberAvailability,
    Location, Client, Appointment, BookingRule, DayOfWeek, Review
)
from api.v1.auth import get_current_user
from services.google_calendar_service import google_calendar_service
from services.rbac_service import RBACService, Permission
from utils.logging import log_user_action
from .endpoints import google_calendar_oauth

logger = logging.getLogger(__name__)
router = APIRouter()

# Include Google Calendar OAuth routes
router.include_router(
    google_calendar_oauth.router,
    prefix="/oauth",
    tags=["Google Calendar OAuth"]
)

# Pydantic models for API responses
class CalendarEvent(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start: datetime
    end: datetime
    all_day: bool = False
    type: str  # 'appointment', 'availability', 'blocked', 'break'
    status: str
    color: Optional[str] = None
    background_color: Optional[str] = None
    border_color: Optional[str] = None
    text_color: Optional[str] = None
    editable: bool = True
    deletable: bool = True
    
    # Appointment-specific data
    appointment_id: Optional[int] = None
    barber_id: Optional[int] = None
    barber_name: Optional[str] = None
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    service_duration: Optional[int] = None
    service_price: Optional[float] = None
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    notes: Optional[str] = None
    confirmation_number: Optional[str] = None
    payment_status: Optional[str] = None
    source: Optional[str] = None
    google_calendar_event_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class CalendarFilters(BaseModel):
    barber_ids: Optional[List[int]] = None
    location_ids: Optional[List[int]] = None
    service_ids: Optional[List[int]] = None
    statuses: Optional[List[str]] = None
    types: Optional[List[str]] = None
    client_search: Optional[str] = None

class AvailabilitySlot(BaseModel):
    date: str
    start_time: str
    end_time: str
    available: bool
    barber_id: int
    barber_name: str
    reason: Optional[str] = None
    conflicts_with: Optional[List[str]] = None

class CalendarStats(BaseModel):
    total_appointments: int
    confirmed_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    no_shows: int
    total_revenue: float
    average_service_time: float
    utilization_rate: float
    date_range: Dict[str, str]

class AppointmentCreate(BaseModel):
    barber_id: int
    service_id: Optional[int] = None
    client_id: Optional[int] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    appointment_date: date
    appointment_time: time
    service_name: str
    service_duration: int = 60
    service_price: float
    notes: Optional[str] = None
    send_confirmation: bool = True
    sync_to_google_calendar: bool = True

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    service_name: Optional[str] = None
    service_duration: Optional[int] = None
    service_price: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    barber_id: Optional[int] = None
    sync_to_google_calendar: Optional[bool] = True

# Helper functions
def get_event_color(status: str, event_type: str) -> Dict[str, str]:
    """Get color scheme for calendar events"""
    if event_type == 'appointment':
        colors = {
            'scheduled': {'background': '#3b82f6', 'border': '#2563eb', 'text': '#ffffff'},
            'confirmed': {'background': '#10b981', 'border': '#059669', 'text': '#ffffff'},
            'completed': {'background': '#6b7280', 'border': '#4b5563', 'text': '#ffffff'},
            'cancelled': {'background': '#ef4444', 'border': '#dc2626', 'text': '#ffffff'},
            'no_show': {'background': '#f59e0b', 'border': '#d97706', 'text': '#ffffff'},
        }
        return colors.get(status, colors['scheduled'])
    elif event_type == 'availability':
        return {'background': '#10b981', 'border': '#059669', 'text': '#ffffff'}
    elif event_type == 'blocked':
        return {'background': '#ef4444', 'border': '#dc2626', 'text': '#ffffff'}
    else:
        return {'background': '#6b7280', 'border': '#4b5563', 'text': '#ffffff'}

def convert_appointment_to_event(appointment: Appointment) -> CalendarEvent:
    """Convert appointment model to calendar event"""
    # Calculate end time
    start_dt = datetime.combine(
        appointment.appointment_date,
        appointment.appointment_time.time() if appointment.appointment_time else time(9, 0)
    )
    duration = appointment.duration_minutes or 60
    end_dt = start_dt + timedelta(minutes=duration)
    
    colors = get_event_color(appointment.status, 'appointment')
    
    return CalendarEvent(
        id=f"appointment_{appointment.id}",
        title=f"{appointment.service_name} - {appointment.client.full_name if appointment.client else 'Unknown'}",
        description=f"Service: {appointment.service_name}\nClient: {appointment.client.full_name if appointment.client else 'Unknown'}\nPrice: ${appointment.service_revenue or 0}",
        start=start_dt,
        end=end_dt,
        all_day=False,
        type='appointment',
        status=appointment.status,
        color=colors['background'],
        background_color=colors['background'],
        border_color=colors['border'],
        text_color=colors['text'],
        editable=appointment.status in ['scheduled', 'confirmed'],
        deletable=appointment.status == 'scheduled',
        appointment_id=appointment.id,
        barber_id=appointment.barber_id,
        barber_name=f"{appointment.barber.first_name} {appointment.barber.last_name}" if appointment.barber else None,
        client_id=appointment.client_id,
        client_name=appointment.client.full_name if appointment.client else None,
        client_email=appointment.client.email if appointment.client else None,
        client_phone=appointment.client.phone if appointment.client else None,
        service_name=appointment.service_name,
        service_duration=duration,
        service_price=appointment.service_revenue,
        location_id=appointment.barber.location_id if appointment.barber else None,
        location_name=appointment.barber.location.name if appointment.barber and appointment.barber.location else None,
        notes=appointment.barber_notes,
        payment_status=appointment.payment_status,
        source=appointment.booking_source,
        google_calendar_event_id=appointment.google_calendar_event_id
    )

async def sync_appointment_to_google_calendar(appointment: Appointment, action: str, db: Session):
    """Background task to sync appointment with Google Calendar"""
    try:
        if hasattr(appointment, 'sync_to_google_calendar') and not appointment.sync_to_google_calendar:
            return
        
        event_id = google_calendar_service.sync_appointment(appointment, action)
        
        if event_id and action == 'create':
            # Update appointment with Google Calendar event ID
            appointment.google_calendar_event_id = event_id
            db.commit()
            
        logger.info(f"Synced appointment {appointment.id} to Google Calendar: {action}")
        
    except Exception as e:
        logger.error(f"Failed to sync appointment {appointment.id} to Google Calendar: {str(e)}")

# API Endpoints

@router.get("/events", response_model=List[CalendarEvent])
async def get_calendar_events(
    start_date: date = Query(..., description="Start date for calendar view"),
    end_date: date = Query(..., description="End date for calendar view"),
    barber_ids: Optional[str] = Query(None, description="Comma-separated barber IDs"),
    location_ids: Optional[str] = Query(None, description="Comma-separated location IDs"),
    service_ids: Optional[str] = Query(None, description="Comma-separated service IDs"),
    statuses: Optional[str] = Query(None, description="Comma-separated appointment statuses"),
    types: Optional[str] = Query(None, description="Comma-separated event types"),
    client_search: Optional[str] = Query(None, description="Search client name or email"),
    include_google_calendar: bool = Query(False, description="Include Google Calendar events"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get calendar events (appointments, availability, blocks) for specified date range"""
    
    # Parse filter parameters
    filters = CalendarFilters(
        barber_ids=[int(x.strip()) for x in barber_ids.split(',')] if barber_ids else None,
        location_ids=[int(x.strip()) for x in location_ids.split(',')] if location_ids else None,
        service_ids=[int(x.strip()) for x in service_ids.split(',')] if service_ids else None,
        statuses=statuses.split(',') if statuses else None,
        types=types.split(',') if types else None,
        client_search=client_search
    )
    
    # Check permissions and apply access control
    rbac = RBACService(db)
    query = db.query(Appointment).options(
        joinedload(Appointment.barber),
        joinedload(Appointment.client)
    )
    
    # Date range filter
    query = query.filter(
        and_(
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date
        )
    )
    
    # Apply permission-based filtering
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if filters.location_ids:
                # Intersection of requested and accessible locations
                allowed_locations = list(set(filters.location_ids) & set(accessible_locations))
                if not allowed_locations:
                    return []
                filters.location_ids = allowed_locations
            else:
                filters.location_ids = accessible_locations
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            # Only own appointments
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                filters.barber_ids = [barber.id]
            else:
                return []
        else:
            return []
    
    # Apply filters
    if filters.barber_ids:
        query = query.filter(Appointment.barber_id.in_(filters.barber_ids))
    
    if filters.location_ids:
        barber_ids_in_locations = db.query(Barber.id).filter(
            Barber.location_id.in_(filters.location_ids)
        ).subquery()
        query = query.filter(Appointment.barber_id.in_(barber_ids_in_locations))
    
    if filters.service_ids:
        # This would need a service relationship in the Appointment model
        pass
    
    if filters.statuses:
        query = query.filter(Appointment.status.in_(filters.statuses))
    
    if filters.client_search:
        query = query.join(Client).filter(
            or_(
                Client.first_name.ilike(f"%{filters.client_search}%"),
                Client.last_name.ilike(f"%{filters.client_search}%"),
                Client.email.ilike(f"%{filters.client_search}%")
            )
        )
    
    # Get appointments
    appointments = query.order_by(
        Appointment.appointment_date,
        Appointment.appointment_time
    ).all()
    
    # Convert to calendar events
    events = [convert_appointment_to_event(appointment) for appointment in appointments]
    
    # Filter by event types if specified
    if filters.types:
        events = [event for event in events if event.type in filters.types]
    
    # Include Google Calendar events if requested and user has a connected calendar
    if include_google_calendar:
        try:
            # Get user's barber profile
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber and google_calendar_service.is_connected(barber.id):
                google_events = google_calendar_service.get_calendar_events(
                    barber_id=barber.id,
                    start_date=datetime.combine(start_date, time.min),
                    end_date=datetime.combine(end_date, time.max)
                )
                
                # Convert Google Calendar events to CalendarEvent format
                for g_event in google_events:
                    if 'start' in g_event and 'end' in g_event:
                        # Parse Google Calendar event
                        start_str = g_event['start'].get('dateTime', g_event['start'].get('date'))
                        end_str = g_event['end'].get('dateTime', g_event['end'].get('date'))
                        
                        if start_str and end_str:
                            try:
                                start_dt = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                                end_dt = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                                
                                # Skip events that are already synced from our system
                                event_summary = g_event.get('summary', '')
                                if not any(event_summary in event.title for event in events):
                                    events.append(CalendarEvent(
                                        id=f"google_{g_event['id']}",
                                        title=event_summary,
                                        description=g_event.get('description', ''),
                                        start=start_dt,
                                        end=end_dt,
                                        all_day='date' in g_event['start'],
                                        type='external',
                                        status='confirmed',
                                        color='#4285f4',
                                        background_color='#4285f4',
                                        border_color='#1a73e8',
                                        text_color='#ffffff',
                                        editable=False,
                                        deletable=False
                                    ))
                            except ValueError as e:
                                logger.warning(f"Could not parse Google Calendar event time: {e}")
                                
        except Exception as e:
            logger.error(f"Error fetching Google Calendar events: {str(e)}")
    
    # Sort events by start time
    events.sort(key=lambda x: x.start)
    
    return events

@router.get("/availability/{barber_id}")
async def get_barber_availability(
    barber_id: int,
    date: date = Query(..., description="Date to check availability"),
    service_id: Optional[int] = Query(None, description="Service ID for duration"),
    duration: Optional[int] = Query(None, description="Custom duration in minutes"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available time slots for a barber on a specific date"""
    
    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    # Get service duration
    service_duration = duration or 60
    if service_id:
        service = db.query(Service).filter(Service.id == service_id).first()
        if service:
            service_duration = service.duration_minutes
    
    # Get barber's availability for the day
    day_of_week = date.weekday()  # 0 = Monday
    availability = db.query(BarberAvailability).filter(
        and_(
            BarberAvailability.barber_id == barber_id,
            BarberAvailability.day_of_week == DayOfWeek(day_of_week),
            BarberAvailability.is_available == True
        )
    ).filter(
        or_(
            BarberAvailability.effective_from == None,
            BarberAvailability.effective_from <= date
        )
    ).filter(
        or_(
            BarberAvailability.effective_until == None,
            BarberAvailability.effective_until >= date
        )
    ).first()
    
    if not availability:
        return {
            "barber_id": barber_id,
            "date": date.isoformat(),
            "available_slots": [],
            "message": "No availability schedule found for this day"
        }
    
    # Get existing appointments
    existing_appointments = db.query(Appointment).filter(
        and_(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date == date,
            Appointment.status.in_(['scheduled', 'confirmed', 'in_progress'])
        )
    ).all()
    
    # Generate available slots
    slots = []
    slot_duration = 15  # 15-minute intervals
    
    # Convert to minutes for easier calculation
    start_minutes = availability.start_time.hour * 60 + availability.start_time.minute
    end_minutes = availability.end_time.hour * 60 + availability.end_time.minute
    
    # Break time
    break_start_minutes = None
    break_end_minutes = None
    if availability.break_start and availability.break_end:
        break_start_minutes = availability.break_start.hour * 60 + availability.break_start.minute
        break_end_minutes = availability.break_end.hour * 60 + availability.break_end.minute
    
    current_minutes = start_minutes
    while current_minutes + service_duration <= end_minutes:
        # Convert back to time
        slot_hour = current_minutes // 60
        slot_minute = current_minutes % 60
        slot_time = time(slot_hour, slot_minute)
        
        # Check if this slot conflicts with break time
        if break_start_minutes and break_end_minutes:
            if current_minutes < break_end_minutes and current_minutes + service_duration > break_start_minutes:
                current_minutes += slot_duration
                continue
        
        # Check conflicts with existing appointments
        is_available = True
        conflicts_with = []
        
        for appointment in existing_appointments:
            apt_start_minutes = appointment.appointment_time.hour * 60 + appointment.appointment_time.minute
            apt_duration = appointment.duration_minutes or 60
            apt_end_minutes = apt_start_minutes + apt_duration
            
            # Check for overlap
            if current_minutes < apt_end_minutes and current_minutes + service_duration > apt_start_minutes:
                is_available = False
                conflicts_with.append(f"appointment_{appointment.id}")
        
        slots.append(AvailabilitySlot(
            date=date.isoformat(),
            start_time=slot_time.strftime("%H:%M"),
            end_time=(datetime.combine(date, slot_time) + timedelta(minutes=service_duration)).time().strftime("%H:%M"),
            available=is_available,
            barber_id=barber_id,
            barber_name=f"{barber.first_name} {barber.last_name}",
            reason="Already booked" if not is_available else None,
            conflicts_with=conflicts_with if conflicts_with else None
        ))
        
        current_minutes += slot_duration
    
    return {
        "barber_id": barber_id,
        "barber_name": f"{barber.first_name} {barber.last_name}",
        "date": date.isoformat(),
        "service_duration": service_duration,
        "available_slots": [slot for slot in slots if slot.available],
        "all_slots": slots,
        "total_slots": len(slots),
        "available_count": len([slot for slot in slots if slot.available])
    }

@router.post("/appointments", response_model=CalendarEvent)
async def create_appointment(
    appointment_data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new appointment with optional Google Calendar sync"""
    
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or appointment_data.barber_id != barber.id:
                raise HTTPException(
                    status_code=403,
                    detail="Can only create appointments for yourself"
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="No permission to create appointments"
            )
    
    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == appointment_data.barber_id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    # Get or create client
    client = None
    if appointment_data.client_id:
        client = db.query(Client).filter(Client.id == appointment_data.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    else:
        # Check if client exists by email or phone
        if appointment_data.client_email:
            client = db.query(Client).filter(Client.email == appointment_data.client_email).first()
        elif appointment_data.client_phone:
            client = db.query(Client).filter(Client.phone == appointment_data.client_phone).first()
        
        if not client:
            # Create new client
            client = Client(
                first_name=appointment_data.client_name.split()[0] if appointment_data.client_name else "Guest",
                last_name=" ".join(appointment_data.client_name.split()[1:]) if appointment_data.client_name and len(appointment_data.client_name.split()) > 1 else "",
                email=appointment_data.client_email,
                phone=appointment_data.client_phone,
                barber_id=appointment_data.barber_id,
                location_id=barber.location_id
            )
            db.add(client)
            db.commit()
            db.refresh(client)
    
    # Create appointment
    appointment = Appointment(
        barber_id=appointment_data.barber_id,
        client_id=client.id,
        appointment_date=appointment_data.appointment_date,
        appointment_time=datetime.combine(appointment_data.appointment_date, appointment_data.appointment_time),
        duration_minutes=appointment_data.service_duration,
        service_name=appointment_data.service_name,
        service_revenue=appointment_data.service_price,
        status='scheduled',
        customer_type='new' if not client else 'returning',
        booking_source='platform',
        barber_notes=appointment_data.notes
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Schedule Google Calendar sync if enabled
    if appointment_data.sync_to_google_calendar:
        background_tasks.add_task(
            sync_appointment_to_google_calendar,
            appointment,
            'create',
            db
        )
    
    # Log action
    log_user_action(
        action="appointment_created",
        user_id=current_user.id,
        details={
            "appointment_id": appointment.id,
            "barber_id": appointment.barber_id,
            "client_id": appointment.client_id,
            "date": appointment.appointment_date.isoformat(),
            "service": appointment.service_name
        }
    )
    
    # Convert to calendar event and return
    return convert_appointment_to_event(appointment)

@router.put("/appointments/{appointment_id}", response_model=CalendarEvent)
async def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing appointment"""
    
    # Get appointment
    appointment = db.query(Appointment).options(
        joinedload(Appointment.barber),
        joinedload(Appointment.client)
    ).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or appointment.barber_id != barber.id:
                raise HTTPException(
                    status_code=403,
                    detail="Can only update your own appointments"
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="No permission to update appointments"
            )
    
    # Update fields
    update_data = appointment_data.dict(exclude_unset=True)
    
    # Handle special fields
    if 'appointment_date' in update_data and 'appointment_time' in update_data:
        appointment.appointment_time = datetime.combine(
            update_data['appointment_date'],
            update_data['appointment_time']
        )
        del update_data['appointment_date']
        del update_data['appointment_time']
    elif 'appointment_date' in update_data:
        current_time = appointment.appointment_time.time() if appointment.appointment_time else time(9, 0)
        appointment.appointment_time = datetime.combine(
            update_data['appointment_date'],
            current_time
        )
        del update_data['appointment_date']
    elif 'appointment_time' in update_data:
        current_date = appointment.appointment_date
        appointment.appointment_time = datetime.combine(
            current_date,
            update_data['appointment_time']
        )
        del update_data['appointment_time']
    
    # Remove sync flag from update data
    sync_to_google = update_data.pop('sync_to_google_calendar', True)
    
    # Apply other updates
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    appointment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(appointment)
    
    # Schedule Google Calendar sync if enabled
    if sync_to_google and appointment.google_calendar_event_id:
        background_tasks.add_task(
            sync_appointment_to_google_calendar,
            appointment,
            'update',
            db
        )
    
    # Log action
    log_user_action(
        action="appointment_updated",
        user_id=current_user.id,
        details={
            "appointment_id": appointment.id,
            "changes": list(update_data.keys())
        }
    )
    
    return convert_appointment_to_event(appointment)

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel/delete an appointment"""
    
    # Get appointment
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or appointment.barber_id != barber.id:
                raise HTTPException(
                    status_code=403,
                    detail="Can only delete your own appointments"
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="No permission to delete appointments"
            )
    
    # Store Google Calendar event ID before deletion
    google_event_id = appointment.google_calendar_event_id
    
    # Update status to cancelled
    appointment.status = 'cancelled'
    appointment.updated_at = datetime.utcnow()
    db.commit()
    
    # Schedule Google Calendar deletion if event exists
    if google_event_id:
        background_tasks.add_task(
            sync_appointment_to_google_calendar,
            appointment,
            'delete',
            db
        )
    
    # Log action
    log_user_action(
        action="appointment_cancelled",
        user_id=current_user.id,
        details={
            "appointment_id": appointment.id,
            "barber_id": appointment.barber_id,
            "client_id": appointment.client_id
        }
    )
    
    return {"message": "Appointment cancelled successfully"}

@router.get("/stats", response_model=CalendarStats)
async def get_calendar_stats(
    start_date: date = Query(..., description="Start date for stats"),
    end_date: date = Query(..., description="End date for stats"),
    barber_ids: Optional[str] = Query(None, description="Comma-separated barber IDs"),
    location_ids: Optional[str] = Query(None, description="Comma-separated location IDs"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get calendar statistics for the specified date range"""
    
    # Parse filters
    barber_id_list = [int(x.strip()) for x in barber_ids.split(',')] if barber_ids else None
    location_id_list = [int(x.strip()) for x in location_ids.split(',')] if location_ids else None
    
    # Apply permission-based filtering
    rbac = RBACService(db)
    query = db.query(Appointment).filter(
        and_(
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date
        )
    )
    
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if location_id_list:
                allowed_locations = list(set(location_id_list) & set(accessible_locations))
                if not allowed_locations:
                    # No access to requested locations
                    return CalendarStats(
                        total_appointments=0,
                        confirmed_appointments=0,
                        completed_appointments=0,
                        cancelled_appointments=0,
                        no_shows=0,
                        total_revenue=0.0,
                        average_service_time=0.0,
                        utilization_rate=0.0,
                        date_range={"start": start_date.isoformat(), "end": end_date.isoformat()}
                    )
                location_id_list = allowed_locations
            else:
                location_id_list = accessible_locations
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                barber_id_list = [barber.id]
            else:
                return CalendarStats(
                    total_appointments=0,
                    confirmed_appointments=0,
                    completed_appointments=0,
                    cancelled_appointments=0,
                    no_shows=0,
                    total_revenue=0.0,
                    average_service_time=0.0,
                    utilization_rate=0.0,
                    date_range={"start": start_date.isoformat(), "end": end_date.isoformat()}
                )
    
    # Apply filters
    if barber_id_list:
        query = query.filter(Appointment.barber_id.in_(barber_id_list))
    
    if location_id_list:
        barber_ids_in_locations = db.query(Barber.id).filter(
            Barber.location_id.in_(location_id_list)
        ).subquery()
        query = query.filter(Appointment.barber_id.in_(barber_ids_in_locations))
    
    # Get all appointments
    appointments = query.all()
    
    # Calculate statistics
    total_appointments = len(appointments)
    confirmed_appointments = len([a for a in appointments if a.status == 'confirmed'])
    completed_appointments = len([a for a in appointments if a.status == 'completed'])
    cancelled_appointments = len([a for a in appointments if a.status == 'cancelled'])
    no_shows = len([a for a in appointments if a.status == 'no_show'])
    
    # Revenue calculations
    total_revenue = sum((a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0) for a in appointments)
    
    # Average service time
    durations = [a.duration_minutes for a in appointments if a.duration_minutes]
    average_service_time = sum(durations) / len(durations) if durations else 0.0
    
    # Utilization rate calculation (simplified)
    # This would need more complex logic to calculate actual utilization based on barber availability
    working_days = (end_date - start_date).days + 1
    working_hours_per_day = 8  # Assume 8 hours per day
    if barber_id_list:
        total_possible_hours = len(barber_id_list) * working_days * working_hours_per_day
    else:
        # Get total number of barbers
        barber_count = db.query(Barber).count()
        total_possible_hours = barber_count * working_days * working_hours_per_day
    
    total_booked_hours = sum(durations) / 60 if durations else 0
    utilization_rate = (total_booked_hours / total_possible_hours * 100) if total_possible_hours > 0 else 0.0
    
    return CalendarStats(
        total_appointments=total_appointments,
        confirmed_appointments=confirmed_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
        no_shows=no_shows,
        total_revenue=total_revenue,
        average_service_time=average_service_time,
        utilization_rate=min(utilization_rate, 100.0),  # Cap at 100%
        date_range={"start": start_date.isoformat(), "end": end_date.isoformat()}
    )