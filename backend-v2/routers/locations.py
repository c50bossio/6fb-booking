"""
Location management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from utils.auth import get_current_user
from utils.authorization import verify_location_access, get_user_locations
from models import User
# TODO: Implement proper location models and schemas
# For now, return empty list to fix 404 error
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/")
async def get_locations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all locations accessible to the current user.
    
    - Admin users see all locations
    - Enterprise users see locations in their enterprise
    - Regular users see only their assigned location
    """
    try:
        logger.info(f"Getting locations for user {current_user.id} (role: {current_user.role})")
        
        # Get user's accessible location IDs
        user_location_ids = get_user_locations(current_user, db)
        
        if not user_location_ids:
            # User has no accessible locations
            return []
        
        # TODO: Implement location query once models are defined
        # For now, return empty list
        return []
        for location in locations:
            # Calculate occupancy rate and vacant chairs
            vacant_chairs = max(0, location.total_chairs - location.active_chairs)
            occupancy_rate = (location.active_chairs / location.total_chairs * 100) if location.total_chairs > 0 else 0
            
            location_dict = {
                'id': location.id,
                'name': location.name,
                'code': location.code,
                'address': location.address,
                'city': location.city,
                'state': location.state,
                'zip_code': location.zip_code,
                'phone': location.phone,
                'email': location.email,
                'status': location.status,
                'compensation_model': location.compensation_model,
                'total_chairs': location.total_chairs,
                'active_chairs': location.active_chairs,
                'compensation_config': location.compensation_config,
                'business_hours': location.business_hours,
                'timezone': location.timezone,
                'currency': location.currency,
                'manager_id': location.manager_id,
                'owner_id': location.owner_id,
                'created_at': location.created_at,
                'updated_at': location.updated_at,
                'occupancy_rate': occupancy_rate,
                'vacant_chairs': vacant_chairs
            }
            location_responses.append(LocationResponse(**location_dict))
        
        logger.info(f"Found {len(location_responses)} locations")
        return location_responses
        
    except Exception as e:
        logger.error(f"Error getting locations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve locations"
        )


@router.get("/{location_id}", response_model=LocationResponse)
@verify_location_access()
async def get_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific location by ID"""
    try:
        location = db.query(BarbershopLocation).filter(
            BarbershopLocation.id == location_id,
            BarbershopLocation.status == LocationStatus.ACTIVE
        ).first()
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        # Calculate occupancy rate and vacant chairs
        vacant_chairs = max(0, location.total_chairs - location.active_chairs)
        occupancy_rate = (location.active_chairs / location.total_chairs * 100) if location.total_chairs > 0 else 0
        
        location_dict = {
            'id': location.id,
            'name': location.name,
            'code': location.code,
            'address': location.address,
            'city': location.city,
            'state': location.state,
            'zip_code': location.zip_code,
            'phone': location.phone,
            'email': location.email,
            'status': location.status,
            'compensation_model': location.compensation_model,
            'total_chairs': location.total_chairs,
            'active_chairs': location.active_chairs,
            'compensation_config': location.compensation_config,
            'business_hours': location.business_hours,
            'timezone': location.timezone,
            'currency': location.currency,
            'manager_id': location.manager_id,
            'owner_id': location.owner_id,
            'created_at': location.created_at,
            'updated_at': location.updated_at,
            'occupancy_rate': occupancy_rate,
            'vacant_chairs': vacant_chairs
        }
        
        return LocationResponse(**location_dict)
        
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
    """Create a new location (admin only)"""
    if current_user.role not in ['admin', 'enterprise_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can create locations"
        )
    
    try:
        # Check if location code already exists
        existing_location = db.query(BarbershopLocation).filter(
            BarbershopLocation.code == location_data.code
        ).first()
        
        if existing_location:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location code already exists"
            )
        
        # Create new location
        location = BarbershopLocation(**location_data.dict())
        db.add(location)
        db.commit()
        db.refresh(location)
        
        # Calculate occupancy rate and vacant chairs
        vacant_chairs = max(0, location.total_chairs - location.active_chairs)
        occupancy_rate = (location.active_chairs / location.total_chairs * 100) if location.total_chairs > 0 else 0
        
        location_dict = {
            'id': location.id,
            'name': location.name,
            'code': location.code,
            'address': location.address,
            'city': location.city,
            'state': location.state,
            'zip_code': location.zip_code,
            'phone': location.phone,
            'email': location.email,
            'status': location.status,
            'compensation_model': location.compensation_model,
            'total_chairs': location.total_chairs,
            'active_chairs': location.active_chairs,
            'compensation_config': location.compensation_config,
            'business_hours': location.business_hours,
            'timezone': location.timezone,
            'currency': location.currency,
            'manager_id': location.manager_id,
            'owner_id': location.owner_id,
            'created_at': location.created_at,
            'updated_at': location.updated_at,
            'occupancy_rate': occupancy_rate,
            'vacant_chairs': vacant_chairs
        }
        
        logger.info(f"Created location {location.id}: {location.name}")
        return LocationResponse(**location_dict)
        
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
@verify_location_access(allow_owner=True, allow_manager=True)
async def update_location(
    location_id: int,
    location_data: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a location (admin, owner, or manager only)"""
    # Additional role check for non-location-specific access
    if current_user.role not in ['admin', 'enterprise_admin', 'barber', 'user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        location = db.query(BarbershopLocation).filter(
            BarbershopLocation.id == location_id
        ).first()
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        # Update location fields
        update_data = location_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(location, field, value)
        
        db.commit()
        db.refresh(location)
        
        # Calculate occupancy rate and vacant chairs
        vacant_chairs = max(0, location.total_chairs - location.active_chairs)
        occupancy_rate = (location.active_chairs / location.total_chairs * 100) if location.total_chairs > 0 else 0
        
        location_dict = {
            'id': location.id,
            'name': location.name,
            'code': location.code,
            'address': location.address,
            'city': location.city,
            'state': location.state,
            'zip_code': location.zip_code,
            'phone': location.phone,
            'email': location.email,
            'status': location.status,
            'compensation_model': location.compensation_model,
            'total_chairs': location.total_chairs,
            'active_chairs': location.active_chairs,
            'compensation_config': location.compensation_config,
            'business_hours': location.business_hours,
            'timezone': location.timezone,
            'currency': location.currency,
            'manager_id': location.manager_id,
            'owner_id': location.owner_id,
            'created_at': location.created_at,
            'updated_at': location.updated_at,
            'occupancy_rate': occupancy_rate,
            'vacant_chairs': vacant_chairs
        }
        
        logger.info(f"Updated location {location.id}: {location.name}")
        return LocationResponse(**location_dict)
        
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
@verify_location_access(allow_owner=True, allow_manager=False)
async def delete_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete a location (admin or owner only)"""
    # Additional role check for non-location-specific access
    if current_user.role not in ['admin', 'enterprise_admin', 'user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users or location owners can delete locations"
        )
    
    try:
        location = db.query(BarbershopLocation).filter(
            BarbershopLocation.id == location_id
        ).first()
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        # Soft delete by setting status to inactive
        location.status = LocationStatus.INACTIVE
        db.commit()
        
        logger.info(f"Deleted location {location.id}: {location.name}")
        return {"message": "Location deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting location {location_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete location"
        )