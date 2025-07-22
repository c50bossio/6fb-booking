"""
AI Integration API Endpoints

Provides API endpoints for AI-enhanced notification and SMS features,
allowing integration with existing systems while maintaining backward compatibility.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from utils.auth import get_current_user
from models import User, Appointment
from services.ai_integration_service import get_ai_integration_service
from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service
from services.ai_enhanced_sms_wrapper import get_ai_enhanced_sms_handler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-integration", tags=["AI Integration"])


# Request/Response Models
class AppointmentAIProcessRequest(BaseModel):
    appointment_id: int
    force_reprocess: bool = False


class AppointmentAIProcessResponse(BaseModel):
    appointment_id: int
    ai_processing_complete: bool
    risk_assessment: Optional[Dict[str, Any]] = None
    intervention_campaign: Optional[Dict[str, Any]] = None
    optimized_notifications: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    error: Optional[str] = None


class SMSProcessRequest(BaseModel):
    from_phone: str = Field(..., description="Phone number that sent the SMS")
    message_body: str = Field(..., description="Content of the SMS message")
    enable_ai: bool = True


class SMSProcessResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    action: str
    appointment_id: Optional[int] = None
    processing_method: str
    ai_confidence: float = 0.0
    fallback_used: bool = False
    error: Optional[str] = None


class NotificationOptimizationRequest(BaseModel):
    user_id: int
    appointment_id: Optional[int] = None


class NotificationOptimizationResponse(BaseModel):
    user_id: int
    optimization_complete: bool
    optimal_times: List[int] = []
    preferred_channel: str = "email"
    engagement_score: float = 0.5
    recommendations: List[str] = []
    error: Optional[str] = None


class AIStatusResponse(BaseModel):
    service_status: str
    prediction_service: bool
    intervention_service: bool
    message_generator: bool
    enhanced_notification: bool
    enhanced_sms: bool
    learning_service: bool
    template_optimization: bool
    stats: Dict[str, Any]
    last_health_check: str


class DailyInsightsResponse(BaseModel):
    date: str
    ai_performance: Dict[str, Any]
    predictions_insights: Dict[str, Any]
    intervention_insights: Dict[str, Any]
    optimization_insights: Dict[str, Any]
    recommendations: List[str]
    error: Optional[str] = None


# AI Appointment Processing Endpoints
@router.post("/appointments/process", response_model=AppointmentAIProcessResponse)
async def process_appointment_with_ai(
    request: AppointmentAIProcessRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process an appointment through the complete AI pipeline
    
    This endpoint triggers AI processing for an appointment including:
    - No-show risk prediction
    - Intervention campaign creation (if high risk)
    - Optimized notification scheduling
    - Behavioral learning updates
    """
    try:
        # Get appointment
        appointment = db.query(Appointment).filter(Appointment.id == request.appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment {request.appointment_id} not found"
            )
        
        # Check user permissions
        if (current_user.role not in ["admin", "barber"] and 
            appointment.user_id != current_user.id and 
            appointment.barber_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to process this appointment"
            )
        
        # Get AI integration service
        ai_service = get_ai_integration_service(db)
        
        # Process appointment with AI (run in background for better performance)
        def process_appointment():
            import asyncio
            return asyncio.run(ai_service.process_appointment_with_ai(appointment))
        
        if request.force_reprocess:
            # Process immediately
            result = await ai_service.process_appointment_with_ai(appointment)
        else:
            # Process in background
            background_tasks.add_task(process_appointment)
            result = {
                "appointment_id": appointment.id,
                "ai_processing_complete": False,
                "message": "Processing started in background"
            }
        
        return AppointmentAIProcessResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing appointment {request.appointment_id} with AI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process appointment with AI: {str(e)}"
        )


# Enhanced SMS Processing Endpoints
@router.post("/sms/process", response_model=SMSProcessResponse)
async def process_sms_with_ai(
    request: SMSProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process incoming SMS with AI enhancement
    
    This endpoint processes SMS messages with AI capabilities including:
    - Natural language understanding
    - Intent detection
    - Sentiment analysis
    - Enhanced response generation
    - Behavioral learning integration
    """
    try:
        # Get AI-enhanced SMS handler
        ai_sms_handler = get_ai_enhanced_sms_handler()
        
        # Process SMS with AI enhancement
        result = ai_sms_handler.process_sms_response(
            db, request.from_phone, request.message_body
        )
        
        # Convert result to response model
        response = SMSProcessResponse(
            success=result.get("success", False),
            response=result.get("response"),
            action=result.get("action", "unknown"),
            appointment_id=result.get("appointment_id"),
            processing_method=result.get("processing_method", "unknown"),
            ai_confidence=result.get("ai_confidence", 0.0),
            fallback_used=result.get("fallback_used", False),
            error=result.get("error")
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing SMS with AI from {request.from_phone}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process SMS with AI: {str(e)}"
        )


# Notification Optimization Endpoints
@router.post("/notifications/optimize", response_model=NotificationOptimizationResponse)
async def optimize_user_notifications(
    request: NotificationOptimizationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Optimize notification scheduling for a user based on AI insights
    
    This endpoint analyzes user behavior and optimizes notification timing,
    channel preferences, and content personalization.
    """
    try:
        # Check permissions
        if current_user.role not in ["admin", "barber"] and current_user.id != request.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to optimize notifications for this user"
            )
        
        # Get AI integration service
        ai_service = get_ai_integration_service(db)
        
        # Optimize notifications
        result = await ai_service.optimize_notification_scheduling(request.user_id)
        
        return NotificationOptimizationResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error optimizing notifications for user {request.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize notifications: {str(e)}"
        )


# AI System Status and Health Endpoints
@router.get("/status", response_model=AIStatusResponse)
async def get_ai_integration_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the status and health of all AI integration services
    """
    try:
        # Check permissions
        if current_user.role not in ["admin", "barber"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view AI system status"
            )
        
        # Get AI integration service
        ai_service = get_ai_integration_service(db)
        
        # Get health status
        health_status = ai_service.get_integration_health()
        
        return AIStatusResponse(**health_status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI integration status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI status: {str(e)}"
        )


@router.get("/insights/daily", response_model=DailyInsightsResponse)
async def get_daily_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get daily AI insights and recommendations for the platform
    """
    try:
        # Check permissions
        if current_user.role not in ["admin", "barber"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view AI insights"
            )
        
        # Get AI integration service
        ai_service = get_ai_integration_service(db)
        
        # Generate daily insights
        insights = await ai_service.generate_daily_insights()
        
        return DailyInsightsResponse(**insights)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating daily AI insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI insights: {str(e)}"
        )


# Enhanced Service Status Endpoints
@router.get("/notifications/status")
async def get_notification_service_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-enhanced notification service status"""
    try:
        if current_user.role not in ["admin", "barber"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view notification service status"
            )
        
        ai_notification_service = get_ai_enhanced_notification_service()
        status_data = ai_notification_service.get_ai_enhancement_status()
        
        return {
            "service": "ai_enhanced_notifications",
            **status_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting notification service status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification service status: {str(e)}"
        )


@router.get("/sms/status")
async def get_sms_service_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-enhanced SMS service status"""
    try:
        if current_user.role not in ["admin", "barber"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view SMS service status"
            )
        
        ai_sms_handler = get_ai_enhanced_sms_handler()
        status_data = ai_sms_handler.get_ai_sms_status()
        
        return {
            "service": "ai_enhanced_sms",
            **status_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting SMS service status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SMS service status: {str(e)}"
        )


# AI Feature Toggle Endpoints
@router.post("/notifications/toggle-ai")
async def toggle_notification_ai_features(
    enabled: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle AI features for notifications on/off"""
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can toggle AI features"
            )
        
        ai_notification_service = get_ai_enhanced_notification_service()
        result = ai_notification_service.toggle_ai_features(enabled)
        
        return {
            "service": "ai_enhanced_notifications",
            "action": "toggle_ai_features",
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling notification AI features: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle notification AI features: {str(e)}"
        )


@router.post("/sms/toggle-ai")
async def toggle_sms_ai_features(
    enabled: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle AI features for SMS on/off"""
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can toggle AI features"
            )
        
        ai_sms_handler = get_ai_enhanced_sms_handler()
        result = ai_sms_handler.toggle_ai_sms_features(enabled)
        
        return {
            "service": "ai_enhanced_sms",
            "action": "toggle_ai_features",
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling SMS AI features: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle SMS AI features: {str(e)}"
        )


# Webhook endpoint for incoming SMS (integrates with existing webhook)
@router.post("/webhooks/sms-incoming")
async def handle_incoming_sms_webhook(
    from_phone: str,
    message_body: str,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for handling incoming SMS messages with AI enhancement
    
    This endpoint can be used by Twilio or other SMS providers to process
    incoming messages with AI capabilities.
    """
    try:
        # Process SMS with AI enhancement
        ai_sms_handler = get_ai_enhanced_sms_handler()
        result = ai_sms_handler.process_sms_response(db, from_phone, message_body)
        
        # Return TwiML response for Twilio compatibility
        response_message = result.get("response", "")
        
        if response_message:
            # Return TwiML format
            return {
                "twiml": f"<Response><Message>{response_message}</Message></Response>",
                "success": result.get("success", False),
                "action": result.get("action", "unknown"),
                "ai_enhanced": result.get("processing_method") in ["ai_enhanced", "base_with_ai_insights"]
            }
        else:
            # No response to send
            return {
                "twiml": "<Response></Response>",
                "success": result.get("success", False),
                "action": result.get("action", "unknown"),
                "ai_enhanced": result.get("processing_method") in ["ai_enhanced", "base_with_ai_insights"]
            }
        
    except Exception as e:
        logger.error(f"Error in SMS webhook for {from_phone}: {str(e)}")
        # Return error TwiML
        error_message = f"We're experiencing technical difficulties. Please try again later."
        return {
            "twiml": f"<Response><Message>{error_message}</Message></Response>",
            "success": False,
            "error": str(e)
        }