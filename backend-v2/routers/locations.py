"""
Location management API endpoints

This router provides location-specific views of organizations,
treating each organization as a location for multi-shop support.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from db import get_db
from models import User, Organization, UserOrganization, Appointment
from models.organization import OrganizationType
from schemas import LocationResponse, LocationListResponse, LocationCreate, LocationUpdate
from routers.auth import get_current_user
from services.cache_invalidation import cache_invalidator

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/locations", tags=["locations"])

def organization_to_location(org: Organization) -> LocationResponse:
    """Convert Organization model to LocationResponse"""
    return LocationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        street_address=org.street_address,
        city=org.city,
        state=org.state,
        zip_code=org.zip_code,
        country=org.country,
        phone=org.phone,
        email=org.email,
        timezone=org.timezone,
        business_hours=org.business_hours,
        chairs_count=org.chairs_count,
        organization_type=org.organization_type,
        parent_organization_id=org.parent_organization_id,
        is_active=org.is_active
    )

@router.get("/", response_model=LocationListResponse)
async def get_locations(
    current_user: User = Depends(get_current_user),
    include_inactive: bool = Query(False, description="Include inactive locations"),
    parent_id: Optional[int] = Query(None, description="Filter by parent organization"),
    db: Session = Depends(get_db)
):
    """
    Get all locations accessible to the current user.
    
    - Admin users see all locations
    - Enterprise users see locations in their enterprise
    - Regular users see only their assigned location(s)
    """
    try:
        logger.info(f"Getting locations for user {current_user.id} (role: {current_user.role})")
        
        # Base query for organizations that act as locations
        query = db.query(Organization)
        
        # Filter out inactive unless requested
        if not include_inactive:
            query = query.filter(Organization.is_active == True)
        
        # Filter by parent if specified
        if parent_id is not None:
            query = query.filter(Organization.parent_organization_id == parent_id)
        
        # Non-admin users can only see their organizations
        if current_user.role not in ["admin", "super_admin"]:
            # Get user's organization IDs
            user_org_ids = db.query(UserOrganization.organization_id).filter(
                UserOrganization.user_id == current_user.id
            ).subquery()
            
            # Include both direct organizations and their children
            query = query.filter(
                (Organization.id.in_(user_org_ids)) |
                (Organization.parent_organization_id.in_(user_org_ids))
            )
        
        # Execute query
        organizations = query.all()
        
        # Convert to location responses
        locations = [organization_to_location(org) for org in organizations]
        
        # Determine if user has multiple locations
        has_multiple = len(locations) > 1
        
        # Find headquarters if any
        headquarters = None
        for org in organizations:
            if org.organization_type == OrganizationType.HEADQUARTERS.value:
                headquarters = organization_to_location(org)
                break
        
        logger.info(f"Found {len(locations)} locations for user {current_user.id}")
        
        return LocationListResponse(
            locations=locations,
            total=len(locations),
            has_multiple_locations=has_multiple,
            headquarters=headquarters
        )
        
    except Exception as e:
        logger.error(f"Error getting locations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve locations"
        )

@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific location by ID"""
    try:
        # Get the organization
        location = db.query(Organization).filter(
            Organization.id == location_id
        ).first()
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        # Check access permissions
        if current_user.role not in ["admin", "super_admin"]:
            # Check if user has access to this organization
            user_org = db.query(UserOrganization).filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == location_id
            ).first()
            
            # Also check if user has access to parent organization
            if not user_org and location.parent_organization_id:
                user_org = db.query(UserOrganization).filter(
                    UserOrganization.user_id == current_user.id,
                    UserOrganization.organization_id == location.parent_organization_id
                ).first()
            
            if not user_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this location"
                )
        
        return organization_to_location(location)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting location {location_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve location"
        )

@router.post("/", response_model=LocationResponse)
async def create_location(
    location_data: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new location.
    
    - Creates a new organization with location type
    - If parent_organization_id is provided, creates as child location
    - Creator becomes the owner/manager
    """
    try:
        # Check permissions
        if location_data.parent_organization_id:
            # Creating a child location - need to be owner/manager of parent
            parent_access = db.query(UserOrganization).filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == location_data.parent_organization_id,
                UserOrganization.role.in_(["owner", "manager"])
            ).first()
            
            if not parent_access and current_user.role not in ["admin", "super_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be an owner or manager of the parent organization"
                )
            
            org_type = OrganizationType.LOCATION.value
        else:
            # Creating an independent location
            org_type = OrganizationType.INDEPENDENT.value
        
        # Generate slug from name
        import re
        slug_base = re.sub(r'[^\w\s-]', '', location_data.name.lower())
        slug_base = re.sub(r'[-\s]+', '-', slug_base).strip('-')
        
        # Ensure unique slug
        slug = slug_base
        counter = 1
        while db.query(Organization).filter(Organization.slug == slug).first():
            slug = f"{slug_base}-{counter}"
            counter += 1
        
        # Create organization
        new_org = Organization(
            name=location_data.name,
            slug=slug,
            street_address=location_data.street_address,
            city=location_data.city,
            state=location_data.state,
            zip_code=location_data.zip_code,
            country=location_data.country,
            phone=location_data.phone,
            email=location_data.email,
            timezone=location_data.timezone,
            business_hours=location_data.business_hours,
            chairs_count=location_data.chairs_count,
            organization_type=org_type,
            parent_organization_id=location_data.parent_organization_id,
            billing_plan="individual",  # Default billing plan
            subscription_status="trial"
        )
        
        db.add(new_org)
        db.commit()
        db.refresh(new_org)
        
        # Add creator as manager
        user_org = UserOrganization(
            user_id=current_user.id,
            organization_id=new_org.id,
            role="manager" if location_data.parent_organization_id else "owner",
            is_primary=not location_data.parent_organization_id,  # Primary if independent
            can_manage_staff=True,
            can_view_analytics=True,
            can_manage_billing=not location_data.parent_organization_id
        )
        
        db.add(user_org)
        db.commit()
        
        logger.info(f"Created location {new_org.id}: {new_org.name}")
        
        # Invalidate cache
        cache_invalidator.invalidate_organization_data(new_org.id)
        
        return organization_to_location(new_org)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating location: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create location"
        )

@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_data: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a location (admin, owner, or manager only)"""
    try:
        location = db.query(Organization).filter(
            Organization.id == location_id
        ).first()
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        # Check permissions
        if current_user.role not in ["admin", "super_admin"]:
            user_org = db.query(UserOrganization).filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == location_id,
                UserOrganization.role.in_(["owner", "manager"])
            ).first()
            
            if not user_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be an owner or manager to update this location"
                )
        
        # Update fields
        update_data = location_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(location, field, value)
        
        location.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(location)
        
        logger.info(f"Updated location {location.id}: {location.name}")
        
        # Invalidate cache
        cache_invalidator.invalidate_organization_data(location_id)
        
        return organization_to_location(location)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating location {location_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update location"
        )

@router.delete("/{location_id}")
async def delete_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Soft delete a location (admin or owner only).
    
    Note: Locations with appointments cannot be hard deleted.
    """
    try:
        location = db.query(Organization).filter(
            Organization.id == location_id
        ).first()
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        # Check permissions
        if current_user.role not in ["admin", "super_admin"]:
            user_org = db.query(UserOrganization).filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == location_id,
                UserOrganization.role == "owner"
            ).first()
            
            if not user_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only owners can delete locations"
                )
        
        # Check if location has appointments
        appointment_count = db.query(Appointment).filter(
            Appointment.organization_id == location_id
        ).count()
        
        if appointment_count > 0:
            # Soft delete only
            location.is_active = False
            location.updated_at = datetime.utcnow()
            db.commit()
            
            message = f"Location deactivated (has {appointment_count} appointments)"
        else:
            # Can hard delete if no appointments
            db.delete(location)
            db.commit()
            
            message = "Location deleted successfully"
        
        logger.info(f"Deleted/deactivated location {location_id}: {location.name}")
        
        # Invalidate cache
        cache_invalidator.invalidate_organization_data(location_id)
        
        return {"message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting location {location_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete location"
        )

@router.get("/{location_id}/stats")
async def get_location_stats(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics for a specific location"""
    try:
        # Verify location exists and user has access
        location = db.query(Organization).filter(
            Organization.id == location_id
        ).first()
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        # Check permissions
        if current_user.role not in ["admin", "super_admin"]:
            user_org = db.query(UserOrganization).filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == location_id
            ).first()
            
            if not user_org or not user_org.can_view_analytics:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to location analytics"
                )
        
        # Calculate statistics
        from datetime import date, timedelta
        from sqlalchemy import func
        from models import Appointment, Payment
        
        # Get current date boundaries
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_month = date(today.year, today.month, 1)
        
        # Get all barber IDs for this location
        barber_ids = db.query(UserOrganization.user_id).filter(
            UserOrganization.organization_id == location_id,
            UserOrganization.role.in_(["barber", "manager", "owner"])
        ).subquery()
        
        # Calculate appointments
        appointments_today = db.query(func.count(Appointment.id)).filter(
            Appointment.barber_id.in_(barber_ids),
            func.date(Appointment.start_time) == today,
            Appointment.status.in_(["confirmed", "completed"])
        ).scalar() or 0
        
        appointments_this_week = db.query(func.count(Appointment.id)).filter(
            Appointment.barber_id.in_(barber_ids),
            func.date(Appointment.start_time) >= start_of_week,
            func.date(Appointment.start_time) <= today,
            Appointment.status.in_(["confirmed", "completed"])
        ).scalar() or 0
        
        appointments_this_month = db.query(func.count(Appointment.id)).filter(
            Appointment.barber_id.in_(barber_ids),
            func.date(Appointment.start_time) >= start_of_month,
            func.date(Appointment.start_time) <= today,
            Appointment.status.in_(["confirmed", "completed"])
        ).scalar() or 0
        
        # Calculate revenue
        revenue_today = db.query(func.sum(Payment.amount)).filter(
            Payment.appointment_id.in_(
                db.query(Appointment.id).filter(
                    Appointment.barber_id.in_(barber_ids),
                    func.date(Appointment.start_time) == today,
                    Appointment.status == "completed"
                )
            ),
            Payment.status == "completed"
        ).scalar() or 0.0
        
        revenue_this_week = db.query(func.sum(Payment.amount)).filter(
            Payment.appointment_id.in_(
                db.query(Appointment.id).filter(
                    Appointment.barber_id.in_(barber_ids),
                    func.date(Appointment.start_time) >= start_of_week,
                    func.date(Appointment.start_time) <= today,
                    Appointment.status == "completed"
                )
            ),
            Payment.status == "completed"
        ).scalar() or 0.0
        
        revenue_this_month = db.query(func.sum(Payment.amount)).filter(
            Payment.appointment_id.in_(
                db.query(Appointment.id).filter(
                    Appointment.barber_id.in_(barber_ids),
                    func.date(Appointment.start_time) >= start_of_month,
                    func.date(Appointment.start_time) <= today,
                    Appointment.status == "completed"
                )
            ),
            Payment.status == "completed"
        ).scalar() or 0.0
        
        # Calculate occupancy rate for today
        # Assuming 8 hour work day per chair
        total_chair_hours = location.chairs_count * 8 if location.chairs_count else 0
        booked_hours = db.query(
            func.sum(
                func.extract('epoch', Appointment.end_time - Appointment.start_time) / 3600
            )
        ).filter(
            Appointment.barber_id.in_(barber_ids),
            func.date(Appointment.start_time) == today,
            Appointment.status.in_(["confirmed", "completed"])
        ).scalar() or 0
        
        occupancy_rate = (booked_hours / total_chair_hours * 100) if total_chair_hours > 0 else 0.0
        
        stats = {
            "location_id": location_id,
            "location_name": location.name,
            "total_chairs": location.chairs_count,
            "active_barbers": db.query(UserOrganization).filter(
                UserOrganization.organization_id == location_id,
                UserOrganization.role == "barber"
            ).count(),
            "appointments_today": appointments_today,
            "appointments_this_week": appointments_this_week,
            "appointments_this_month": appointments_this_month,
            "revenue_today": float(revenue_today),
            "revenue_this_week": float(revenue_this_week),
            "revenue_this_month": float(revenue_this_month),
            "occupancy_rate": round(occupancy_rate, 2),
            "is_active": location.is_active
        }
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stats for location {location_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve location statistics"
        )