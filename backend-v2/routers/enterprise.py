"""
Enterprise management router for multi-location analytics and administration.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from dependencies import get_db, get_current_user
from models import User
from utils.authorization import verify_location_access
from location_models import BarbershopLocation, ChairInventory, CompensationPlan, LocationStatus, CompensationModel
from schemas import User as UserSchema
from location_schemas import (
    LocationCreate,
    LocationUpdate,
    LocationResponse
)
from services.analytics_service import AnalyticsService as EnterpriseAnalyticsService

router = APIRouter(
    prefix="/enterprise",
    tags=["enterprise"],
    dependencies=[Depends(get_current_user)]
)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user has admin or super_admin role."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user has super_admin role."""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Super admin access required"
        )
    return current_user


@router.get("/dashboard")
async def get_enterprise_dashboard(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get main enterprise dashboard data.
    
    Returns aggregated metrics across all locations including:
    - Total revenue
    - Active locations count
    - Total barbers
    - Average occupancy
    - Growth trends
    """
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        # Create DateRange object if dates are provided
        date_range = None
        if start_date and end_date:
            from schemas import DateRange
            date_range = DateRange(start_date=start_date, end_date=end_date)
        
        dashboard_data = service.get_enterprise_dashboard(
            date_range=date_range
        )
        return dashboard_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving dashboard data: {str(e)}"
        )


@router.get("/locations")
async def get_all_locations(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    List all locations with summary information.
    
    Returns list of locations with:
    - Basic location info
    - Active barber count
    - Current month revenue
    - Average rating
    """
    service = EnterpriseAnalyticsService(db)
    
    try:
        locations = service.get_locations_summary(
            include_inactive=include_inactive
        )
        return locations
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving locations: {str(e)}"
        )


@router.get("/performance-matrix")
async def get_performance_matrix(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    metrics: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get location comparison data in matrix format.
    
    Compares locations across multiple metrics:
    - Revenue
    - Client count
    - Average ticket
    - Retention rate
    - Chair occupancy
    """
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    if not metrics:
        metrics = ["revenue", "clients", "avg_ticket", "retention", "occupancy"]
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        matrix_data = service.get_performance_matrix(
            start_date=start_date,
            end_date=end_date,
            metrics=metrics
        )
        return matrix_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving performance matrix: {str(e)}"
        )


@router.get("/revenue")
async def get_aggregated_revenue(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    group_by: str = Query("day", pattern="^(day|week|month|location)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get aggregated revenue analytics across all locations.
    
    Returns revenue data grouped by specified period:
    - Total revenue
    - Revenue by location
    - Growth trends
    - Top performing locations
    """
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        revenue_data = service.get_aggregated_revenue(
            start_date=start_date,
            end_date=end_date,
            group_by=group_by
        )
        return revenue_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving revenue data: {str(e)}"
        )


@router.get("/occupancy")
@verify_location_access(location_id_param="location_id")
async def get_chair_utilization(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    location_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get chair utilization analytics across locations.
    
    Returns occupancy metrics:
    - Average occupancy rate
    - Peak hours analysis
    - Underutilized time slots
    - Occupancy by day of week
    """
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        occupancy_data = service.get_chair_utilization(
            start_date=start_date,
            end_date=end_date,
            location_id=location_id
        )
        return occupancy_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving occupancy data: {str(e)}"
        )


@router.get("/compensation")
async def get_compensation_analytics(
    model_type: Optional[str] = Query(None, pattern="^(commission|booth_rental|hybrid)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get analytics by compensation model.
    
    Compares performance across different compensation models:
    - Average revenue per barber
    - Client retention by model
    - Productivity metrics
    - Model effectiveness
    """
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        compensation_data = service.get_compensation_analytics(
            model_type=model_type,
            start_date=start_date,
            end_date=end_date
        )
        return compensation_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving compensation analytics: {str(e)}"
        )


@router.post("/locations", response_model=LocationResponse)
async def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Create a new location (super admin only).
    
    Creates a new barbershop location with:
    - Basic shop information
    - Initial configuration
    - Owner assignment
    """
    service = EnterpriseAnalyticsService(db)
    
    try:
        # Check if shop with same name already exists
        existing = db.query(BarbershopLocation).filter(
            BarbershopLocation.name == location.name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A location with this name already exists"
            )
        
        # Create new shop
        new_shop = BarbershopLocation(**location.dict())
        db.add(new_shop)
        db.commit()
        db.refresh(new_shop)
        
        return new_shop
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating location: {str(e)}"
        )


@router.put("/locations/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_update: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update location details.
    
    Updates barbershop information:
    - Shop details
    - Configuration
    - Status
    """
    shop = db.query(BarbershopLocation).filter(BarbershopLocation.id == location_id).first()
    
    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )
    
    # Super admin can update any shop, admin can only update their own
    if current_user.role == "admin" and shop.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own locations"
        )
    
    try:
        # Update fields
        update_data = location_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(shop, field, value)
        
        shop.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(shop)
        
        return shop
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating location: {str(e)}"
        )


@router.get("/locations/{location_id}/dashboard")
async def get_location_dashboard(
    location_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get dashboard data for a single location.
    
    Returns detailed analytics for specific location:
    - Revenue metrics
    - Barber performance
    - Client analytics
    - Appointment trends
    """
    shop = db.query(BarbershopLocation).filter(BarbershopLocation.id == location_id).first()
    
    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )
    
    # Admin can only view their own locations unless super admin
    if current_user.role == "admin" and shop.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own locations"
        )
    
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        dashboard_data = service.get_location_dashboard(
            location_id=location_id,
            start_date=start_date,
            end_date=end_date
        )
        return dashboard_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving location dashboard: {str(e)}"
        )


@router.get("/locations/{location_id}/barbers")
async def get_location_barbers(
    location_id: int,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get all barbers for a specific location.
    
    Returns list of barbers with:
    - Profile information
    - Performance metrics
    - Availability status
    """
    shop = db.query(BarbershopLocation).filter(BarbershopLocation.id == location_id).first()
    
    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )
    
    # Admin can only view their own locations unless super admin
    if current_user.role == "admin" and shop.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own locations"
        )
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        barbers = service.get_location_barbers(
            location_id=location_id,
            include_inactive=include_inactive
        )
        return barbers
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving barbers: {str(e)}"
        )


@router.get("/reports/executive-summary")
async def get_executive_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Get executive summary report (super admin only).
    
    High-level summary including:
    - Key performance indicators
    - Growth metrics
    - Risk indicators
    - Strategic recommendations
    """
    if not start_date:
        start_date = datetime.now() - timedelta(days=90)
    if not end_date:
        end_date = datetime.now()
    
    service = EnterpriseAnalyticsService(db)
    
    try:
        summary = service.generate_executive_summary(
            start_date=start_date,
            end_date=end_date
        )
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating executive summary: {str(e)}"
        )