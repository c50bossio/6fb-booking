"""
Appointment management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time, timedelta

from config.database import get_db
from models.user import User
from models.appointment import Appointment
from models.barber import Barber
from models.client import Client
from services.rbac_service import RBACService, Permission
from .auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Pydantic models
class AppointmentCreate(BaseModel):
    barber_id: int
    client_id: Optional[int] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    appointment_date: date
    appointment_time: time
    service_id: Optional[int] = None
    service_name: str
    service_duration: int = 30
    service_price: float
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    status: Optional[str] = None
    service_revenue: Optional[float] = None
    tip_amount: Optional[float] = None
    product_revenue: Optional[float] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    barber_id: int
    barber_name: str
    client_id: Optional[int]
    client_name: str
    client_email: Optional[str]
    client_phone: Optional[str]
    appointment_date: date
    appointment_time: Optional[time]
    status: str
    service_name: str
    service_duration: int
    service_price: float
    service_revenue: Optional[float]
    tip_amount: Optional[float]
    product_revenue: Optional[float]
    total_amount: float
    customer_type: str
    source: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# API Endpoints
@router.get("/", response_model=List[AppointmentResponse])
async def get_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    barber_id: Optional[int] = None,
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of appointments with filters"""
    rbac = RBACService(db)
    
    query = db.query(Appointment)
    
    # Apply filters
    if barber_id:
        query = query.filter(Appointment.barber_id == barber_id)
    if status:
        query = query.filter(Appointment.status == status)
    if start_date:
        query = query.filter(Appointment.appointment_date >= start_date)
    if end_date:
        query = query.filter(Appointment.appointment_date <= end_date)
    
    # Apply permission-based filtering
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            # Filter by accessible locations
            accessible_locations = rbac.get_accessible_locations(current_user)
            barber_ids = db.query(Barber.id).filter(Barber.location_id.in_(accessible_locations)).subquery()
            query = query.filter(Appointment.barber_id.in_(barber_ids))
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            # Only own appointments
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                query = query.filter(Appointment.barber_id == barber.id)
            else:
                return []
        else:
            return []
    
    # Apply location filter if specified
    if location_id:
        barber_ids = db.query(Barber.id).filter(Barber.location_id == location_id).subquery()
        query = query.filter(Appointment.barber_id.in_(barber_ids))
    
    appointments = query.order_by(Appointment.appointment_date.desc()).offset(skip).limit(limit).all()
    
    # Build response
    result = []
    for appointment in appointments:
        barber = db.query(Barber).filter(Barber.id == appointment.barber_id).first()
        
        total_amount = (appointment.service_revenue or appointment.service_price or 0) + \
                      (appointment.tip_amount or 0) + \
                      (appointment.product_revenue or 0)
        
        result.append(AppointmentResponse(
            id=appointment.id,
            barber_id=appointment.barber_id,
            barber_name=f"{barber.first_name} {barber.last_name}" if barber else "Unknown",
            client_id=appointment.client_id,
            client_name=appointment.client_name,
            client_email=appointment.client_email,
            client_phone=appointment.client_phone,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time,
            status=appointment.status,
            service_name=appointment.service_name,
            service_duration=appointment.service_duration,
            service_price=appointment.service_price,
            service_revenue=appointment.service_revenue,
            tip_amount=appointment.tip_amount,
            product_revenue=appointment.product_revenue,
            total_amount=total_amount,
            customer_type=appointment.customer_type,
            source=appointment.source,
            notes=appointment.notes,
            created_at=appointment.created_at
        ))
    
    return result

@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new appointment"""
    rbac = RBACService(db)
    
    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == appointment_data.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barber not found"
        )
    
    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to create appointments for this barber"
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only create own appointments"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to create appointments"
            )
    
    # Check if client exists or create new
    if appointment_data.client_id:
        client = db.query(Client).filter(Client.id == appointment_data.client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        customer_type = "returning"
    else:
        # Check if client exists by email/phone
        if appointment_data.client_email:
            client = db.query(Client).filter(Client.email == appointment_data.client_email).first()
        elif appointment_data.client_phone:
            client = db.query(Client).filter(Client.phone == appointment_data.client_phone).first()
        else:
            client = None
        
        if client:
            appointment_data.client_id = client.id
            customer_type = "returning"
        else:
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
            appointment_data.client_id = client.id
            customer_type = "new"
    
    # Create appointment
    new_appointment = Appointment(
        barber_id=appointment_data.barber_id,
        client_id=client.id,
        client_name=appointment_data.client_name,
        client_email=appointment_data.client_email,
        client_phone=appointment_data.client_phone,
        appointment_date=appointment_data.appointment_date,
        appointment_time=appointment_data.appointment_time,
        status="scheduled",
        service_id=appointment_data.service_id,
        service_name=appointment_data.service_name,
        service_duration=appointment_data.service_duration,
        service_price=appointment_data.service_price,
        customer_type=customer_type,
        source="platform",
        notes=appointment_data.notes
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    return AppointmentResponse(
        id=new_appointment.id,
        barber_id=new_appointment.barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        client_id=new_appointment.client_id,
        client_name=new_appointment.client_name,
        client_email=new_appointment.client_email,
        client_phone=new_appointment.client_phone,
        appointment_date=new_appointment.appointment_date,
        appointment_time=new_appointment.appointment_time,
        status=new_appointment.status,
        service_name=new_appointment.service_name,
        service_duration=new_appointment.service_duration,
        service_price=new_appointment.service_price,
        service_revenue=new_appointment.service_revenue,
        tip_amount=new_appointment.tip_amount,
        product_revenue=new_appointment.product_revenue,
        total_amount=new_appointment.service_price,
        customer_type=new_appointment.customer_type,
        source=new_appointment.source,
        notes=new_appointment.notes,
        created_at=new_appointment.created_at
    )

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check permissions
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.id == appointment.barber_id).first()
    
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber and barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this appointment"
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if not barber or barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only view own appointments"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view appointments"
            )
    
    total_amount = (appointment.service_revenue or appointment.service_price or 0) + \
                  (appointment.tip_amount or 0) + \
                  (appointment.product_revenue or 0)
    
    return AppointmentResponse(
        id=appointment.id,
        barber_id=appointment.barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}" if barber else "Unknown",
        client_id=appointment.client_id,
        client_name=appointment.client_name,
        client_email=appointment.client_email,
        client_phone=appointment.client_phone,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        status=appointment.status,
        service_name=appointment.service_name,
        service_duration=appointment.service_duration,
        service_price=appointment.service_price,
        service_revenue=appointment.service_revenue,
        tip_amount=appointment.tip_amount,
        product_revenue=appointment.product_revenue,
        total_amount=total_amount,
        customer_type=appointment.customer_type,
        source=appointment.source,
        notes=appointment.notes,
        created_at=appointment.created_at
    )

@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check permissions
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.id == appointment.barber_id).first()
    
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber and barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to update this appointment"
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if not barber or barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only update own appointments"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to update appointments"
            )
    
    # Update fields
    update_data = appointment_update.dict(exclude_unset=True)
    
    # If completing appointment, ensure revenue is set
    if update_data.get("status") == "completed" and not appointment.service_revenue:
        update_data["service_revenue"] = appointment.service_price
    
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    appointment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(appointment)
    
    total_amount = (appointment.service_revenue or appointment.service_price or 0) + \
                  (appointment.tip_amount or 0) + \
                  (appointment.product_revenue or 0)
    
    return AppointmentResponse(
        id=appointment.id,
        barber_id=appointment.barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}" if barber else "Unknown",
        client_id=appointment.client_id,
        client_name=appointment.client_name,
        client_email=appointment.client_email,
        client_phone=appointment.client_phone,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        status=appointment.status,
        service_name=appointment.service_name,
        service_duration=appointment.service_duration,
        service_price=appointment.service_price,
        service_revenue=appointment.service_revenue,
        tip_amount=appointment.tip_amount,
        product_revenue=appointment.product_revenue,
        total_amount=total_amount,
        customer_type=appointment.customer_type,
        source=appointment.source,
        notes=appointment.notes,
        created_at=appointment.created_at
    )

@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check permissions (same as update)
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.id == appointment.barber_id).first()
    
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber and barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to cancel this appointment"
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if not barber or barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only cancel own appointments"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to cancel appointments"
            )
    
    # Cancel appointment
    appointment.status = "cancelled"
    appointment.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Appointment cancelled successfully"}

@router.get("/availability/{barber_id}")
async def get_barber_availability(
    barber_id: int,
    date: date = Query(default=date.today()),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available time slots for a barber on a specific date"""
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barber not found"
        )
    
    # Get existing appointments
    appointments = db.query(Appointment).filter(
        Appointment.barber_id == barber_id,
        Appointment.appointment_date == date,
        Appointment.status.in_(["scheduled", "confirmed"])
    ).all()
    
    # Generate time slots (9 AM to 8 PM, 30-minute intervals)
    slots = []
    start_time = datetime.combine(date, time(9, 0))
    end_time = datetime.combine(date, time(20, 0))
    slot_duration = timedelta(minutes=30)
    
    current_slot = start_time
    while current_slot < end_time:
        slot_time = current_slot.time()
        
        # Check if slot is available
        is_available = True
        for appointment in appointments:
            if appointment.appointment_time == slot_time:
                is_available = False
                break
        
        slots.append({
            "time": slot_time.strftime("%H:%M"),
            "available": is_available
        })
        
        current_slot += slot_duration
    
    return {
        "barber_id": barber_id,
        "date": date.isoformat(),
        "slots": slots,
        "total_slots": len(slots),
        "available_slots": len([s for s in slots if s["available"]])
    }