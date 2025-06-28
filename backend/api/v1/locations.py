"""
Location management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta

from config.database import get_db
from models.location import Location, LocationAnalytics
from models.user import User
from models.barber import Barber
from services.location_management import LocationManagementService
from services.rbac_service import RBACService, Permission
from .auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


# Pydantic models
class LocationCreate(BaseModel):
    name: str
    location_code: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    email: str
    franchise_type: str = "company_owned"
    operating_hours: dict
    mentor_id: Optional[int] = None
    capacity: int = 10


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    operating_hours: Optional[dict] = None
    mentor_id: Optional[int] = None
    is_active: Optional[bool] = None
    capacity: Optional[int] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    location_code: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    email: str
    franchise_type: str
    is_active: bool
    mentor_id: Optional[int]
    mentor_name: Optional[str]
    operating_hours: dict
    capacity: int
    created_at: datetime

    class Config:
        from_attributes = True


class LocationAnalyticsResponse(BaseModel):
    location_id: int
    location_name: str
    period_start: date
    period_end: date
    total_revenue: float
    total_appointments: int
    avg_6fb_score: float
    client_retention_rate: float
    booking_efficiency: float
    barber_count: int
    revenue_per_barber: float
    top_services: List[dict]


# API Endpoints
@router.get("/", response_model=List[LocationResponse])
async def get_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = None,
    franchise_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of locations"""
    rbac = RBACService(db)

    # Get accessible locations for user
    if rbac.has_permission(current_user, Permission.VIEW_ALL_LOCATIONS):
        query = db.query(Location)
    else:
        accessible_locations = rbac.get_accessible_locations(current_user)
        if not accessible_locations:
            return []
        query = db.query(Location).filter(Location.id.in_(accessible_locations))

    # Apply filters
    if is_active is not None:
        query = query.filter(Location.is_active == is_active)
    if franchise_type:
        query = query.filter(Location.franchise_type == franchise_type)

    locations = query.offset(skip).limit(limit).all()

    # Add mentor names
    result = []
    for location in locations:
        location_dict = {
            "id": location.id,
            "name": location.name,
            "location_code": location.location_code,
            "address": location.address,
            "city": location.city,
            "state": location.state,
            "zip_code": location.zip_code,
            "phone": location.phone,
            "email": location.email,
            "franchise_type": location.franchise_type,
            "is_active": location.is_active,
            "mentor_id": location.mentor_id,
            "mentor_name": None,
            "operating_hours": location.operating_hours or {},
            "capacity": location.capacity,
            "created_at": location.created_at,
        }

        if location.mentor_id:
            mentor = db.query(User).filter(User.id == location.mentor_id).first()
            if mentor:
                location_dict["mentor_name"] = mentor.full_name

        result.append(LocationResponse(**location_dict))

    return result


@router.post("/", response_model=LocationResponse)
async def create_location(
    location_data: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create new location"""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.CREATE_LOCATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to create locations",
        )

    # Check if location code exists
    existing = (
        db.query(Location)
        .filter(Location.location_code == location_data.location_code)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location code already exists",
        )

    # Create location
    new_location = Location(**location_data.dict())
    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    # Return with mentor name
    result = {
        "id": new_location.id,
        "name": new_location.name,
        "location_code": new_location.location_code,
        "address": new_location.address,
        "city": new_location.city,
        "state": new_location.state,
        "zip_code": new_location.zip_code,
        "phone": new_location.phone,
        "email": new_location.email,
        "franchise_type": new_location.franchise_type,
        "is_active": new_location.is_active,
        "mentor_id": new_location.mentor_id,
        "mentor_name": None,
        "operating_hours": new_location.operating_hours or {},
        "capacity": new_location.capacity,
        "created_at": new_location.created_at,
    }

    if new_location.mentor_id:
        mentor = db.query(User).filter(User.id == new_location.mentor_id).first()
        if mentor:
            result["mentor_name"] = mentor.full_name

    return LocationResponse(**result)


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific location"""
    rbac = RBACService(db)

    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_LOCATIONS):
        accessible_locations = rbac.get_accessible_locations(current_user)
        if location_id not in accessible_locations:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view this location",
            )

    # Return with mentor name
    result = {
        "id": location.id,
        "name": location.name,
        "location_code": location.location_code,
        "address": location.address,
        "city": location.city,
        "state": location.state,
        "zip_code": location.zip_code,
        "phone": location.phone,
        "email": location.email,
        "franchise_type": location.franchise_type,
        "is_active": location.is_active,
        "mentor_id": location.mentor_id,
        "mentor_name": None,
        "operating_hours": location.operating_hours or {},
        "capacity": location.capacity,
        "created_at": location.created_at,
    }

    if location.mentor_id:
        mentor = db.query(User).filter(User.id == location.mentor_id).first()
        if mentor:
            result["mentor_name"] = mentor.full_name

    return LocationResponse(**result)


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_update: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update location information"""
    rbac = RBACService(db)

    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    # Check permissions
    if not rbac.has_permission(
        current_user, Permission.MANAGE_ALL_LOCATIONS, location_id
    ):
        if not rbac.has_permission(
            current_user, Permission.MANAGE_ASSIGNED_LOCATIONS, location_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to update this location",
            )

    # Update fields
    update_data = location_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)

    location.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(location)

    # Return with mentor name
    result = {
        "id": location.id,
        "name": location.name,
        "location_code": location.location_code,
        "address": location.address,
        "city": location.city,
        "state": location.state,
        "zip_code": location.zip_code,
        "phone": location.phone,
        "email": location.email,
        "franchise_type": location.franchise_type,
        "is_active": location.is_active,
        "mentor_id": location.mentor_id,
        "mentor_name": None,
        "operating_hours": location.operating_hours or {},
        "capacity": location.capacity,
        "created_at": location.created_at,
    }

    if location.mentor_id:
        mentor = db.query(User).filter(User.id == location.mentor_id).first()
        if mentor:
            result["mentor_name"] = mentor.full_name

    return LocationResponse(**result)


@router.get("/{location_id}/analytics", response_model=LocationAnalyticsResponse)
async def get_location_analytics(
    location_id: int,
    period_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get location analytics"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        if not rbac.has_permission(
            current_user, Permission.VIEW_LOCATION_ANALYTICS, location_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view analytics for this location",
            )

    # Get location
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    # Calculate analytics
    service = LocationManagementService(db)
    end_date = date.today()
    start_date = end_date - timedelta(days=period_days)

    analytics = await service.get_location_analytics(location_id, start_date, end_date)

    return LocationAnalyticsResponse(
        location_id=location_id,
        location_name=location.name,
        period_start=start_date,
        period_end=end_date,
        total_revenue=analytics.get("total_revenue", 0),
        total_appointments=analytics.get("total_appointments", 0),
        avg_6fb_score=analytics.get("avg_6fb_score", 0),
        client_retention_rate=analytics.get("client_retention_rate", 0),
        booking_efficiency=analytics.get("booking_efficiency", 0),
        barber_count=analytics.get("barber_count", 0),
        revenue_per_barber=analytics.get("revenue_per_barber", 0),
        top_services=analytics.get("top_services", []),
    )


@router.get("/{location_id}/barbers")
async def get_location_barbers(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get barbers for a location"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_USERS):
        accessible_locations = rbac.get_accessible_locations(current_user)
        if location_id not in accessible_locations:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view barbers for this location",
            )

    barbers = db.query(Barber).filter(Barber.location_id == location_id).all()

    return [
        {
            "id": barber.id,
            "name": f"{barber.first_name} {barber.last_name}",
            "email": barber.email,
            "phone": barber.phone,
            "status": "active",  # Add status field to Barber model
            "hire_date": barber.created_at,
        }
        for barber in barbers
    ]


@router.post("/{location_id}/assign-mentor")
async def assign_location_mentor(
    location_id: int,
    mentor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign mentor to location"""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_LOCATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to assign mentors",
        )

    # Verify location exists
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    # Verify mentor exists and has mentor role
    mentor = db.query(User).filter(User.id == mentor_id, User.role == "mentor").first()
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mentor or user is not a mentor",
        )

    # Assign mentor
    location.mentor_id = mentor_id
    location.updated_at = datetime.utcnow()
    db.commit()

    return {
        "message": "Mentor assigned successfully",
        "location_id": location_id,
        "mentor_id": mentor_id,
        "mentor_name": mentor.full_name,
    }
