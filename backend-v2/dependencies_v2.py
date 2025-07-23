"""
Enhanced Dependencies with Multi-tenancy Support for BookedBarber V2
Provides location-aware dependency injection for secure data access
"""

from typing import Optional, List, Union
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from db import get_db
from models import User, Appointment, Payment, Client, Service, Barber
from utils.auth import get_current_user
from middleware.multi_tenancy import LocationContext, LocationAccessError, location_filter


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user with location validation"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Validate user has location assigned (unless admin)
    if not current_user.location_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not assigned to any location. Contact administrator."
        )
    
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get current admin user"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_location_context(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> LocationContext:
    """Get location context for database operations"""
    allowed_locations = getattr(request.state, "allowed_locations", None)
    return LocationContext(db, current_user, allowed_locations)


class LocationAwareService:
    """Base class for location-aware services"""
    
    def __init__(self, db: Session, location_context: LocationContext):
        self.db = db
        self.location_context = location_context
    
    def filter_by_location(self, query, model_class):
        """Apply location filter to query"""
        return self.location_context.filter_query(query, model_class)


# Location-aware data dependencies

async def get_user_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> List[Appointment]:
    """Get appointments accessible to current user"""
    query = db.query(Appointment)
    
    if current_user.role == "barber":
        # Barbers see their own appointments
        query = query.filter(Appointment.barber_id == current_user.id)
    elif current_user.role == "user":
        # Regular users see their own appointments
        query = query.filter(Appointment.user_id == current_user.id)
    else:
        # Admins see all appointments in their location(s)
        query = location_context.filter_query(query, Appointment)
    
    return query.all()


async def get_location_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> List[Payment]:
    """Get payments for user's location(s)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for payment data"
        )
    
    query = db.query(Payment)
    query = location_context.filter_query(query, Payment)
    return query.all()


async def get_location_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> List[Client]:
    """Get clients for user's location(s)"""
    query = db.query(Client)
    
    if current_user.role == "barber":
        # Barbers see their own clients
        query = query.filter(Client.barber_id == current_user.id)
    else:
        # Admins see all clients in their location(s)
        query = location_context.filter_query(query, Client)
    
    return query.all()


async def get_location_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> List[Service]:
    """Get services for user's location(s)"""
    query = db.query(Service)
    
    if current_user.role == "barber":
        # Barbers see their own services
        query = query.filter(Service.barber_id == current_user.id)
    else:
        # Others see all services in their location(s)
        query = location_context.filter_query(query, Service)
    
    return query.all()


async def get_location_barbers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> List[User]:
    """Get barbers for user's location(s)"""
    query = db.query(User).filter(User.role == "barber")
    
    if current_user.role not in ["admin", "super_admin"]:
        # Non-admins only see barbers in their location
        if current_user.location_id:
            query = query.filter(User.location_id == current_user.location_id)
        else:
            return []
    else:
        # Admins see barbers in allowed locations
        if location_context.allowed_locations != "all":
            query = query.filter(User.location_id.in_(location_context.allowed_locations))
    
    return query.all()


# Validation dependencies

async def validate_appointment_access(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> Appointment:
    """Validate user can access appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check access based on role
    if current_user.role in ["admin", "super_admin"]:
        # Admins must have location access
        if hasattr(appointment, "location_id") and appointment.location_id:
            location_context.validate_update(appointment)
    elif current_user.role == "barber":
        # Barbers can only access their appointments
        if appointment.barber_id != current_user.id:
            raise LocationAccessError("Access denied to this appointment")
    else:
        # Users can only access their own appointments
        if appointment.user_id != current_user.id:
            raise LocationAccessError("Access denied to this appointment")
    
    return appointment


async def validate_payment_access(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> Payment:
    """Validate user can access payment"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Only admins and the payment owner can access
    if current_user.role in ["admin", "super_admin"]:
        if hasattr(payment, "location_id") and payment.location_id:
            location_context.validate_update(payment)
    elif payment.user_id != current_user.id and payment.barber_id != current_user.id:
        raise LocationAccessError("Access denied to this payment")
    
    return payment


async def validate_client_access(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> Client:
    """Validate user can access client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Check access based on role
    if current_user.role in ["admin", "super_admin"]:
        # Validate through barber's location
        if client.barber_id:
            barber = db.query(User).filter(User.id == client.barber_id).first()
            if barber and barber.location_id:
                if location_context.allowed_locations != "all" and \
                   barber.location_id not in location_context.allowed_locations:
                    raise LocationAccessError("Access denied to this client")
    elif current_user.role == "barber":
        # Barbers can only access their own clients
        if client.barber_id != current_user.id:
            raise LocationAccessError("Access denied to this client")
    else:
        # Regular users cannot access client data
        raise LocationAccessError("Insufficient permissions to access client data")
    
    return client


async def validate_service_access(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> Service:
    """Validate user can access service"""
    service = db.query(Service).filter(Service.id == service_id).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check access based on role
    if current_user.role in ["admin", "super_admin"]:
        # Validate through barber's location
        if service.barber_id:
            barber = db.query(User).filter(User.id == service.barber_id).first()
            if barber and barber.location_id:
                if location_context.allowed_locations != "all" and \
                   barber.location_id not in location_context.allowed_locations:
                    raise LocationAccessError("Access denied to this service")
    elif current_user.role == "barber":
        # Barbers can only access their own services
        if service.barber_id != current_user.id:
            raise LocationAccessError("Access denied to this service")
    
    return service


# Creation validation dependencies

async def validate_appointment_creation(
    appointment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> dict:
    """Validate appointment creation with location checks"""
    barber_id = appointment_data.get("barber_id")
    
    if barber_id:
        # Validate barber exists and is in allowed location
        barber = db.query(User).filter(
            User.id == barber_id,
            User.role == "barber"
        ).first()
        
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Barber not found"
            )
        
        # Check barber's location
        if location_context.allowed_locations != "all":
            if not barber.location_id or \
               barber.location_id not in location_context.allowed_locations:
                raise LocationAccessError(
                    "Cannot create appointment with barber from different location"
                )
    
    # Add location_id to appointment if not present
    if "location_id" not in appointment_data and current_user.location_id:
        appointment_data["location_id"] = current_user.location_id
    
    return appointment_data


async def validate_payment_creation(
    payment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
) -> dict:
    """Validate payment creation with location checks"""
    appointment_id = payment_data.get("appointment_id")
    
    if appointment_id:
        # Validate appointment exists and user has access
        appointment = await validate_appointment_access(
            appointment_id, db, current_user, location_context
        )
        
        # Add location context to payment
        if hasattr(appointment, "location_id"):
            payment_data["location_id"] = appointment.location_id
    
    return payment_data