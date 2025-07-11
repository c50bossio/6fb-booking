
import logging
logger = logging.getLogger(__name__)

"""
Commission management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import csv
import io

from database import get_db
from dependencies import get_current_user
from models import User
from services.commission_service import CommissionService
from services.base_commission import UnifiedCommissionService, CommissionType
from services.commission_rate_manager import CommissionRateManager
from utils.rate_limit import commission_report_rate_limit
from schemas_new.commission import (
    CommissionReportBarber, CommissionReportAdmin,
    CommissionSummaryBarber, CommissionSummaryAdmin,
    PayoutPreviewBarber, PayoutPreviewAdmin,
    filter_commission_response
)
from utils.logging_config import get_audit_logger
from utils.error_handling import AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, PaymentError, IntegrationError, safe_endpoint

router = APIRouter(
    prefix="/commissions",
    tags=["commissions"]
)

commission_audit_logger = get_audit_logger()

@router.get("")
@commission_report_rate_limit
def get_commissions(
    request: Request,
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    start_date: Optional[datetime] = Query(None, description="Start date for period"),
    end_date: Optional[datetime] = Query(None, description="End date for period"),
    unpaid_only: bool = Query(False, description="Only show unpaid commissions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get commission summary for barbers.
    
    - Barbers can only see their own commissions
    - Admins can see all barbers' commissions
    """
    # Set default date range if not provided (current month)
    if not start_date:
        start_date = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Check permissions
    if current_user.role == "barber":
        # Barbers can only see their own data
        barber_id = current_user.id
    elif current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view commissions"
        )
    
    commission_service = CommissionService(db)
    
    # Get commission data
    if barber_id:
        # Single barber report
        commission_data = commission_service.get_total_barber_commissions(
            barber_id=barber_id,
            start_date=start_date,
            end_date=end_date,
            unpaid_only=unpaid_only
        )
        
        # Get barber info
        barber = db.query(User).filter(User.id == barber_id).first()
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Barber not found"
            )
        
        # Create summary
        summary = {
            "barber_id": barber_id,
            "barber_name": barber.name,
            "period_start": start_date,
            "period_end": end_date,
            "service_commission": commission_data["service_commission"],
            "retail_commission": commission_data["retail_commission"],
            "total_commission": commission_data["total_commission"],
            "items_count": commission_data["service_payments_count"] + commission_data["retail_items_count"],
            "paid_amount": 0,  # TODO: Calculate from payout history
            "pending_amount": commission_data["total_commission"]  # TODO: Subtract paid amount
        }
        
        # Filter response based on role
        filtered_data = filter_commission_response(
            summary, 
            current_user.role, 
            current_user.id, 
            barber_id
        )
        
        return [filtered_data]
    else:
        # All barbers report (admin only)
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view all barbers' commissions"
            )
        
        # Get all barbers
        barbers = db.query(User).filter(User.role == "barber").all()
        
        summaries = []
        for barber in barbers:
            commission_data = commission_service.get_total_barber_commissions(
                barber_id=barber.id,
                start_date=start_date,
                end_date=end_date,
                unpaid_only=unpaid_only
            )
            
            summary = {
                "barber_id": barber.id,
                "barber_name": barber.name,
                "period_start": start_date,
                "period_end": end_date,
                "service_commission": commission_data["service_commission"],
                "retail_commission": commission_data["retail_commission"],
                "total_commission": commission_data["total_commission"],
                "items_count": commission_data["service_payments_count"] + commission_data["retail_items_count"],
                "paid_amount": 0,  # TODO: Calculate from payout history
                "pending_amount": commission_data["total_commission"]  # TODO: Subtract paid amount
            }
            
            summaries.append(summary)
        
        return summaries

@router.get("/{barber_id}")
@commission_report_rate_limit
def get_barber_commission_details(
    request: Request,
    barber_id: int,
    start_date: Optional[datetime] = Query(None, description="Start date for period"),
    end_date: Optional[datetime] = Query(None, description="End date for period"),
    unpaid_only: bool = Query(False, description="Only show unpaid commissions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed commission report for a specific barber.
    
    - Barbers can only see their own details
    - Admins can see any barber's details
    """
    # Check permissions
    if current_user.role == "barber" and current_user.id != barber_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other barbers' commissions"
        )
    elif current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view commission details"
        )
    
    # Set default date range if not provided
    if not start_date:
        start_date = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.utcnow()
    
    commission_service = CommissionService(db)
    
    # Get detailed commission data
    commission_data = commission_service.get_total_barber_commissions(
        barber_id=barber_id,
        start_date=start_date,
        end_date=end_date,
        unpaid_only=unpaid_only
    )
    
    # Get retail breakdown details
    retail_breakdown = commission_data.get("retail_breakdown", {})
    
    # Create detailed report
    report = {
        "barber_id": barber_id,
        "period_start": start_date,
        "period_end": end_date,
        "unpaid_only": unpaid_only,
        "service_commission": commission_data["service_commission"],
        "retail_commission": commission_data["retail_commission"],
        "total_commission": commission_data["total_commission"],
        "items": []
    }
    
    # Add retail items to report
    if retail_breakdown:
        # Order items
        for item in retail_breakdown.get("order_items", []):
            report["items"].append({
                "id": item["id"],
                "type": "order_item",
                "title": item["title"],
                "commission_amount": item["commission_amount"],
                "commission_rate": item["commission_rate"],
                "line_total": item["line_total"],
                "commission_paid": item["commission_paid"]
            })
        
        # POS transactions
        for trans in retail_breakdown.get("pos_transactions", []):
            report["items"].append({
                "id": trans["id"],
                "type": "pos_transaction",
                "title": f"POS Transaction {trans['transaction_number']}",
                "commission_amount": trans["commission_amount"],
                "commission_rate": trans["commission_rate"],
                "line_total": trans["subtotal"],
                "commission_paid": trans["commission_paid"]
            })
    
    # Filter response based on role
    filtered_report = filter_commission_response(
        report,
        current_user.role,
        current_user.id,
        barber_id
    )
    
    return filtered_report

@router.get("/preview/payout")
@commission_report_rate_limit
def preview_payout(
    request: Request,
    barber_id: int = Query(..., description="Barber ID"),
    include_retail: bool = Query(True, description="Include retail commissions"),
    start_date: Optional[datetime] = Query(None, description="Start date for period"),
    end_date: Optional[datetime] = Query(None, description="End date for period"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Preview payout amount for a barber.
    
    - Barbers can preview their own payouts
    - Admins can preview any barber's payout
    """
    # Check permissions
    if current_user.role == "barber" and current_user.id != barber_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to preview other barbers' payouts"
        )
    elif current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to preview payouts"
        )
    
    commission_service = CommissionService(db)
    
    # Calculate payout amount
    payout_data = commission_service.calculate_barber_payout_amount(
        barber_id=barber_id,
        include_retail=include_retail,
        start_date=start_date,
        end_date=end_date
    )
    
    # Create preview based on role
    if current_user.role in ["admin", "super_admin"]:
        preview = PayoutPreviewAdmin(
            barber_id=barber_id,
            include_retail=include_retail,
            service_amount=payout_data["service_amount"],
            retail_amount=payout_data["retail_amount"],
            total_payout=payout_data["total_payout"],
            service_payments_count=payout_data["service_payments_count"],
            retail_items_count=payout_data["retail_breakdown"]["order_items_count"] + 
                               payout_data["retail_breakdown"]["pos_transactions_count"] if payout_data["retail_breakdown"] else 0,
            retail_breakdown=payout_data["retail_breakdown"]
        )
    else:
        preview = PayoutPreviewBarber(
            barber_id=barber_id,
            include_retail=include_retail,
            total_payout=payout_data["total_payout"]
        )
    
    return preview

@router.get("/export")
@commission_report_rate_limit
def export_commissions(
    request: Request,
    format: str = Query("csv", description="Export format (csv or pdf)"),
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    start_date: Optional[datetime] = Query(None, description="Start date for period"),
    end_date: Optional[datetime] = Query(None, description="End date for period"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export commission data as CSV or PDF.
    
    - Barbers can only export their own data
    - Admins can export all data
    """
    # Check permissions
    if current_user.role == "barber":
        barber_id = current_user.id
    elif current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export commissions"
        )
    
    # Get commission data (reuse the get_commissions logic)
    commission_data = get_commissions(
        request=request,
        barber_id=barber_id,
        start_date=start_date,
        end_date=end_date,
        unpaid_only=False,
        current_user=current_user,
        db=db
    )
    
    if format == "csv":
        # Create CSV
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "barber_name", "period_start", "period_end",
            "service_commission", "retail_commission", "total_commission",
            "items_count", "pending_amount"
        ])
        
        writer.writeheader()
        for row in commission_data:
            writer.writerow({
                "barber_name": row.get("barber_name", ""),
                "period_start": row.get("period_start", "").strftime("%Y-%m-%d") if isinstance(row.get("period_start"), datetime) else "",
                "period_end": row.get("period_end", "").strftime("%Y-%m-%d") if isinstance(row.get("period_end"), datetime) else "",
                "service_commission": row.get("service_commission", 0),
                "retail_commission": row.get("retail_commission", 0),
                "total_commission": row.get("total_commission", 0),
                "items_count": row.get("items_count", 0),
                "pending_amount": row.get("pending_amount", 0)
            })
        
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=commissions_{datetime.utcnow().strftime('%Y%m%d')}.csv"
            }
        )
    
    elif format == "pdf":
        # PDF generation would require additional library like reportlab
        # For now, return not implemented
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF export not yet implemented"
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid format. Use 'csv' or 'pdf'"
        )

@router.get("/rates/{barber_id}")
@commission_report_rate_limit
def get_barber_commission_rates(
    request: Request,
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get commission rates for a specific barber using unified framework.
    
    - Barbers can only see their own rates
    - Admins can see any barber's rates
    """
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
        commission_summary = rate_manager.get_commission_summary(barber_id)
        
        return commission_summary
        
    except ValueError as e:
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise NotFoundError()
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.put("/rates/{barber_id}")
@commission_report_rate_limit
def update_barber_commission_rate(
    request: Request,
    barber_id: int,
    rate: float = Query(..., description="New commission rate (0.0 to 1.0)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update commission rate for a barber using unified framework.
    
    - Only admins can update commission rates
    """
    # Check permissions
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update commission rates"
        )
    
    try:
        from decimal import Decimal
        rate_decimal = Decimal(str(rate))
        
        rate_manager = CommissionRateManager(db)
        
        # Get current rate for audit logging
        try:
            current_summary = rate_manager.get_commission_summary(barber_id)
            old_rate = current_summary.get("current_commission_rate", 0)
        except:
            old_rate = 0
        
        success = rate_manager.set_barber_commission_rate(barber_id, rate_decimal)
        
        if success:
            # Log commission rate update
            commission_audit_logger.log_financial_adjustment(
                admin_user_id=str(current_user.id),
                target_user_id=str(barber_id),
                adjustment_type="commission_rate_update",
                amount=0.0,  # Rate change, not monetary adjustment
                reason="commission_rate_adjustment",
                reference_id=f"barber_{barber_id}_rate_update",
                before_balance=float(old_rate),
                after_balance=float(rate_decimal),
                success=True,
                details={
                    "old_commission_rate": float(old_rate),
                    "new_commission_rate": float(rate_decimal),
                    "rate_change": float(rate_decimal) - float(old_rate),
                    "initiated_by_role": current_user.role,
                    "adjustment_type": "commission_rate"
                }
            )
            
            return {
                "success": True,
                "barber_id": barber_id,
                "new_rate": rate_decimal,
                "message": "Commission rate updated successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update commission rate"
            )
            
    except ValueError as e:
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise ValidationError("Request validation failed")
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.post("/calculate")
@commission_report_rate_limit
def calculate_commission_preview(
    request: Request,
    barber_id: int = Query(..., description="Barber ID"),
    commission_type: str = Query(..., description="Commission type: service, retail, or pos"),
    amount: float = Query(..., description="Amount to calculate commission on"),
    product_id: Optional[int] = Query(None, description="Product ID for product-specific rates"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate commission preview using unified framework.
    
    - Barbers can calculate for themselves
    - Admins can calculate for any barber
    """
    # Check permissions
    if current_user.role == "barber" and current_user.id != barber_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to calculate commissions for other barbers"
        )
    elif current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to calculate commissions"
        )
    
    try:
        from decimal import Decimal
        
        # Validate commission type
        commission_type_map = {
            "service": CommissionType.SERVICE,
            "retail": CommissionType.RETAIL,
            "pos": CommissionType.POS
        }
        
        if commission_type not in commission_type_map:
            raise ValueError(f"Invalid commission type. Use: {', '.join(commission_type_map.keys())}")
        
        commission_service = CommissionService(db)
        result = commission_service.calculate_comprehensive_commission(
            barber_id=barber_id,
            commission_type=commission_type_map[commission_type],
            amount=Decimal(str(amount)),
            product_id=product_id
        )
        
        # Log commission calculation API operation
        commission_audit_logger.log_admin_event(
            event_type="commission_calculation_api",
            admin_user_id=str(current_user.id),
            target_user_id=str(barber_id),
            action="calculate_commission_preview",
            details={
                "commission_type": commission_type,
                "input_amount": amount,
                "product_id": product_id,
                "calculated_commission": float(result.get('commission_amount', 0)),
                "commission_rate": float(result.get('commission_rate', 0)),
                "initiated_by_role": current_user.role,
                "calculation_framework": "unified"
            }
        )
        
        return {
            "barber_id": barber_id,
            "commission_type": commission_type,
            "input_amount": amount,
            "calculation_result": result
        }
        
    except ValueError as e:
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise ValidationError("Request validation failed")
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/optimize/{barber_id}")
@commission_report_rate_limit
def get_commission_optimization(
    request: Request,
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get commission rate optimization recommendations for a barber.
    
    - Barbers can see their own optimization suggestions
    - Admins can see optimization for any barber
    """
    # Check permissions
    if current_user.role == "barber" and current_user.id != barber_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view optimization for other barbers"
        )
    elif current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view commission optimization"
        )
    
    try:
        rate_manager = CommissionRateManager(db)
        optimization = rate_manager.optimize_commission_rates(barber_id)
        
        return optimization
        
    except ValueError as e:
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise NotFoundError()
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)