from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import schemas
import models
from db import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role
from services import booking_rules_service

router = APIRouter(
    prefix="/booking-rules",
    tags=["booking-rules"]
)

@router.get("/", response_model=List[schemas.BookingRuleResponse])
def get_booking_rules(
    rule_type: Optional[str] = Query(None, description="Filter by rule type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all booking rules (admin only)"""
    
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        rules = booking_rules_service.get_booking_rules(
            db=db,
            rule_type=rule_type,
            is_active=is_active
        )
        return rules
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=schemas.BookingRuleResponse)
def create_booking_rule(
    rule_data: schemas.BookingRuleCreate,
    admin_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Create a new booking rule (admin only)"""
    
    try:
        rule = booking_rules_service.create_booking_rule(
            db=db,
            rule_name=rule_data.rule_name,
            rule_type=rule_data.rule_type,
            rule_params=rule_data.rule_params,
            applies_to=rule_data.applies_to,
            service_ids=rule_data.service_ids,
            barber_ids=rule_data.barber_ids,
            client_types=rule_data.client_types,
            priority=rule_data.priority,
            created_by_id=admin_user.id
        )
        return rule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{rule_id}", response_model=schemas.BookingRuleResponse)
def get_booking_rule(
    rule_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific booking rule (admin only)"""
    
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    rule = db.query(models.BookingRule).filter(models.BookingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Booking rule not found")
    
    return rule

@router.put("/{rule_id}", response_model=schemas.BookingRuleResponse)
def update_booking_rule(
    rule_id: int,
    rule_data: schemas.BookingRuleUpdate,
    admin_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Update a booking rule (admin only)"""
    
    try:
        update_data = rule_data.dict(exclude_unset=True)
        rule = booking_rules_service.update_booking_rule(
            db=db,
            rule_id=rule_id,
            **update_data
        )
        
        if not rule:
            raise HTTPException(status_code=404, detail="Booking rule not found")
        
        return rule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{rule_id}")
def delete_booking_rule(
    rule_id: int,
    admin_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a booking rule (admin only)"""
    
    try:
        success = booking_rules_service.delete_booking_rule(db=db, rule_id=rule_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Booking rule not found")
        
        return {"message": "Booking rule deactivated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate", response_model=schemas.BookingValidationResponse)
def validate_booking(
    booking_data: schemas.BookingValidationRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate a booking against all applicable rules"""
    
    try:
        is_valid, violations = booking_rules_service.validate_booking_against_rules(
            db=db,
            user_id=current_user.id,
            service_id=booking_data.service_id,
            barber_id=booking_data.barber_id,
            booking_date=booking_data.booking_date,
            booking_time=booking_data.booking_time,
            duration_minutes=booking_data.duration_minutes,
            client_id=booking_data.client_id
        )
        
        return schemas.BookingValidationResponse(
            is_valid=is_valid,
            violations=violations,
            booking_allowed=is_valid
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/services/{service_id}/rules", response_model=List[schemas.ServiceBookingRuleResponse])
def get_service_booking_rules(
    service_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get booking rules for a specific service"""
    
    try:
        rules = booking_rules_service.get_service_booking_rules(db=db, service_id=service_id)
        return rules
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/services/{service_id}/rules", response_model=schemas.ServiceBookingRuleResponse)
def create_service_booking_rule(
    service_id: int,
    rule_data: schemas.ServiceBookingRuleCreate,
    admin_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Create a booking rule for a specific service (admin only)"""
    
    # Verify service exists
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    try:
        rule = booking_rules_service.create_service_booking_rule(
            db=db,
            service_id=service_id,
            rule_type=rule_data.rule_type,
            **rule_data.dict(exclude={'rule_type'})
        )
        return rule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rule-types", response_model=Dict[str, Any])
def get_rule_types(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available rule types and their descriptions"""
    
    return {
        "global_rule_types": {
            "max_advance_booking": {
                "description": "Maximum days in advance a booking can be made",
                "parameters": {"max_days": "integer"}
            },
            "min_advance_booking": {
                "description": "Minimum hours in advance a booking must be made",
                "parameters": {"min_hours": "integer"}
            },
            "max_duration": {
                "description": "Maximum appointment duration in minutes",
                "parameters": {"max_minutes": "integer"}
            },
            "min_duration": {
                "description": "Minimum appointment duration in minutes",
                "parameters": {"min_minutes": "integer"}
            },
            "blackout_dates": {
                "description": "Specific dates when booking is not allowed",
                "parameters": {"dates": "array of YYYY-MM-DD strings"}
            },
            "holiday_restrictions": {
                "description": "Block bookings on holidays",
                "parameters": {"holidays": "array of MM-DD strings"}
            }
        },
        "service_rule_types": {
            "age_restriction": {
                "description": "Age-based restrictions for services",
                "parameters": {"min_age": "integer", "max_age": "integer"}
            },
            "consultation_required": {
                "description": "Requires consultation before booking",
                "parameters": {"requires_consultation": "boolean"}
            },
            "patch_test_required": {
                "description": "Requires patch test before service",
                "parameters": {"requires_patch_test": "boolean", "patch_test_hours_before": "integer"}
            },
            "booking_frequency": {
                "description": "Limits how often service can be booked",
                "parameters": {"max_bookings_per_day": "integer", "min_days_between_bookings": "integer"}
            },
            "day_restrictions": {
                "description": "Days when service is not available",
                "parameters": {"blocked_days_of_week": "array of integers (0=Monday, 6=Sunday)"}
            }
        }
    }