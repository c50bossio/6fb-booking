"""
Enhanced Payment API Endpoints
Provides multi-gateway payment capabilities while maintaining backward compatibility
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Path
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import datetime
from database import get_db
from services.enhanced_payment_service import (
    enhanced_payment_service,
    create_payment_intent_enhanced,
    confirm_payment_enhanced,
    process_refund_enhanced
)
from utils.rate_limit import payment_intent_rate_limit, payment_confirm_rate_limit, refund_rate_limit
from utils.input_validation import validate_decimal, ValidationError as InputValidationError
from schemas_new.validation import PaymentIntentRequest
from services.payment_gateways.config_manager import get_config_manager
from services.payment_gateways.base_gateway import GatewayType

logger = logging.getLogger(__name__)
from utils.idempotency import idempotent_operation, get_current_user_id
from schemas import (
    PaymentIntentCreate, PaymentIntentResponse, PaymentConfirm, PaymentResponse,
    RefundCreate, RefundResponse
)
from dependencies import get_current_user
from models import User, Payment
from utils.logging_config import get_audit_logger

router = APIRouter(
    prefix="/payments",
    tags=["enhanced-payments"]
)

financial_audit_logger = get_audit_logger()


@router.post("/create-intent-enhanced", response_model=Dict[str, Any])
@payment_intent_rate_limit
@idempotent_operation(
    operation_type="enhanced_payment_intent",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
async def create_enhanced_payment_intent(
    request: Request,
    payment_data: PaymentIntentCreate,
    preferred_gateway: Optional[str] = Query(None, description="Preferred payment gateway"),
    selection_strategy: Optional[str] = Query(None, description="Gateway selection strategy"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a payment intent using the enhanced multi-gateway system"""
    try:
        # Get the appointment to determine the amount
        from models import Appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == payment_data.booking_id,
            Appointment.user_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        if appointment.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is not in pending status"
            )
        
        # Get idempotency key from request header
        idempotency_key = request.headers.get("Idempotency-Key")
        
        # Create payment intent using enhanced service
        result = await create_payment_intent_enhanced(
            amount=appointment.price,
            booking_id=payment_data.booking_id,
            db=db,
            gift_certificate_code=payment_data.gift_certificate_code,
            user_id=current_user.id,
            idempotency_key=idempotency_key,
            preferred_gateway=preferred_gateway,
            selection_strategy=selection_strategy
        )
        
        # Log enhanced payment API operation
        financial_audit_logger.log_payment_event(
            event_type="enhanced_payment_intent_created",
            user_id=str(current_user.id),
            amount=float(appointment.price),
            payment_id=str(result.get("payment_id", "")),
            success=True,
            details={
                "booking_id": payment_data.booking_id,
                "appointment_id": appointment.id,
                "barber_id": appointment.barber_id,
                "gift_certificate_code": payment_data.gift_certificate_code,
                "preferred_gateway": preferred_gateway,
                "selection_strategy": selection_strategy,
                "gateway_type": result.get("gateway_type"),
                "client_secret": result.get("client_secret", "")[:20] + "..." if result.get("client_secret") else None,
                "payment_intent_id": result.get("payment_intent_id", ""),
                "final_amount": result.get("amount", 0),
                "gift_certificate_used": result.get("gift_certificate_used", 0)
            }
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in enhanced payment intent creation: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")


@router.post("/confirm-enhanced")
@payment_confirm_rate_limit
@idempotent_operation(
    operation_type="enhanced_payment_confirm",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
async def confirm_enhanced_payment(
    request: Request,
    payment_data: PaymentConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """Confirm payment using the enhanced multi-gateway system"""
    try:
        # Verify the booking belongs to the current user
        from models import Appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == payment_data.booking_id,
            Appointment.user_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        # Get idempotency key from request header
        idempotency_key = request.headers.get("Idempotency-Key")
        
        # Confirm the payment using enhanced service
        result = await confirm_payment_enhanced(
            payment_intent_id=payment_data.payment_intent_id,
            booking_id=payment_data.booking_id,
            db=db,
            idempotency_key=idempotency_key
        )
        
        # Log enhanced payment confirmation
        financial_audit_logger.log_payment_event(
            event_type="enhanced_payment_confirmed",
            user_id=str(current_user.id),
            amount=float(result["amount_charged"]),
            payment_id=str(result["payment_id"]),
            success=True,
            details={
                "booking_id": payment_data.booking_id,
                "appointment_id": result["appointment_id"],
                "payment_intent_id": payment_data.payment_intent_id,
                "amount_charged": result["amount_charged"],
                "gift_certificate_used": result["gift_certificate_used"],
                "gateway_type": result.get("gateway_type"),
                "transaction_id": result.get("transaction_id")
            }
        )
        
        return {
            "message": "Payment confirmed successfully",
            "booking_id": result["appointment_id"],
            "payment_id": result["payment_id"],
            "amount_charged": result["amount_charged"],
            "gift_certificate_used": result["gift_certificate_used"],
            "gateway_type": result.get("gateway_type"),
            "transaction_id": result.get("transaction_id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in enhanced payment confirmation: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")


@router.post("/refund-enhanced", response_model=RefundResponse)
@refund_rate_limit
@idempotent_operation(
    operation_type="enhanced_payment_refund",
    ttl_hours=48,
    extract_user_id=get_current_user_id
)
async def create_enhanced_refund(
    request: Request,
    refund_data: RefundCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a refund using the enhanced multi-gateway system"""
    if current_user.role not in ["admin", "barber"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to process refunds"
        )
    
    try:
        # Get idempotency key from request header
        idempotency_key = request.headers.get("Idempotency-Key")
        
        result = await process_refund_enhanced(
            payment_id=refund_data.payment_id,
            amount=refund_data.amount,
            reason=refund_data.reason,
            initiated_by_id=current_user.id,
            db=db,
            idempotency_key=idempotency_key
        )
        
        # Log enhanced refund operation
        financial_audit_logger.log_payment_event(
            event_type="enhanced_refund_processed",
            user_id=str(current_user.id),
            amount=float(refund_data.amount),
            payment_id=str(refund_data.payment_id),
            success=True,
            details={
                "refund_id": result["refund_id"],
                "refund_amount": result["amount"],
                "refund_reason": refund_data.reason,
                "gateway_refund_id": result.get("gateway_refund_id", ""),
                "gateway_type": result.get("gateway_type"),
                "initiated_by_role": current_user.role
            }
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in enhanced refund processing: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")


@router.get("/gateways")
async def get_available_gateways(
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get list of available payment gateways with their configurations"""
    try:
        config_manager = get_config_manager()
        enabled_gateways = config_manager.get_enabled_gateways()
        
        gateway_info = []
        for gateway_type in enabled_gateways:
            gateway_config = config_manager.get_gateway_config(gateway_type)
            if gateway_config:
                # Get gateway-specific fee information
                fees = {"percentage": 2.9, "fixed": 0.30}  # Default
                is_recommended = False
                
                if gateway_type == GatewayType.STRIPE:
                    fees = {"percentage": 2.9, "fixed": 0.30}
                elif gateway_type == GatewayType.TILLED:
                    fees = {"percentage": 2.5, "fixed": 0.15}
                    is_recommended = True  # Tilled has better rates
                
                gateway_info.append({
                    "id": gateway_type.value,
                    "name": gateway_type.value,
                    "displayName": gateway_type.value.title(),
                    "fees": fees,
                    "isRecommended": is_recommended,
                    "isAvailable": True,
                    "priority": gateway_config.priority
                })
        
        # Sort by priority (lower number = higher priority)
        gateway_info.sort(key=lambda x: x["priority"])
        
        return gateway_info
        
    except Exception as e:
        logger.error(f"Error getting available gateways: {e}")
        # Return default gateways as fallback
        return [
            {
                "id": "stripe",
                "name": "stripe",
                "displayName": "Stripe",
                "fees": {"percentage": 2.9, "fixed": 0.30},
                "isRecommended": False,
                "isAvailable": True,
                "priority": 1
            }
        ]


@router.get("/gateway-stats")
async def get_gateway_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment gateway statistics (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view gateway statistics"
        )
    
    try:
        stats = await enhanced_payment_service.get_gateway_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting gateway statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve gateway statistics"
        )


@router.get("/health-check")
async def gateway_health_check(
    current_user: User = Depends(get_current_user)
):
    """Check health of all payment gateways (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to check gateway health"
        )
    
    try:
        health_results = await enhanced_payment_service.health_check_all_gateways()
        
        # Calculate overall health
        total_gateways = len(health_results)
        healthy_gateways = sum(1 for result in health_results.values() if result.get("healthy", False))
        
        overall_health = {
            "overall_status": "healthy" if healthy_gateways == total_gateways else "degraded" if healthy_gateways > 0 else "unhealthy",
            "healthy_count": healthy_gateways,
            "total_count": total_gateways,
            "health_percentage": (healthy_gateways / total_gateways * 100) if total_gateways > 0 else 0
        }
        
        return {
            "overall": overall_health,
            "gateways": health_results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error checking gateway health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check gateway health"
        )


@router.get("/config-summary")
async def get_gateway_config_summary(
    current_user: User = Depends(get_current_user)
):
    """Get summary of gateway configuration (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view gateway configuration"
        )
    
    try:
        config_summary = enhanced_payment_service.get_gateway_config_summary()
        return config_summary
        
    except Exception as e:
        logger.error(f"Error getting gateway config summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve gateway configuration"
        )


@router.post("/gateway/{gateway_type}/enable")
async def enable_gateway(
    gateway_type: str,
    current_user: User = Depends(get_current_user)
):
    """Enable a specific payment gateway (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify gateway configuration"
        )
    
    try:
        gateway_enum = GatewayType(gateway_type.lower())
        config_manager = get_config_manager()
        config_manager.enable_gateway(gateway_enum)
        
        logger.info(f"Gateway {gateway_type} enabled by user {current_user.id}")
        
        return {"message": f"Gateway {gateway_type} enabled successfully"}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid gateway type: {gateway_type}"
        )
    except Exception as e:
        logger.error(f"Error enabling gateway {gateway_type}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable gateway"
        )


@router.post("/gateway/{gateway_type}/disable")
async def disable_gateway(
    gateway_type: str,
    current_user: User = Depends(get_current_user)
):
    """Disable a specific payment gateway (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify gateway configuration"
        )
    
    try:
        gateway_enum = GatewayType(gateway_type.lower())
        config_manager = get_config_manager()
        config_manager.disable_gateway(gateway_enum)
        
        logger.info(f"Gateway {gateway_type} disabled by user {current_user.id}")
        
        return {"message": f"Gateway {gateway_type} disabled successfully"}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid gateway type: {gateway_type}"
        )
    except Exception as e:
        logger.error(f"Error disabling gateway {gateway_type}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable gateway"
        )


@router.post("/gateway/{gateway_type}/priority")
async def set_gateway_priority(
    gateway_type: str,
    priority: int = Query(..., ge=1, le=10, description="Gateway priority (1=highest, 10=lowest)"),
    current_user: User = Depends(get_current_user)
):
    """Set priority for a specific payment gateway (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify gateway configuration"
        )
    
    try:
        gateway_enum = GatewayType(gateway_type.lower())
        config_manager = get_config_manager()
        config_manager.set_gateway_priority(gateway_enum, priority)
        
        logger.info(f"Gateway {gateway_type} priority set to {priority} by user {current_user.id}")
        
        return {"message": f"Gateway {gateway_type} priority set to {priority}"}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid gateway type: {gateway_type}"
        )
    except Exception as e:
        logger.error(f"Error setting gateway priority for {gateway_type}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set gateway priority"
        )