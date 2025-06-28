"""
Revenue and commission management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal

from config.database import get_db
from models.user import User
from models.barber import Barber
from services.revenue_sharing import RevenueManagementService
from services.rbac_service import RBACService, Permission
from .auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


# Pydantic models
class CommissionCalculationResponse(BaseModel):
    barber_id: int
    barber_name: str
    period_start: date
    period_end: date
    gross_revenue: float
    base_commission: float
    certification_bonus: float
    performance_bonus: float
    total_commission: float
    franchise_fee: float
    mentor_override: float
    net_payout: float
    tax_withholding: float
    final_payout: float


class LocationRevenueResponse(BaseModel):
    location_info: Dict[str, Any]
    period: Dict[str, Any]
    totals: Dict[str, Any]
    barber_breakdowns: List[Dict[str, Any]]
    revenue_streams: Dict[str, Any]


class NetworkRevenueResponse(BaseModel):
    period: Dict[str, Any]
    network_totals: Dict[str, Any]
    location_performance: List[Dict[str, Any]]
    commission_distribution: Dict[str, Any]
    top_earners: List[Dict[str, Any]]


class PayoutReportResponse(BaseModel):
    barber_info: Dict[str, Any]
    period: Dict[str, Any]
    summary: Dict[str, Any]
    commission_structure: Dict[str, Any]
    appointment_details: List[Dict[str, Any]]
    statistics: Dict[str, Any]


class BulkPayoutResponse(BaseModel):
    period: Dict[str, Any]
    processed_count: int
    total_amount: float
    barber_payouts: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]


# API Endpoints
@router.get("/commission/{barber_id}", response_model=CommissionCalculationResponse)
async def calculate_barber_commission(
    barber_id: int,
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate commission for a barber for given period"""
    rbac = RBACService(db)

    # Default to last month if dates not provided
    if not end_date:
        end_date = date.today().replace(day=1) - timedelta(days=1)
    if not start_date:
        start_date = end_date.replace(day=1)

    # Get barber
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    if barber.user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.VIEW_PAYOUTS):
            if not rbac.has_permission(current_user, Permission.MANAGE_COMMISSIONS):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view commission data",
                )

    # Calculate commission
    service = RevenueManagementService(db)
    payout = await service.calculate_barber_commission(barber_id, start_date, end_date)

    return CommissionCalculationResponse(
        barber_id=barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        period_start=start_date,
        period_end=end_date,
        gross_revenue=float(payout.gross_revenue),
        base_commission=float(payout.base_commission),
        certification_bonus=float(payout.certification_bonus),
        performance_bonus=float(payout.performance_bonus),
        total_commission=float(payout.total_commission),
        franchise_fee=float(payout.franchise_fee),
        mentor_override=float(payout.mentor_override),
        net_payout=float(payout.net_payout),
        tax_withholding=float(payout.tax_withholding),
        final_payout=float(payout.final_payout),
    )


@router.get("/location/{location_id}/revenue", response_model=LocationRevenueResponse)
async def get_location_revenue_breakdown(
    location_id: int,
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get revenue breakdown for a location"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view revenue data",
        )

    # Check location access
    accessible_locations = rbac.get_accessible_locations(current_user)
    if location_id not in accessible_locations and not rbac.has_permission(
        current_user, Permission.VIEW_ALL_ANALYTICS
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view revenue for this location",
        )

    # Default dates
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get revenue breakdown
    service = RevenueManagementService(db)
    breakdown = await service.calculate_location_revenue_breakdown(
        location_id, start_date, end_date
    )

    return LocationRevenueResponse(**breakdown)


@router.get("/network/analytics", response_model=NetworkRevenueResponse)
async def get_network_revenue_analytics(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get network-wide revenue analytics"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view network revenue data",
        )

    # Default dates
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get network analytics
    service = RevenueManagementService(db)
    analytics = await service.get_network_revenue_analytics(start_date, end_date)

    return NetworkRevenueResponse(**analytics)


@router.get("/payout-report/{barber_id}", response_model=PayoutReportResponse)
async def generate_payout_report(
    barber_id: int,
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate detailed payout report for a barber"""
    rbac = RBACService(db)

    # Get barber
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    if barber.user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.VIEW_PAYOUTS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view payout reports",
            )

    # Default dates
    if not end_date:
        end_date = date.today().replace(day=1) - timedelta(days=1)
    if not start_date:
        start_date = end_date.replace(day=1)

    # Generate report
    service = RevenueManagementService(db)
    report = await service.generate_payout_report(barber_id, start_date, end_date)

    return PayoutReportResponse(**report)


@router.post("/process-payouts", response_model=BulkPayoutResponse)
async def process_bulk_payouts(
    location_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process bulk payouts for location or entire network"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_COMMISSIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to process payouts",
        )

    # If location specified, check access
    if location_id:
        accessible_locations = rbac.get_accessible_locations(current_user)
        if location_id not in accessible_locations and not rbac.has_permission(
            current_user, Permission.MANAGE_ALL_LOCATIONS
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to process payouts for this location",
            )

    # Process payouts
    service = RevenueManagementService(db)
    results = await service.process_bulk_payouts(location_id, start_date, end_date)

    return BulkPayoutResponse(**results)


@router.get("/commission-structures")
async def get_commission_structures(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get commission structure details"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
        # Regular users can only see their own structure
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No commission structure available",
            )

        service = RevenueManagementService(db)
        cert_level = service._get_barber_certification_level(barber.id)
        structure = service.commission_structures.get(
            cert_level, service.commission_structures["no_certification"]
        )

        return {
            cert_level: {
                "base_percentage": structure.base_percentage,
                "certification_bonus": structure.certification_bonus,
                "performance_bonus": structure.performance_bonus,
                "mentor_override": structure.mentor_override,
                "franchise_fee": structure.franchise_fee,
            }
        }

    # Admin can see all structures
    service = RevenueManagementService(db)
    return {
        level: {
            "base_percentage": structure.base_percentage,
            "certification_bonus": structure.certification_bonus,
            "performance_bonus": structure.performance_bonus,
            "mentor_override": structure.mentor_override,
            "franchise_fee": structure.franchise_fee,
        }
        for level, structure in service.commission_structures.items()
    }


@router.get("/revenue-trends")
async def get_revenue_trends(
    period_months: int = Query(6, ge=1, le=24),
    location_id: Optional[int] = None,
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get revenue trend data"""
    rbac = RBACService(db)

    # Check permissions based on scope
    if barber_id:
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")

        if barber.user_id != current_user.id:
            if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
                raise HTTPException(status_code=403, detail="No permission")

    elif location_id:
        accessible_locations = rbac.get_accessible_locations(current_user)
        if location_id not in accessible_locations and not rbac.has_permission(
            current_user, Permission.VIEW_ALL_ANALYTICS
        ):
            raise HTTPException(status_code=403, detail="No permission")

    else:
        if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
            raise HTTPException(status_code=403, detail="No permission")

    # Generate trend data (simplified)
    end_date = date.today()
    trends = []

    for i in range(period_months):
        month_end = end_date.replace(day=1) - timedelta(days=1)
        month_start = month_end.replace(day=1)

        # Mock data - in real implementation, calculate from actual data
        revenue = 50000 + (i * 2000)  # Growing revenue

        trends.append(
            {
                "month": month_end.strftime("%Y-%m"),
                "revenue": revenue,
                "growth_percentage": (
                    (revenue / (revenue - 2000) - 1) * 100 if i > 0 else 0
                ),
            }
        )

        end_date = month_start - timedelta(days=1)

    trends.reverse()  # Chronological order

    return {
        "period_months": period_months,
        "location_id": location_id,
        "barber_id": barber_id,
        "trends": trends,
    }
