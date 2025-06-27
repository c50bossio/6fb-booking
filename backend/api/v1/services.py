"""
Services API endpoints - Manage barbershop services
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import datetime

from config.database import get_db
from models.booking import Service, ServiceCategory
from models.barber import Barber
from models.location import Location
from .auth import get_current_user
from pydantic import BaseModel


router = APIRouter()


# Pydantic models for request/response
class ServiceCategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    display_order: Optional[int]
    icon: Optional[str]
    color: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class ServiceCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: Optional[int] = 0
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: bool = True


class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category_id: int
    category_name: str
    base_price: float
    min_price: Optional[float]
    max_price: Optional[float]
    duration_minutes: int
    buffer_minutes: Optional[int]
    requires_deposit: bool
    deposit_amount: Optional[float]
    deposit_type: Optional[str]
    is_addon: bool
    is_active: bool
    display_order: Optional[int]
    tags: Optional[List[str]]
    barber_id: Optional[int]
    location_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: int
    base_price: float
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    duration_minutes: int = 60
    buffer_minutes: Optional[int] = 0
    requires_deposit: bool = False
    deposit_amount: Optional[float] = None
    deposit_type: Optional[str] = None
    is_addon: bool = False
    is_active: bool = True
    display_order: Optional[int] = 0
    tags: Optional[List[str]] = []
    barber_id: Optional[int] = None
    location_id: Optional[int] = None


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    base_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    duration_minutes: Optional[int] = None
    buffer_minutes: Optional[int] = None
    requires_deposit: Optional[bool] = None
    deposit_amount: Optional[float] = None
    deposit_type: Optional[str] = None
    is_addon: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    tags: Optional[List[str]] = None


class ServiceStatsResponse(BaseModel):
    total_services: int
    active_services: int
    categories_count: int
    average_duration: float
    average_price: float
    price_range: Dict[str, float]

    class Config:
        from_attributes = True


@router.get("/categories", response_model=List[ServiceCategoryResponse])
async def get_service_categories(
    db: Session = Depends(get_db), is_active: Optional[bool] = True
):
    """Get all service categories (public endpoint)"""

    query = db.query(ServiceCategory)

    if is_active is not None:
        query = query.filter(ServiceCategory.is_active == is_active)

    categories = query.order_by(
        ServiceCategory.display_order, ServiceCategory.name
    ).all()

    return categories


@router.post("/categories", response_model=ServiceCategoryResponse)
async def create_service_category(
    category_data: ServiceCategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new service category (authenticated endpoint)"""

    # Create URL-friendly slug from name
    import re

    slug = re.sub(r"[^a-zA-Z0-9\s-]", "", category_data.name.lower())
    slug = re.sub(r"\s+", "-", slug.strip())

    # Check if category name already exists
    existing_category = (
        db.query(ServiceCategory)
        .filter(ServiceCategory.name == category_data.name)
        .first()
    )

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service category with this name already exists",
        )

    # Check if slug already exists
    existing_slug = (
        db.query(ServiceCategory).filter(ServiceCategory.slug == slug).first()
    )

    if existing_slug:
        # Add a number suffix to make it unique
        counter = 1
        original_slug = slug
        while existing_slug:
            slug = f"{original_slug}-{counter}"
            existing_slug = (
                db.query(ServiceCategory).filter(ServiceCategory.slug == slug).first()
            )
            counter += 1

    # Create new category
    new_category = ServiceCategory(
        name=category_data.name,
        slug=slug,
        description=category_data.description,
        display_order=category_data.display_order,
        icon=category_data.icon,
        color=category_data.color,
        is_active=category_data.is_active,
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


@router.put("/categories/{category_id}", response_model=ServiceCategoryResponse)
async def update_service_category(
    category_id: int,
    category_data: ServiceCategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a service category (authenticated endpoint)"""

    category = (
        db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service category not found"
        )

    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)

    # If name is being updated, update slug as well
    if "name" in update_data and update_data["name"]:
        import re

        new_slug = re.sub(r"[^a-zA-Z0-9\s-]", "", update_data["name"].lower())
        new_slug = re.sub(r"\s+", "-", new_slug.strip())

        # Check if new slug conflicts with existing categories (excluding current one)
        existing_slug = (
            db.query(ServiceCategory)
            .filter(ServiceCategory.slug == new_slug, ServiceCategory.id != category_id)
            .first()
        )

        if existing_slug:
            # Add a number suffix to make it unique
            counter = 1
            original_slug = new_slug
            while existing_slug:
                new_slug = f"{original_slug}-{counter}"
                existing_slug = (
                    db.query(ServiceCategory)
                    .filter(
                        ServiceCategory.slug == new_slug,
                        ServiceCategory.id != category_id,
                    )
                    .first()
                )
                counter += 1

        update_data["slug"] = new_slug

    for field, value in update_data.items():
        setattr(category, field, value)

    category.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(category)

    return category


@router.delete("/categories/{category_id}")
async def delete_service_category(
    category_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a service category (authenticated endpoint)"""

    category = (
        db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service category not found"
        )

    # Check if category has associated services
    services_count = (
        db.query(Service).filter(Service.category_id == category_id).count()
    )

    if services_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {services_count} associated services. Please reassign or delete the services first.",
        )

    # Soft delete by setting is_active to False
    category.is_active = False
    category.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Service category deleted successfully"}


@router.get("/stats", response_model=ServiceStatsResponse)
async def get_service_statistics(db: Session = Depends(get_db)):
    """Get service statistics (public endpoint)"""

    try:
        # Get total count of services
        total_services = db.query(Service).count()

        # Get count of active services
        active_services = db.query(Service).filter(Service.is_active == True).count()

        # Get count of unique categories
        categories_count = (
            db.query(ServiceCategory).filter(ServiceCategory.is_active == True).count()
        )

        # Calculate average duration and price for active services
        stats_query = db.query(
            func.avg(Service.duration_minutes).label("avg_duration"),
            func.avg(Service.base_price).label("avg_price"),
            func.min(Service.base_price).label("min_price"),
            func.max(Service.base_price).label("max_price"),
        ).filter(Service.is_active == True)

        stats_result = stats_query.first()

        # Handle case where there are no active services
        if stats_result and stats_result.avg_duration is not None:
            average_duration = float(stats_result.avg_duration)
            average_price = float(stats_result.avg_price)
            min_price = float(stats_result.min_price)
            max_price = float(stats_result.max_price)
        else:
            average_duration = 0.0
            average_price = 0.0
            min_price = 0.0
            max_price = 0.0

        return ServiceStatsResponse(
            total_services=total_services,
            active_services=active_services,
            categories_count=categories_count,
            average_duration=average_duration,
            average_price=average_price,
            price_range={"min": min_price, "max": max_price},
        )

    except Exception as e:
        # Log the error for debugging
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching service statistics: {str(e)}")

        # Return empty stats if database has issues
        return ServiceStatsResponse(
            total_services=0,
            active_services=0,
            categories_count=0,
            average_duration=0.0,
            average_price=0.0,
            price_range={"min": 0.0, "max": 0.0},
        )


class PaginatedServiceResponse(BaseModel):
    data: List[ServiceResponse]
    total: int
    skip: int
    limit: int


@router.get("/", response_model=PaginatedServiceResponse)
@router.get("", response_model=PaginatedServiceResponse)  # Handle requests without trailing slash
async def get_services(
    db: Session = Depends(get_db),
    category_id: Optional[int] = None,
    barber_id: Optional[int] = None,
    location_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    is_addon: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    """Get all services (public endpoint for booking system)"""

    try:
        query = db.query(Service).options(
            joinedload(Service.category),
            joinedload(Service.barber),
            joinedload(Service.location),
        )

        # Apply filters
        if category_id:
            query = query.filter(Service.category_id == category_id)

        if barber_id:
            query = query.filter(Service.barber_id == barber_id)

        if location_id:
            query = query.filter(Service.location_id == location_id)

        if is_active is not None:
            query = query.filter(Service.is_active == is_active)

        if is_addon is not None:
            query = query.filter(Service.is_addon == is_addon)

        # Get total count before pagination
        total_count = query.count()

        # Order by category and display order
        query = query.join(
            ServiceCategory, Service.category_id == ServiceCategory.id
        ).order_by(ServiceCategory.display_order, Service.display_order, Service.name)

        services = query.offset(skip).limit(limit).all()

        # Build response
        result = []
        for service in services:
            result.append(
                ServiceResponse(
                    id=service.id,
                    name=service.name,
                    description=service.description,
                    category_id=service.category_id,
                    category_name=(
                        service.category.name if service.category else "Unknown"
                    ),
                    base_price=service.base_price,
                    min_price=service.min_price,
                    max_price=service.max_price,
                    duration_minutes=service.duration_minutes,
                    buffer_minutes=service.buffer_minutes,
                    requires_deposit=service.requires_deposit or False,
                    deposit_amount=service.deposit_amount,
                    deposit_type=service.deposit_type,
                    is_addon=service.is_addon or False,
                    is_active=service.is_active,
                    display_order=service.display_order or 0,
                    tags=service.tags if service.tags else [],
                    barber_id=service.barber_id,
                    location_id=service.location_id,
                    created_at=service.created_at,
                )
            )

        return PaginatedServiceResponse(
            data=result, total=total_count, skip=skip, limit=limit
        )
    except Exception as e:
        # Log the error for debugging
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching services: {str(e)}")

        # Return empty response if database has no data yet
        return PaginatedServiceResponse(data=[], total=0, skip=skip, limit=limit)


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, db: Session = Depends(get_db)):
    """Get a specific service (public endpoint)"""

    service = (
        db.query(Service)
        .options(
            joinedload(Service.category),
            joinedload(Service.barber),
            joinedload(Service.location),
        )
        .filter(Service.id == service_id)
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
        )

    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        category_id=service.category_id,
        category_name=service.category.name if service.category else "Unknown",
        base_price=service.base_price,
        min_price=service.min_price,
        max_price=service.max_price,
        duration_minutes=service.duration_minutes,
        buffer_minutes=service.buffer_minutes,
        requires_deposit=service.requires_deposit or False,
        deposit_amount=service.deposit_amount,
        deposit_type=service.deposit_type,
        is_addon=service.is_addon or False,
        is_active=service.is_active,
        display_order=service.display_order or 0,
        tags=service.tags if service.tags else [],
        barber_id=service.barber_id,
        location_id=service.location_id,
        created_at=service.created_at,
    )


@router.post("/", response_model=ServiceResponse)
async def create_service(
    service_data: ServiceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new service (authenticated endpoint)"""

    # Verify category exists
    category = (
        db.query(ServiceCategory)
        .filter(ServiceCategory.id == service_data.category_id)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service category not found"
        )

    # Verify barber exists if specified
    if service_data.barber_id:
        barber = db.query(Barber).filter(Barber.id == service_data.barber_id).first()

        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
            )

    # Verify location exists if specified
    if service_data.location_id:
        location = (
            db.query(Location).filter(Location.id == service_data.location_id).first()
        )

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
            )

    # Create new service
    new_service = Service(
        name=service_data.name,
        description=service_data.description,
        category_id=service_data.category_id,
        base_price=service_data.base_price,
        min_price=service_data.min_price,
        max_price=service_data.max_price,
        duration_minutes=service_data.duration_minutes,
        buffer_minutes=service_data.buffer_minutes,
        requires_deposit=service_data.requires_deposit,
        deposit_amount=service_data.deposit_amount,
        deposit_type=service_data.deposit_type,
        is_addon=service_data.is_addon,
        is_active=service_data.is_active,
        display_order=service_data.display_order,
        tags=service_data.tags,
        barber_id=service_data.barber_id,
        location_id=service_data.location_id,
    )

    db.add(new_service)
    db.commit()
    db.refresh(new_service)

    # Get the service with relationships
    service = (
        db.query(Service)
        .options(
            joinedload(Service.category),
            joinedload(Service.barber),
            joinedload(Service.location),
        )
        .filter(Service.id == new_service.id)
        .first()
    )

    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        category_id=service.category_id,
        category_name=service.category.name if service.category else "Unknown",
        base_price=service.base_price,
        min_price=service.min_price,
        max_price=service.max_price,
        duration_minutes=service.duration_minutes,
        buffer_minutes=service.buffer_minutes,
        requires_deposit=service.requires_deposit or False,
        deposit_amount=service.deposit_amount,
        deposit_type=service.deposit_type,
        is_addon=service.is_addon or False,
        is_active=service.is_active,
        display_order=service.display_order or 0,
        tags=service.tags if service.tags else [],
        barber_id=service.barber_id,
        location_id=service.location_id,
        created_at=service.created_at,
    )


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a service (authenticated endpoint)"""

    service = db.query(Service).filter(Service.id == service_id).first()

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
        )

    # Update fields
    update_data = service_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(service, field, value)

    service.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(service)

    # Get the service with relationships
    service = (
        db.query(Service)
        .options(
            joinedload(Service.category),
            joinedload(Service.barber),
            joinedload(Service.location),
        )
        .filter(Service.id == service_id)
        .first()
    )

    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        category_id=service.category_id,
        category_name=service.category.name if service.category else "Unknown",
        base_price=service.base_price,
        min_price=service.min_price,
        max_price=service.max_price,
        duration_minutes=service.duration_minutes,
        buffer_minutes=service.buffer_minutes,
        requires_deposit=service.requires_deposit or False,
        deposit_amount=service.deposit_amount,
        deposit_type=service.deposit_type,
        is_addon=service.is_addon or False,
        is_active=service.is_active,
        display_order=service.display_order or 0,
        tags=service.tags if service.tags else [],
        barber_id=service.barber_id,
        location_id=service.location_id,
        created_at=service.created_at,
    )


@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a service (authenticated endpoint)"""

    service = db.query(Service).filter(Service.id == service_id).first()

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
        )

    # Soft delete by setting is_active to False
    service.is_active = False
    service.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Service deleted successfully"}


@router.post("/{service_id}/toggle-status", response_model=ServiceResponse)
async def toggle_service_status(
    service_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle service active status (authenticated endpoint)"""

    service = db.query(Service).filter(Service.id == service_id).first()

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
        )

    # Toggle the status
    service.is_active = not service.is_active
    service.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(service)

    # Get the service with relationships
    service = (
        db.query(Service)
        .options(
            joinedload(Service.category),
            joinedload(Service.barber),
            joinedload(Service.location),
        )
        .filter(Service.id == service_id)
        .first()
    )

    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        category_id=service.category_id,
        category_name=service.category.name if service.category else "Unknown",
        base_price=service.base_price,
        min_price=service.min_price,
        max_price=service.max_price,
        duration_minutes=service.duration_minutes,
        buffer_minutes=service.buffer_minutes,
        requires_deposit=service.requires_deposit or False,
        deposit_amount=service.deposit_amount,
        deposit_type=service.deposit_type,
        is_addon=service.is_addon or False,
        is_active=service.is_active,
        display_order=service.display_order or 0,
        tags=service.tags if service.tags else [],
        barber_id=service.barber_id,
        location_id=service.location_id,
        created_at=service.created_at,
    )
