"""
FastAPI router for appointment reminder system
Handles reminder scheduling, preferences, templates, and billing
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, date
from pydantic import BaseModel

from core.database import get_db
from core.auth import get_current_user, require_permissions
from models import User, Shop, Client, Appointment
from models.reminder_models import (
    ReminderPreference, ReminderSchedule, ReminderTemplate, 
    ReminderDelivery, ReminderAnalytics
)
from services.reminder_engine_service import reminder_engine
from services.billing_integration_service import communication_billing
from services.notification_gateway_service import notification_gateway
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v2/reminders", tags=["reminders"])


# Pydantic models for API
class ReminderPreferenceCreate(BaseModel):
    client_id: int
    sms_enabled: bool = True
    email_enabled: bool = True
    push_enabled: bool = False
    advance_hours: int = 24
    preferred_time_start: Optional[str] = "09:00"  # 9 AM
    preferred_time_end: Optional[str] = "20:00"    # 8 PM
    timezone: str = "UTC"


class ReminderPreferenceResponse(BaseModel):
    id: int
    client_id: int
    sms_enabled: bool
    email_enabled: bool
    push_enabled: bool
    advance_hours: int
    preferred_time_start: Optional[str]
    preferred_time_end: Optional[str]
    timezone: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReminderScheduleResponse(BaseModel):
    id: int
    appointment_id: int
    reminder_type: str
    scheduled_for: datetime
    status: str
    delivery_attempts: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReminderTemplateCreate(BaseModel):
    template_name: str
    reminder_type: str  # '24_hour', '2_hour', 'followup'
    channel: str  # 'sms', 'email', 'push'
    subject_template: Optional[str] = None
    body_template: str
    variables: Optional[Dict] = None
    shop_id: Optional[int] = None
    is_active: bool = True


class CommunicationUsageResponse(BaseModel):
    shop_id: int
    period: str
    sms_count: int
    email_count: int
    push_count: int
    total_messages: int
    billing: Dict
    plan: str


class PlanUpgradeRequest(BaseModel):
    new_plan: str  # 'basic', 'professional', 'premium'


# Client Preference Management
@router.get("/preferences/{client_id}", response_model=ReminderPreferenceResponse)
async def get_client_preferences(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reminder preferences for a client"""
    
    # Verify client belongs to user's shop
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check permissions
    if not require_permissions(current_user, client.shop_id, ["read_clients"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    preferences = db.query(ReminderPreference).filter(
        ReminderPreference.client_id == client_id
    ).first()
    
    if not preferences:
        # Create default preferences
        preferences = ReminderPreference(
            client_id=client_id,
            sms_enabled=True,
            email_enabled=True,
            push_enabled=False,
            advance_hours=24,
            timezone="UTC"
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return preferences


@router.put("/preferences/{client_id}", response_model=ReminderPreferenceResponse)
async def update_client_preferences(
    client_id: int,
    preference_data: ReminderPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update reminder preferences for a client"""
    
    # Verify client and permissions
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if not require_permissions(current_user, client.shop_id, ["write_clients"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get or create preferences
    preferences = db.query(ReminderPreference).filter(
        ReminderPreference.client_id == client_id
    ).first()
    
    if preferences:
        # Update existing
        for field, value in preference_data.dict(exclude={'client_id'}).items():
            if value is not None:
                setattr(preferences, field, value)
        preferences.updated_at = datetime.utcnow()
    else:
        # Create new
        preferences = ReminderPreference(**preference_data.dict())
        db.add(preferences)
    
    db.commit()
    db.refresh(preferences)
    return preferences


# Reminder Scheduling
@router.post("/schedule/{appointment_id}")
async def schedule_appointment_reminders(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule reminders for an appointment"""
    
    # Verify appointment exists and permissions
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if not require_permissions(current_user, appointment.shop_id, ["write_appointments"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Schedule reminders
    try:
        result = await reminder_engine.schedule_appointment_reminders(appointment_id, db)
        
        logger.info(f"Reminders scheduled for appointment {appointment_id} by user {current_user.id}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to schedule reminders for appointment {appointment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to schedule reminders")


@router.get("/schedules/{appointment_id}", response_model=List[ReminderScheduleResponse])
async def get_appointment_reminders(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all scheduled reminders for an appointment"""
    
    # Verify appointment and permissions
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if not require_permissions(current_user, appointment.shop_id, ["read_appointments"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    schedules = db.query(ReminderSchedule).filter(
        ReminderSchedule.appointment_id == appointment_id
    ).all()
    
    return schedules


# Template Management
@router.get("/templates/")
async def get_reminder_templates(
    reminder_type: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reminder templates (default or shop-specific)"""
    
    query = db.query(ReminderTemplate).filter(ReminderTemplate.is_active == True)
    
    # Filter by shop (user's shop templates + default templates)
    shop_filter = ReminderTemplate.shop_id.in_([current_user.shop_id, None])
    query = query.filter(shop_filter)
    
    if reminder_type:
        query = query.filter(ReminderTemplate.reminder_type == reminder_type)
    
    if channel:
        query = query.filter(ReminderTemplate.channel == channel)
    
    templates = query.all()
    return templates


@router.post("/templates/")
async def create_reminder_template(
    template_data: ReminderTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a custom reminder template"""
    
    if not require_permissions(current_user, current_user.shop_id, ["write_settings"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Set shop_id to current user's shop for custom templates
    template_data.shop_id = current_user.shop_id
    
    template = ReminderTemplate(**template_data.dict())
    db.add(template)
    db.commit()
    db.refresh(template)
    
    logger.info(f"Custom reminder template created by user {current_user.id}")
    return template


# Analytics & Reporting
@router.get("/analytics/usage", response_model=CommunicationUsageResponse)
async def get_communication_usage(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get communication usage for billing period"""
    
    if not require_permissions(current_user, current_user.shop_id, ["read_analytics"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        usage_data = await communication_billing.calculate_monthly_usage(
            current_user.shop_id, month, year, db
        )
        
        return CommunicationUsageResponse(
            shop_id=usage_data["usage"]["shop_id"],
            period=usage_data["usage"]["period"],
            sms_count=usage_data["usage"]["sms_count"],
            email_count=usage_data["usage"]["email_count"],
            push_count=usage_data["usage"]["push_count"],
            total_messages=usage_data["usage"]["total_messages"],
            billing=usage_data["billing"],
            plan=usage_data["plan"]
        )
        
    except Exception as e:
        logger.error(f"Failed to get usage data for shop {current_user.shop_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve usage data")


@router.get("/analytics/revenue-protection")
async def get_revenue_protection_analytics(
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get revenue protection analytics showing ROI of reminder system"""
    
    if not require_permissions(current_user, current_user.shop_id, ["read_analytics"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        analytics = await communication_billing.get_usage_analytics(
            current_user.shop_id, months, db
        )
        
        return {
            "shop_id": current_user.shop_id,
            "period_months": months,
            "total_revenue_protected": analytics["total_revenue_protected"],
            "average_monthly_messages": analytics["average_monthly_messages"],
            "monthly_breakdown": analytics["monthly_data"],
            "roi_analysis": {
                "estimated_cost": analytics["average_monthly_messages"] * 0.008,  # Avg cost per message
                "revenue_protected": analytics["total_revenue_protected"] / months,
                "roi_multiplier": (analytics["total_revenue_protected"] / months) / max(analytics["average_monthly_messages"] * 0.008, 1)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get revenue analytics for shop {current_user.shop_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")


# Plan Management
@router.get("/billing/plans")
async def get_available_plans():
    """Get available communication plans and pricing"""
    return {
        "plans": communication_billing.PRICING_TIERS,
        "features_comparison": {
            "basic": ["Basic templates", "Standard reporting", "Email support"],
            "professional": ["Custom templates", "Advanced analytics", "No-show reports", "Priority support"],
            "premium": ["Unlimited messaging", "AI optimization", "Revenue analytics", "Multi-location", "White-label", "Dedicated support"]
        }
    }


@router.get("/billing/current-plan")
async def get_current_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current communication plan for shop"""
    
    shop = db.query(Shop).filter(Shop.id == current_user.shop_id).first()
    current_plan = getattr(shop, 'communication_plan', 'basic')
    
    return {
        "shop_id": current_user.shop_id,
        "current_plan": current_plan,
        "plan_details": communication_billing.PRICING_TIERS[current_plan],
        "next_billing_date": getattr(shop, 'next_billing_date', None)
    }


@router.post("/billing/upgrade-plan")
async def upgrade_communication_plan(
    upgrade_request: PlanUpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade or downgrade communication plan"""
    
    if not require_permissions(current_user, current_user.shop_id, ["write_billing"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        result = await communication_billing.upgrade_plan(
            current_user.shop_id, upgrade_request.new_plan, db
        )
        
        if result["success"]:
            logger.info(f"Plan upgraded for shop {current_user.shop_id} to {upgrade_request.new_plan}")
            return result
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Failed to upgrade plan for shop {current_user.shop_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upgrade plan")


# Webhook Endpoints
@router.post("/webhooks/twilio")
async def twilio_webhook(
    webhook_data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Handle Twilio delivery status webhooks"""
    
    try:
        result = await notification_gateway.handle_webhook("twilio", webhook_data)
        
        # Process client responses if present
        if result.get("client_response"):
            background_tasks.add_task(
                reminder_engine.handle_client_response,
                {
                    "appointment_id": webhook_data.get("appointment_id"),
                    "response_type": result["client_response"],
                    "response_text": result.get("response_text")
                },
                db
            )
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Twilio webhook processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.post("/webhooks/sendgrid")
async def sendgrid_webhook(
    webhook_data: dict,
    db: Session = Depends(get_db)
):
    """Handle SendGrid event webhooks"""
    
    try:
        result = await notification_gateway.handle_webhook("sendgrid", webhook_data)
        return {"status": "processed", "events": len(result.get("events", []))}
        
    except Exception as e:
        logger.error(f"SendGrid webhook processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


# Manual Operations (Admin)
@router.post("/admin/process-pending")
async def process_pending_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger processing of pending reminders (Admin only)"""
    
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = await reminder_engine.process_pending_reminders(db)
        return result
        
    except Exception as e:
        logger.error(f"Manual reminder processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Processing failed")


@router.post("/admin/generate-invoice")
async def generate_monthly_invoice(
    shop_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate monthly invoice for communication services (Admin only)"""
    
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = await communication_billing.generate_invoice(shop_id, month, year, db)
        return result
        
    except Exception as e:
        logger.error(f"Invoice generation failed for shop {shop_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Invoice generation failed")