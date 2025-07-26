"""
Location-based authorization utilities for the BookedBarber application.

This module provides decorators and utilities for verifying that users have
appropriate access to location-specific resources.
"""

from functools import wraps
from typing import List
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from db import get_db
from utils.auth import get_current_user
import inspect


def verify_location_access(
    location_id_param: str = "location_id",
    allow_admin: bool = True,
    allow_owner: bool = True,
    allow_manager: bool = True,
    check_primary_location: bool = True,
    check_barber_locations: bool = True
):
    """
    Decorator that verifies if the current user has access to a specific location.
    
    This decorator can be used on FastAPI endpoints to ensure that users can only
    access location-specific data they are authorized to see.
    
    Args:
        location_id_param: The name of the parameter containing the location ID
        allow_admin: Whether admins should have access to all locations
        allow_owner: Whether location owners should have access
        allow_manager: Whether location managers should have access
        check_primary_location: Check if location matches user's primary location_id
        check_barber_locations: Check if user has access through barber_locations table
    
    Usage:
        @router.get("/commissions/{location_id}")
        @verify_location_access()
        async def get_location_commissions(
            location_id: int,
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db)
        ):
            # Endpoint logic here
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            location_id = kwargs.get(location_id_param)
            
            # If no location_id is provided, skip authorization
            if location_id is None:
                return await func(*args, **kwargs)
            
            # Verify we have required dependencies
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing required dependencies for location authorization"
                )
            
            # Check if user has access to the location
            if not has_location_access(
                user=current_user,
                location_id=location_id,
                db=db,
                allow_admin=allow_admin,
                allow_owner=allow_owner,
                allow_manager=allow_manager,
                check_primary_location=check_primary_location,
                check_barber_locations=check_barber_locations
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You do not have access to location {location_id}"
                )
            
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            location_id = kwargs.get(location_id_param)
            
            # If no location_id is provided, skip authorization
            if location_id is None:
                return func(*args, **kwargs)
            
            # Verify we have required dependencies
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing required dependencies for location authorization"
                )
            
            # Check if user has access to the location
            if not has_location_access(
                user=current_user,
                location_id=location_id,
                db=db,
                allow_admin=allow_admin,
                allow_owner=allow_owner,
                allow_manager=allow_manager,
                check_primary_location=check_primary_location,
                check_barber_locations=check_barber_locations
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You do not have access to location {location_id}"
                )
            
            return func(*args, **kwargs)
        
        # Return appropriate wrapper based on whether function is async
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def has_location_access(
    user,  # User model
    location_id: int,
    db: Session,
    allow_admin: bool = True,
    allow_owner: bool = True,
    allow_manager: bool = True,
    check_primary_location: bool = True,
    check_barber_locations: bool = True
) -> bool:
    """
    Check if a user has access to a specific location.
    
    Args:
        user: The user to check
        location_id: The location ID to check access for
        db: Database session
        allow_admin: Whether admins should have access to all locations
        allow_owner: Whether location owners should have access
        allow_manager: Whether location managers should have access
        check_primary_location: Check if location matches user's primary location_id
        check_barber_locations: Check if user has access through barber_locations table
    
    Returns:
        bool: True if user has access, False otherwise
    """
    # Super admins and admins (if allowed) have access to all locations
    if user.role in ["super_admin"]:
        return True
    
    if user.role == "admin" and allow_admin:
        return True
    
    # Import here to avoid circular imports
    from location_models import BarbershopLocation
    
    # Get the location
    location = db.query(BarbershopLocation).filter(BarbershopLocation.id == location_id).first()
    if not location:
        # Location doesn't exist
        return False
    
    # Check if user is the owner
    if allow_owner and location.owner_id == user.id:
        return True
    
    # Check if user is the manager
    if allow_manager and location.manager_id == user.id:
        return True
    
    # Check primary location
    if check_primary_location and hasattr(user, 'location_id') and user.location_id == location_id:
        return True
    
    # Check barber locations (many-to-many relationship)
    if check_barber_locations:
        # Import here to avoid circular imports
        from location_models import BarberLocation
        
        barber_location = db.query(BarberLocation).filter(
            BarberLocation.barber_id == user.id,
            BarberLocation.location_id == location_id,
            BarberLocation.is_active == True
        ).first()
        
        if barber_location:
            return True
    
    return False


def get_user_locations(user, db: Session) -> List[int]:
    """
    Get all location IDs that a user has access to.
    
    Args:
        user: The user to get locations for
        db: Database session
    
    Returns:
        List[int]: List of location IDs the user has access to
    """
    location_ids = set()
    
    # Super admins and admins have access to all locations
    if user.role in ["super_admin", "admin"]:
        from location_models import BarbershopLocation
        locations = db.query(BarbershopLocation.id).all()
        return [loc[0] for loc in locations]
    
    # Add primary location if exists
    if hasattr(user, 'location_id') and user.location_id:
        location_ids.add(user.location_id)
    
    # Add locations where user is owner or manager
    from location_models import BarbershopLocation
    owned_or_managed = db.query(BarbershopLocation.id).filter(
        (BarbershopLocation.owner_id == user.id) | 
        (BarbershopLocation.manager_id == user.id)
    ).all()
    
    for loc in owned_or_managed:
        location_ids.add(loc[0])
    
    # Add locations from barber_locations table
    from location_models import BarberLocation
    
    barber_locations = db.query(BarberLocation.location_id).filter(
        BarberLocation.barber_id == user.id,
        BarberLocation.is_active == True
    ).all()
    
    for loc in barber_locations:
        location_ids.add(loc[0])
    
    return list(location_ids)


def require_location_access(
    location_id: int,
    allow_admin: bool = True,
    allow_owner: bool = True,
    allow_manager: bool = True
):
    """
    Dependency function that can be used directly in FastAPI endpoints.
    
    Usage:
        @router.get("/data")
        async def get_data(
            location_id: int,
            has_access: bool = Depends(require_location_access),
            current_user = Depends(get_current_user),
            db: Session = Depends(get_db)
        ):
            # Endpoint logic here
    """
    def dependency(
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> bool:
        if not has_location_access(
            user=current_user,
            location_id=location_id,
            db=db,
            allow_admin=allow_admin,
            allow_owner=allow_owner,
            allow_manager=allow_manager
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have access to location {location_id}"
            )
        return True
    
    return dependency


def filter_by_user_locations(query, model, user, db: Session):
    """
    Filter a SQLAlchemy query to only include records from locations the user has access to.
    
    Args:
        query: SQLAlchemy query object
        model: The model being queried (must have location_id field)
        user: The current user
        db: Database session
    
    Returns:
        Filtered query
    """
    # Get user's accessible locations
    user_locations = get_user_locations(user, db)
    
    # If user has no locations, return empty result
    if not user_locations:
        return query.filter(model.location_id == -1)  # Impossible condition
    
    # Filter by user's locations
    return query.filter(model.location_id.in_(user_locations))


def verify_franchise_access(
    user,  # User model
    entity_type: str,
    entity_id: int,
    db: Session,
    required_role: str = "franchise_admin"
) -> bool:
    """
    Verify if a user has access to franchise entities (networks, regions, groups).
    
    Args:
        user: The user to check
        entity_type: Type of entity ("network", "region", "group", "location")
        entity_id: ID of the entity to check access for
        db: Database session
        required_role: Minimum role required for access
    
    Returns:
        bool: True if user has access, False otherwise
    """
    # Super admins have access to everything
    if user.role == "super_admin":
        return True
    
    # Check minimum role requirement
    if required_role == "franchise_admin" and user.role not in ["admin", "super_admin", "franchise_admin"]:
        return False
    elif required_role == "admin" and user.role not in ["admin", "super_admin"]:
        return False
    
    # For now, franchise admins and above have access to all franchise entities
    # In a more complex implementation, you could check specific entity permissions
    if user.role in ["admin", "super_admin", "franchise_admin"]:
        return True
    
    # Regular users don't have franchise access
    return False