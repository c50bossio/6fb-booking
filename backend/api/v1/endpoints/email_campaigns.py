"""
Email Campaign Management API Endpoints
Provides CRUD operations, analytics, and email management for campaigns
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from config.database import get_db
from services.email_campaign_service import (
    get_email_campaign_service,
    EmailCampaignService,
    CampaignType,
    CampaignStatus,
    EmailStatus,
)
from services.email_automation_integration import get_email_automation_integration
from services.email_campaign_config import EmailCampaignConfigManager
from utils.auth_decorators import require_auth
from utils.input_validation import validate_email

router = APIRouter(prefix="/email-campaigns", tags=["Email Campaigns"])


# Pydantic Models for API
class EmailTemplateCreate(BaseModel):
    id: str
    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = ""
    campaign_type: str
    personalization_fields: List[str] = []
    is_active: bool = True


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    campaign_type: Optional[str] = None
    personalization_fields: Optional[List[str]] = None
    is_active: Optional[bool] = None


class EmailCampaignCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    campaign_type: str
    template_id: str
    status: str = "draft"
    target_audience: Dict[str, Any] = {}
    scheduling: Dict[str, Any] = {}
    automation_triggers: List[Dict[str, Any]] = []
    personalization_rules: Dict[str, Any] = {}
    analytics_tracking: Dict[str, Any] = {}
    created_by: int


class EmailCampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    template_id: Optional[str] = None
    status: Optional[str] = None
    target_audience: Optional[Dict[str, Any]] = None
    scheduling: Optional[Dict[str, Any]] = None
    automation_triggers: Optional[List[Dict[str, Any]]] = None
    personalization_rules: Optional[Dict[str, Any]] = None
    analytics_tracking: Optional[Dict[str, Any]] = None


class TestEmailRequest(BaseModel):
    template_id: str
    test_email: EmailStr
    test_data: Optional[Dict[str, Any]] = None


class EmailPreferencesUpdate(BaseModel):
    email_address: EmailStr
    is_subscribed: bool = True
    frequency_preference: str = "weekly"
    campaign_preferences: Dict[str, bool] = {}
    timezone: str = "UTC"


class BulkEmailRequest(BaseModel):
    template_id: str
    recipient_emails: List[EmailStr]
    personalization_data: Dict[str, Any] = {}
    campaign_id: Optional[str] = None


# Template Management Endpoints
@router.post("/templates", response_model=Dict[str, Any])
async def create_email_template(
    template_data: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Create a new email template"""
    try:
        email_service = get_email_campaign_service()

        # Validate campaign type
        try:
            CampaignType(template_data.campaign_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid campaign type: {template_data.campaign_type}",
            )

        template = await email_service.create_template(template_data.dict())

        return {
            "success": True,
            "message": "Email template created successfully",
            "template": {
                "id": template.id,
                "name": template.name,
                "subject": template.subject,
                "campaign_type": template.campaign_type.value,
                "personalization_fields": template.personalization_fields,
                "is_active": template.is_active,
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error creating template: {str(e)}"
        )


@router.get("/templates", response_model=Dict[str, Any])
async def list_email_templates(
    campaign_type: Optional[str] = Query(None, description="Filter by campaign type"),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """List all email templates with optional filtering"""
    try:
        email_service = get_email_campaign_service()

        campaign_type_filter = None
        if campaign_type:
            try:
                campaign_type_filter = CampaignType(campaign_type)
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid campaign type: {campaign_type}"
                )

        templates = await email_service.list_templates(campaign_type_filter)

        return {
            "success": True,
            "templates": [
                {
                    "id": template.id,
                    "name": template.name,
                    "subject": template.subject,
                    "campaign_type": template.campaign_type.value,
                    "personalization_fields": template.personalization_fields,
                    "is_active": template.is_active,
                    "created_at": template.created_at.isoformat(),
                    "updated_at": template.updated_at.isoformat(),
                }
                for template in templates
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error listing templates: {str(e)}"
        )


@router.get("/templates/{template_id}", response_model=Dict[str, Any])
async def get_email_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Get a specific email template"""
    try:
        email_service = get_email_campaign_service()
        template = await email_service.get_template(template_id)

        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        return {
            "success": True,
            "template": {
                "id": template.id,
                "name": template.name,
                "subject": template.subject,
                "html_content": template.html_content,
                "text_content": template.text_content,
                "campaign_type": template.campaign_type.value,
                "personalization_fields": template.personalization_fields,
                "is_active": template.is_active,
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting template: {str(e)}")


@router.put("/templates/{template_id}", response_model=Dict[str, Any])
async def update_email_template(
    template_id: str,
    updates: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Update an email template"""
    try:
        email_service = get_email_campaign_service()

        # Filter out None values
        update_data = {k: v for k, v in updates.dict().items() if v is not None}

        if "campaign_type" in update_data:
            try:
                CampaignType(update_data["campaign_type"])
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid campaign type: {update_data['campaign_type']}",
                )

        template = await email_service.update_template(template_id, update_data)

        return {
            "success": True,
            "message": "Template updated successfully",
            "template": {
                "id": template.id,
                "name": template.name,
                "subject": template.subject,
                "campaign_type": template.campaign_type.value,
                "personalization_fields": template.personalization_fields,
                "is_active": template.is_active,
                "updated_at": template.updated_at.isoformat(),
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating template: {str(e)}"
        )


@router.delete("/templates/{template_id}", response_model=Dict[str, Any])
async def delete_email_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Delete an email template"""
    try:
        email_service = get_email_campaign_service()
        success = await email_service.delete_template(template_id)

        if not success:
            raise HTTPException(status_code=404, detail="Template not found")

        return {"success": True, "message": "Template deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting template: {str(e)}"
        )


# Campaign Management Endpoints
@router.post("/campaigns", response_model=Dict[str, Any])
async def create_email_campaign(
    campaign_data: EmailCampaignCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Create a new email campaign"""
    try:
        email_service = get_email_campaign_service()

        # Validate campaign type and status
        try:
            CampaignType(campaign_data.campaign_type)
            CampaignStatus(campaign_data.status)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        campaign = await email_service.create_campaign(campaign_data.dict())

        return {
            "success": True,
            "message": "Email campaign created successfully",
            "campaign": {
                "id": campaign.id,
                "name": campaign.name,
                "description": campaign.description,
                "campaign_type": campaign.campaign_type.value,
                "template_id": campaign.template_id,
                "status": campaign.status.value,
                "created_at": campaign.created_at.isoformat(),
                "updated_at": campaign.updated_at.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error creating campaign: {str(e)}"
        )


@router.get("/campaigns", response_model=Dict[str, Any])
async def list_email_campaigns(
    campaign_type: Optional[str] = Query(None, description="Filter by campaign type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """List all email campaigns with optional filtering"""
    try:
        email_service = get_email_campaign_service()

        campaign_type_filter = None
        status_filter = None

        if campaign_type:
            try:
                campaign_type_filter = CampaignType(campaign_type)
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid campaign type: {campaign_type}"
                )

        if status:
            try:
                status_filter = CampaignStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

        campaigns = await email_service.list_campaigns(
            campaign_type_filter, status_filter
        )

        return {
            "success": True,
            "campaigns": [
                {
                    "id": campaign.id,
                    "name": campaign.name,
                    "description": campaign.description,
                    "campaign_type": campaign.campaign_type.value,
                    "template_id": campaign.template_id,
                    "status": campaign.status.value,
                    "send_count": campaign.send_count,
                    "open_rate": campaign.open_rate,
                    "click_rate": campaign.click_rate,
                    "created_at": campaign.created_at.isoformat(),
                    "updated_at": campaign.updated_at.isoformat(),
                }
                for campaign in campaigns
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error listing campaigns: {str(e)}"
        )


@router.get("/campaigns/{campaign_id}", response_model=Dict[str, Any])
async def get_email_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Get a specific email campaign"""
    try:
        email_service = get_email_campaign_service()
        campaign = await email_service.get_campaign(campaign_id)

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        return {
            "success": True,
            "campaign": {
                "id": campaign.id,
                "name": campaign.name,
                "description": campaign.description,
                "campaign_type": campaign.campaign_type.value,
                "template_id": campaign.template_id,
                "status": campaign.status.value,
                "target_audience": campaign.target_audience,
                "scheduling": campaign.scheduling,
                "automation_triggers": campaign.automation_triggers,
                "personalization_rules": campaign.personalization_rules,
                "analytics_tracking": campaign.analytics_tracking,
                "send_count": campaign.send_count,
                "open_rate": campaign.open_rate,
                "click_rate": campaign.click_rate,
                "created_at": campaign.created_at.isoformat(),
                "updated_at": campaign.updated_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting campaign: {str(e)}")


@router.put("/campaigns/{campaign_id}", response_model=Dict[str, Any])
async def update_email_campaign(
    campaign_id: str,
    updates: EmailCampaignUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Update an email campaign"""
    try:
        email_service = get_email_campaign_service()

        # Filter out None values
        update_data = {k: v for k, v in updates.dict().items() if v is not None}

        # Validate enums if provided
        if "campaign_type" in update_data:
            try:
                CampaignType(update_data["campaign_type"])
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid campaign type: {update_data['campaign_type']}",
                )

        if "status" in update_data:
            try:
                CampaignStatus(update_data["status"])
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid status: {update_data['status']}"
                )

        campaign = await email_service.update_campaign(campaign_id, update_data)

        return {
            "success": True,
            "message": "Campaign updated successfully",
            "campaign": {
                "id": campaign.id,
                "name": campaign.name,
                "status": campaign.status.value,
                "updated_at": campaign.updated_at.isoformat(),
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating campaign: {str(e)}"
        )


@router.post("/campaigns/{campaign_id}/activate", response_model=Dict[str, Any])
async def activate_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Activate an email campaign"""
    try:
        email_service = get_email_campaign_service()
        success = await email_service.activate_campaign(campaign_id)

        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found")

        return {"success": True, "message": "Campaign activated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error activating campaign: {str(e)}"
        )


@router.post("/campaigns/{campaign_id}/pause", response_model=Dict[str, Any])
async def pause_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Pause an email campaign"""
    try:
        email_service = get_email_campaign_service()
        success = await email_service.pause_campaign(campaign_id)

        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found")

        return {"success": True, "message": "Campaign paused successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error pausing campaign: {str(e)}")


# Email Sending Endpoints
@router.post("/send-test", response_model=Dict[str, Any])
async def send_test_email(
    request: TestEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Send a test email"""
    try:
        # Validate email
        if not validate_email(request.test_email):
            raise HTTPException(status_code=400, detail="Invalid email address")

        email_service = get_email_campaign_service()

        # Send test email in background
        async def send_test():
            delivery_id = await email_service.send_test_email(
                template_id=request.template_id,
                test_email=request.test_email,
                test_data=request.test_data,
            )
            return delivery_id

        background_tasks.add_task(send_test)

        return {
            "success": True,
            "message": f"Test email queued for delivery to {request.test_email}",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error sending test email: {str(e)}"
        )


@router.post("/send-bulk", response_model=Dict[str, Any])
async def send_bulk_emails(
    request: BulkEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Send bulk emails"""
    try:
        # Validate emails
        for email in request.recipient_emails:
            if not validate_email(email):
                raise HTTPException(
                    status_code=400, detail=f"Invalid email address: {email}"
                )

        if len(request.recipient_emails) > 1000:
            raise HTTPException(
                status_code=400, detail="Maximum 1000 recipients per batch"
            )

        email_service = get_email_campaign_service()

        # Send bulk emails in background
        async def send_bulk():
            delivery_ids = []
            for email in request.recipient_emails:
                delivery_id = await email_service.send_email(
                    recipient_email=email,
                    template_id=request.template_id,
                    personalization_data=request.personalization_data,
                    campaign_id=request.campaign_id,
                )
                delivery_ids.append(delivery_id)
            return delivery_ids

        background_tasks.add_task(send_bulk)

        return {
            "success": True,
            "message": f"Bulk emails queued for delivery to {len(request.recipient_emails)} recipients",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error sending bulk emails: {str(e)}"
        )


# Analytics Endpoints
@router.get("/campaigns/{campaign_id}/analytics", response_model=Dict[str, Any])
async def get_campaign_analytics(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Get analytics for a specific campaign"""
    try:
        email_service = get_email_campaign_service()
        analytics = await email_service.get_campaign_analytics(campaign_id)

        if not analytics:
            raise HTTPException(status_code=404, detail="Campaign not found")

        return {"success": True, "analytics": analytics}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting campaign analytics: {str(e)}"
        )


@router.get("/analytics/overview", response_model=Dict[str, Any])
async def get_overall_analytics(
    db: Session = Depends(get_db), current_user: Dict = Depends(require_auth)
):
    """Get overall email campaign analytics"""
    try:
        email_service = get_email_campaign_service()
        analytics = await email_service.get_overall_analytics()

        return {"success": True, "analytics": analytics}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting overall analytics: {str(e)}"
        )


# Email Preferences Endpoints
@router.put("/preferences/{client_id}", response_model=Dict[str, Any])
async def update_email_preferences(
    client_id: int,
    preferences: EmailPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Update client email preferences"""
    try:
        email_service = get_email_campaign_service()

        preferences_data = preferences.dict()
        preferences_data["client_id"] = client_id

        updated_preferences = await email_service.update_email_preferences(
            client_id, preferences_data
        )

        return {
            "success": True,
            "message": "Email preferences updated successfully",
            "preferences": {
                "client_id": updated_preferences.client_id,
                "email_address": updated_preferences.email_address,
                "is_subscribed": updated_preferences.is_subscribed,
                "frequency_preference": updated_preferences.frequency_preference,
                "campaign_preferences": updated_preferences.campaign_preferences,
                "timezone": updated_preferences.timezone,
                "last_updated": updated_preferences.last_updated.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating preferences: {str(e)}"
        )


@router.get("/preferences/{client_id}", response_model=Dict[str, Any])
async def get_email_preferences(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Get client email preferences"""
    try:
        email_service = get_email_campaign_service()
        preferences = await email_service.get_email_preferences(client_id)

        if not preferences:
            return {
                "success": True,
                "preferences": {
                    "client_id": client_id,
                    "is_subscribed": True,
                    "frequency_preference": "weekly",
                    "campaign_preferences": {},
                    "timezone": "UTC",
                },
            }

        return {
            "success": True,
            "preferences": {
                "client_id": preferences.client_id,
                "email_address": preferences.email_address,
                "is_subscribed": preferences.is_subscribed,
                "frequency_preference": preferences.frequency_preference,
                "campaign_preferences": preferences.campaign_preferences,
                "timezone": preferences.timezone,
                "last_updated": preferences.last_updated.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting preferences: {str(e)}"
        )


@router.post("/unsubscribe/{token}", response_model=Dict[str, Any])
async def unsubscribe_client(token: str, db: Session = Depends(get_db)):
    """Unsubscribe client using token"""
    try:
        email_service = get_email_campaign_service()
        success = await email_service.unsubscribe_client(token)

        if not success:
            raise HTTPException(status_code=404, detail="Invalid unsubscribe token")

        return {
            "success": True,
            "message": "Successfully unsubscribed from email campaigns",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unsubscribing: {str(e)}")


# Automation Trigger Endpoints
@router.post("/triggers/welcome/{client_id}", response_model=Dict[str, Any])
async def trigger_welcome_series(
    client_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Manually trigger welcome series for a client"""
    try:
        integration = get_email_automation_integration()

        async def trigger_welcome():
            await integration.trigger_welcome_series(client_id)

        background_tasks.add_task(trigger_welcome)

        return {
            "success": True,
            "message": f"Welcome series triggered for client {client_id}",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error triggering welcome series: {str(e)}"
        )


@router.post("/triggers/reengagement/{client_id}", response_model=Dict[str, Any])
async def trigger_reengagement(
    client_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Manually trigger re-engagement for a client"""
    try:
        integration = get_email_automation_integration()

        async def trigger_reeng():
            await integration.trigger_reengagement(client_id)

        background_tasks.add_task(trigger_reeng)

        return {
            "success": True,
            "message": f"Re-engagement campaign triggered for client {client_id}",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error triggering re-engagement: {str(e)}"
        )


@router.post(
    "/triggers/post-appointment/{appointment_id}", response_model=Dict[str, Any]
)
async def trigger_post_appointment_emails(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Manually trigger post-appointment emails"""
    try:
        integration = get_email_automation_integration()

        async def trigger_post_apt():
            await integration.trigger_post_appointment_emails(appointment_id)

        background_tasks.add_task(trigger_post_apt)

        return {
            "success": True,
            "message": f"Post-appointment emails triggered for appointment {appointment_id}",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error triggering post-appointment emails: {str(e)}",
        )


@router.post("/triggers/birthday-check", response_model=Dict[str, Any])
async def trigger_birthday_check(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Manually trigger birthday email check"""
    try:
        integration = get_email_automation_integration()

        async def trigger_birthday():
            await integration.trigger_birthday_check()

        background_tasks.add_task(trigger_birthday)

        return {"success": True, "message": "Birthday email check triggered"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error triggering birthday check: {str(e)}"
        )


@router.post("/triggers/seasonal-promotion", response_model=Dict[str, Any])
async def trigger_seasonal_promotion(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
):
    """Manually trigger seasonal promotion"""
    try:
        integration = get_email_automation_integration()

        async def trigger_seasonal():
            await integration.trigger_seasonal_promotion()

        background_tasks.add_task(trigger_seasonal)

        return {"success": True, "message": "Seasonal promotion campaign triggered"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error triggering seasonal promotion: {str(e)}"
        )


# Health Check Endpoint
@router.get("/health", response_model=Dict[str, Any])
async def email_campaigns_health():
    """Health check for email campaigns service"""
    try:
        email_service = get_email_campaign_service()

        # Basic service checks
        template_count = len(email_service.templates)
        campaign_count = len(email_service.campaigns)

        return {
            "success": True,
            "status": "healthy",
            "service": "email_campaigns",
            "stats": {
                "total_templates": template_count,
                "total_campaigns": campaign_count,
                "sendgrid_configured": email_service.sendgrid_client is not None,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


# New configurable test email endpoint
class TestEmailWithConfigRequest(BaseModel):
    template_id: str
    test_email: EmailStr
    config_name: Optional[str] = None
    custom_offer_details: Optional[str] = None
    custom_promo_code: Optional[str] = None
    custom_offer_expiry: Optional[str] = None


@router.post("/send-test-with-config")
async def send_test_email_with_config(
    request: TestEmailWithConfigRequest,
    email_service: EmailCampaignService = Depends(get_email_campaign_service),
):
    """Send a test email using configurable offer settings"""
    try:
        # Determine configuration to use
        if (
            request.custom_offer_details
            or request.custom_promo_code
            or request.custom_offer_expiry
        ):
            # Use custom configuration
            config = EmailCampaignConfigManager.create_custom_config(
                offer_details=request.custom_offer_details,
                promo_code=request.custom_promo_code,
                offer_expiry=request.custom_offer_expiry,
            )
            config_name = "custom"
        elif request.config_name:
            # Use predefined configuration
            config = EmailCampaignConfigManager.get_config(request.config_name)
            config_name = request.config_name
        else:
            # Default to no offer
            config = EmailCampaignConfigManager.get_config("holiday_no_offer")
            config_name = "no_offer"

        # Build test personalization data with configuration
        test_data = {
            "client_first_name": "John",
            "client_last_name": "Doe",
            "barbershop_name": "Six Figure Barber",
            "season": "Spring",
            "promotion_title": "Spring Style Refresh Special",
            **config.to_dict(),
            "unsubscribe_link": "https://example.com/unsubscribe",
        }

        # Send test email
        delivery_id = await email_service.send_test_email(
            template_id=request.template_id,
            test_email=str(request.test_email),
            test_data=test_data,
        )

        return {
            "success": True,
            "delivery_id": delivery_id,
            "template_id": request.template_id,
            "test_email": str(request.test_email),
            "config_applied": {
                "name": config_name,
                "has_offer": config.has_offer,
                **config.to_dict(),
            },
            "message": f"Test email sent with {config_name} configuration",
        }

    except Exception as e:
        logger.error(f"Error sending test email with config: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to send test email: {str(e)}"
        )
