"""
Enhanced Appointments Router with Comprehensive Validation
Implements Six Figure Barber methodology with advanced booking validation and error handling
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Path, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime, time, timedelta
import logging
import uuid
import schemas
import models
from database import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role, get_current_user_optional
from utils.booking_validators import (
    validate_comprehensive_booking,
    validate_appointment_reschedule,
    format_validation_response,
    get_service_suggestions,
    ValidationResult,
    SIX_FIGURE_SERVICES
)
from services import booking_service
from services.appointment_enhancement import enhance_appointments_list
from services.cache_invalidation import cache_invalidator
from utils.rate_limit import (
    booking_create_rate_limit,
    guest_booking_rate_limit,
    booking_slots_rate_limit,
    booking_reschedule_rate_limit,
    booking_cancel_rate_limit
)

# Configure logger for this module
logger = logging.getLogger(__name__)

# Create enhanced router
router = APIRouter(
    prefix="/appointments/enhanced",
    tags=["appointments-enhanced"]
)

@router.post("/validate", response_model=Dict[str, Any])
async def validate_appointment_comprehensive(
    validation_request: schemas.AppointmentValidationRequest,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive appointment validation using Six Figure Barber methodology
    
    Validates:
    - Basic booking constraints (dates, times, service availability)
    - Business rules and premium service requirements
    - Client constraints and service history
    - Six Figure Barber methodology compliance
    - Revenue optimization opportunities
    """
    try:
        # Convert validation request to internal format
        booking_date = validation_request.appointment_date
        booking_time_str = validation_request.appointment_time.strftime("%H:%M")
        
        # Get service name from service_id if provided
        service_name = None
        if validation_request.service_id:
            service = db.query(models.Service).filter(
                models.Service.id == validation_request.service_id
            ).first()
            if service:
                service_name = service.name
        
        if not service_name:
            # Use a default service for validation if service_id not found
            service_name = "Haircut"
        
        # Run comprehensive validation
        validation_result = validate_comprehensive_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking_date,
            booking_time=booking_time_str,
            service_name=service_name,
            barber_id=validation_request.barber_id,
            client_id=validation_request.client_id,
            user_timezone=getattr(current_user, 'timezone', None)
        )
        
        # Format response with additional Six Figure Barber insights
        response = format_validation_response(validation_result)
        
        # Add service-specific suggestions
        if service_name in SIX_FIGURE_SERVICES:
            service_suggestions = get_service_suggestions(service_name)
            response["service_suggestions"] = service_suggestions
        
        # Add business insights
        response["business_insights"] = {
            "recommended_prep_time": "10 minutes early for consultation",
            "experience_duration": f"{SIX_FIGURE_SERVICES.get(service_name, {}).get('duration_minutes', 30)} minutes of premium service",
            "aftercare_interval": f"{SIX_FIGURE_SERVICES.get(service_name, {}).get('recommended_interval_days', 21)} days for optimal results"
        }
        
        logger.info(f"Validation completed for user {current_user.id}: {len(validation_result.errors)} errors, {len(validation_result.warnings)} warnings")
        
        return response
        
    except Exception as e:
        logger.error(f"Error during comprehensive validation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Validation system error. Please try again."
        )

@router.post("/", response_model=schemas.AppointmentResponse)
@booking_create_rate_limit
async def create_appointment_with_validation(
    request: Request,
    appointment: schemas.AppointmentCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create appointment with comprehensive Six Figure Barber validation
    
    This endpoint implements:
    - Real-time validation against business rules
    - Premium service standards enforcement
    - Revenue optimization suggestions
    - Client experience enhancement
    - Automatic upselling opportunities detection
    """
    # Get request ID for tracking
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4())[:8])
    logger.info(f"ENHANCED_APPOINTMENT_API [{request_id}]: Starting creation with comprehensive validation")
    
    try:
        # Convert appointment data to validation format
        if isinstance(appointment.date, str):
            booking_date = datetime.strptime(appointment.date, "%Y-%m-%d").date()
        else:
            booking_date = appointment.date
        
        # Run comprehensive validation BEFORE attempting to create
        logger.info(f"ENHANCED_APPOINTMENT_API [{request_id}]: Running comprehensive validation")
        validation_result = validate_comprehensive_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking_date,
            booking_time=appointment.time,
            service_name=appointment.service,
            barber_id=getattr(appointment, 'barber_id', None),
            notes=getattr(appointment, 'notes', None),
            user_timezone=getattr(current_user, 'timezone', None)
        )
        
        # Check if validation passed
        if not validation_result.is_valid:
            logger.warning(f"ENHANCED_APPOINTMENT_API [{request_id}]: Validation failed with {len(validation_result.errors)} errors")
            
            # Format error response with user-friendly messages
            error_details = []
            for error in validation_result.errors:
                error_details.append({
                    "field": error.get("field"),
                    "message": error.get("message"),
                    "code": error.get("code")
                })
            
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Appointment validation failed",
                    "errors": error_details,
                    "suggestions": validation_result.suggestions,
                    "validation_type": "comprehensive"
                }
            )
        
        # Log validation success and any warnings
        if validation_result.warnings:
            logger.info(f"ENHANCED_APPOINTMENT_API [{request_id}]: Validation passed with {len(validation_result.warnings)} warnings")
        
        # Proceed with appointment creation using existing service
        logger.info(f"ENHANCED_APPOINTMENT_API [{request_id}]: Creating appointment after successful validation")
        
        db_appointment = booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking_date,
            booking_time=appointment.time,
            service=appointment.service,
            user_timezone=getattr(current_user, 'timezone', None),
            notes=getattr(appointment, 'notes', None),
            barber_id=getattr(appointment, 'barber_id', None)
        )
        
        # Log successful creation with validation insights
        logger.info(f"ENHANCED_APPOINTMENT_API [{request_id}]: Appointment created successfully with validation insights")
        
        # Add validation insights to the response (not part of the model but logged)
        if validation_result.suggestions:
            logger.info(f"ENHANCED_APPOINTMENT_API [{request_id}]: Service suggestions: {validation_result.suggestions}")
        
        if validation_result.upselling_opportunities:
            logger.info(f"ENHANCED_APPOINTMENT_API [{request_id}]: Upselling opportunities: {len(validation_result.upselling_opportunities)}")
        
        # Invalidate related cache after successful creation
        if db_appointment:
            cache_invalidator.invalidate_appointment_data(
                appointment_id=db_appointment.id,
                user_id=current_user.id,
                barber_id=db_appointment.barber_id,
                date=db_appointment.start_time.date()
            )
        
        return db_appointment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ENHANCED_APPOINTMENT_API [{request_id}]: Unexpected error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/business-rules/info", response_model=Dict[str, Any])
async def get_business_rules_info(
    current_user: schemas.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get Six Figure Barber business rules and constraints information
    """
    try:
        # Get booking settings
        settings = booking_service.get_booking_settings(db)
        
        business_info = {
            "six_figure_barber_standards": {
                "premium_positioning": True,
                "minimum_service_duration": 30,
                "consultation_included": "All premium services include personalized consultation",
                "experience_commitment": "Exceptional results through proven Six Figure Barber methodology"
            },
            "booking_constraints": {
                "minimum_advance_hours": 2,
                "maximum_advance_days": settings.max_advance_days,
                "business_hours": {
                    "start": settings.business_start_time.strftime("%H:%M"),
                    "end": settings.business_end_time.strftime("%H:%M")
                },
                "slot_duration_minutes": settings.slot_duration_minutes
            },
            "service_standards": {
                service_name: {
                    "duration_minutes": info["duration_minutes"],
                    "category": info["category"],
                    "premium_positioning": info.get("premium_positioning", False),
                    "requires_consultation": info.get("requires_consultation", False),
                    "recommended_interval_days": info.get("recommended_interval_days", 21)
                }
                for service_name, info in SIX_FIGURE_SERVICES.items()
            },
            "client_experience": {
                "preparation_recommendation": "Arrive 10 minutes early for consultation",
                "aftercare_support": "Styling maintenance guidance included",
                "rebooking_optimization": "Automatic scheduling for optimal results"
            }
        }
        
        # Add user-specific information if authenticated
        if current_user:
            try:
                client = db.query(models.Client).filter(
                    models.Client.email == current_user.email
                ).first()
                
                if client:
                    user_tier = getattr(client, 'customer_tier', 'standard')
                    business_info["user_benefits"] = {
                        "tier": user_tier,
                        "priority_booking": user_tier in ["vip", "premium"],
                        "loyalty_benefits": user_tier != "standard",
                        "personalized_service": True
                    }
            except Exception:
                # Continue without user benefits if client lookup fails
                pass
        
        return business_info
        
    except Exception as e:
        logger.error(f"Error getting business rules info: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Unable to get business information. Please try again."
        )