"""
Commission Rate Management Router
Provides endpoints for managing and optimizing commission rates.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from db import get_db
from dependencies import get_current_user
from models import User
from services.commission_rate_manager import CommissionRateManager
from services.base_commission import CommissionType
from utils.role_permissions import Permission, PermissionChecker, get_permission_checker
from utils.financial_rate_limit import financial_rate_limit
from pydantic import BaseModel, Field
from decimal import Decimal

router = APIRouter(
    prefix="/commission-rates",
    tags=["commission-rates"]
)


# Pydantic schemas for commission rates
class CommissionRateUpdate(BaseModel):
    """Schema for updating commission rates"""
    rate: float = Field(..., ge=0, le=1, description="Commission rate (0.0 to 1.0)")
    commission_type: Optional[str] = Field(None, description="Specific commission type")


class CommissionRateResponse(BaseModel):
    """Response schema for commission rate info"""
    barber_id: int
    barber_name: str
    base_commission_rate: float
    rates: Dict[str, float]
    projections: Dict[str, Any]
    last_updated: datetime
    rate_status: str


class CommissionOptimizationResponse(BaseModel):
    """Response schema for commission optimization"""
    barber_id: int
    current_rates: Dict[str, float]
    recommendations: List[Dict[str, Any]]
    optimization_score: int
    generated_at: datetime


class CommissionSimulationRequest(BaseModel):
    """Request schema for commission simulation"""
    commission_type: str = Field(..., description="Type of commission: service, retail, pos")
    new_rate: float = Field(..., ge=0, le=1, description="New rate to simulate")
    monthly_volume: float = Field(..., gt=0, description="Expected monthly transaction volume")
    average_transaction: float = Field(..., gt=0, description="Average transaction amount")


class CommissionSimulationResponse(BaseModel):
    """Response schema for commission simulation"""
    current_earnings: float
    projected_earnings: float
    earnings_change: float
    earnings_change_percent: float
    monthly_transactions: int
    recommendations: List[str]


@router.get("/{barber_id}", response_model=CommissionRateResponse)
@financial_rate_limit
async def get_barber_commission_rates(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_checker: PermissionChecker = Depends(get_permission_checker)
):
    """Get commission rates for a specific barber"""
    # Check permissions
    if current_user.role == "barber" and current_user.id != barber_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other barbers' commission rates"
        )
    elif current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view commission rates"
        )
    
    try:
        rate_manager = CommissionRateManager(db)
        summary = rate_manager.get_commission_summary(barber_id)
        
        return CommissionRateResponse(
            barber_id=summary['barber_id'],
            barber_name=summary['barber_name'],
            base_commission_rate=float(summary['base_commission_rate']),
            rates={k: float(v) for k, v in summary['rates'].items()},
            projections=summary['projections'],
            last_updated=summary['last_updated'],
            rate_status=summary['rate_status']
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving commission rates"
        )


@router.get("/", response_model=List[CommissionRateResponse])
@financial_rate_limit
async def get_all_commission_rates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_checker: PermissionChecker = Depends(get_permission_checker)
):
    """Get commission rates for all barbers (admin only)"""
    permission_checker.require_permission(Permission.VIEW_ALL_ANALYTICS)
    
    try:
        rate_manager = CommissionRateManager(db)
        all_rates = rate_manager.get_all_barber_rates()
        
        return [
            CommissionRateResponse(
                barber_id=summary['barber_id'],
                barber_name=summary['barber_name'],
                base_commission_rate=float(summary['base_commission_rate']),
                rates={k: float(v) for k, v in summary['rates'].items()},
                projections=summary['projections'],
                last_updated=summary['last_updated'],
                rate_status=summary['rate_status']
            )
            for summary in all_rates
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving commission rates"
        )


@router.put("/{barber_id}")
@financial_rate_limit
async def update_commission_rate(
    barber_id: int,
    rate_update: CommissionRateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_checker: PermissionChecker = Depends(get_permission_checker)
):
    """Update commission rate for a barber (admin only)"""
    permission_checker.require_permission(Permission.MANAGE_FINANCIAL_SETTINGS)
    
    try:
        rate_manager = CommissionRateManager(db)
        
        # Convert commission type string to enum if provided
        commission_type = None
        if rate_update.commission_type:
            try:
                commission_type = CommissionType(rate_update.commission_type)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid commission type: {rate_update.commission_type}"
                )
        
        success = rate_manager.set_barber_commission_rate(
            barber_id=barber_id,
            rate=Decimal(str(rate_update.rate)),
            commission_type=commission_type
        )
        
        if success:
            return {"message": "Commission rate updated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update commission rate"
            )
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating commission rate"
        )


@router.get("/{barber_id}/optimize", response_model=CommissionOptimizationResponse)
@financial_rate_limit
async def get_commission_optimization(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_checker: PermissionChecker = Depends(get_permission_checker)
):
    """Get commission rate optimization recommendations"""
    # Check permissions
    if current_user.role == "barber" and current_user.id != barber_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other barbers' optimization"
        )
    elif current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view commission optimization"
        )
    
    try:
        rate_manager = CommissionRateManager(db)
        optimization = rate_manager.optimize_commission_rates(barber_id)
        
        return CommissionOptimizationResponse(
            barber_id=optimization['barber_id'],
            current_rates={k: float(v) for k, v in optimization['current_rates'].items()},
            recommendations=optimization['recommendations'],
            optimization_score=optimization['optimization_score'],
            generated_at=optimization['generated_at']
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating optimization recommendations"
        )


@router.post("/simulate", response_model=CommissionSimulationResponse)
@financial_rate_limit
async def simulate_commission_change(
    simulation: CommissionSimulationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simulate the impact of commission rate changes"""
    # Any authenticated user can simulate
    try:
        # Convert commission type to enum
        try:
            commission_type = CommissionType(simulation.commission_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid commission type: {simulation.commission_type}"
            )
        
        # Get current rate for user
        rate_manager = CommissionRateManager(db)
        
        if current_user.role == "barber":
            current_rate = rate_manager.get_barber_commission_rate(
                current_user.id, commission_type
            )
        else:
            # Use default rates for non-barbers
            from services.base_commission import UnifiedCommissionService
            commission_service = UnifiedCommissionService()
            default_rates = commission_service.get_default_rates()
            current_rate = default_rates.get(commission_type.value, Decimal('0.20'))
        
        # Calculate monthly transactions
        monthly_transactions = int(simulation.monthly_volume / simulation.average_transaction)
        
        # Calculate earnings
        if commission_type == CommissionType.SERVICE:
            # For services, barber gets (1 - rate) of the amount
            current_earnings = float(simulation.monthly_volume * (1 - float(current_rate)))
            projected_earnings = float(simulation.monthly_volume * (1 - simulation.new_rate))
        else:
            # For retail/POS, barber gets the commission amount
            current_earnings = float(simulation.monthly_volume * float(current_rate))
            projected_earnings = float(simulation.monthly_volume * simulation.new_rate)
        
        earnings_change = projected_earnings - current_earnings
        earnings_change_percent = (earnings_change / current_earnings * 100) if current_earnings > 0 else 0
        
        # Generate recommendations
        recommendations = []
        
        if commission_type == CommissionType.SERVICE:
            if simulation.new_rate > float(current_rate) * 1.2:
                recommendations.append("Consider gradual rate increases to maintain barber satisfaction")
            if simulation.new_rate < 0.10:
                recommendations.append("Very low commission rates may impact platform sustainability")
        else:
            if simulation.new_rate < float(current_rate) * 0.8:
                recommendations.append("Significant rate reduction may discourage retail sales")
            if simulation.new_rate > 0.30:
                recommendations.append("High retail commission rates may impact product margins")
        
        if monthly_transactions < 50:
            recommendations.append("Low transaction volume - consider promotional strategies")
        
        return CommissionSimulationResponse(
            current_earnings=current_earnings,
            projected_earnings=projected_earnings,
            earnings_change=earnings_change,
            earnings_change_percent=earnings_change_percent,
            monthly_transactions=monthly_transactions,
            recommendations=recommendations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error simulating commission changes"
        )