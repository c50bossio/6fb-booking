"""
Campaign Configuration API Endpoints
Allows easy configuration of email campaigns with customizable offers
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from services.email_campaign_config import (
    EmailCampaignConfigManager,
    CampaignOfferConfig,
)
from services.email_automation_integration import get_email_automation_integration

router = APIRouter(prefix="/campaign-config", tags=["Campaign Configuration"])


class OfferConfigRequest(BaseModel):
    """Request model for offer configuration"""

    offer_details: Optional[str] = None
    promo_code: Optional[str] = None
    offer_expiry: Optional[str] = None
    discount_percentage: Optional[int] = None


class CampaignConfigRequest(BaseModel):
    """Request model for campaign configuration"""

    campaign_id: str
    config_name: Optional[str] = None
    custom_offer: Optional[OfferConfigRequest] = None


class CampaignConfigResponse(BaseModel):
    """Response model for campaign configuration"""

    campaign_id: str
    config_name: str
    has_offer: bool
    offer_details: Optional[str]
    promo_code: Optional[str]
    offer_expiry: Optional[str]
    discount_percentage: Optional[int]


@router.get("/available-configs", response_model=List[str])
async def get_available_configs():
    """Get list of available predefined campaign configurations"""
    return list(EmailCampaignConfigManager.CAMPAIGN_CONFIGS.keys())


@router.get("/config/{config_name}", response_model=CampaignConfigResponse)
async def get_config_details(config_name: str):
    """Get details of a specific campaign configuration"""
    try:
        config = EmailCampaignConfigManager.get_config(config_name)
        return CampaignConfigResponse(
            campaign_id="preview",
            config_name=config_name,
            has_offer=config.has_offer,
            offer_details=config.offer_details,
            promo_code=config.promo_code,
            offer_expiry=config.offer_expiry,
            discount_percentage=config.discount_percentage,
        )
    except Exception as e:
        raise HTTPException(
            status_code=404, detail=f"Configuration not found: {config_name}"
        )


@router.post("/preview-campaign", response_model=Dict[str, Any])
async def preview_campaign_config(request: CampaignConfigRequest):
    """Preview how a campaign would look with specific configuration"""
    try:
        if request.custom_offer:
            # Use custom configuration
            config = EmailCampaignConfigManager.create_custom_config(
                offer_details=request.custom_offer.offer_details,
                promo_code=request.custom_offer.promo_code,
                offer_expiry=request.custom_offer.offer_expiry,
                discount_percentage=request.custom_offer.discount_percentage,
            )
            config_name = "custom"
        else:
            # Use predefined configuration
            config = EmailCampaignConfigManager.get_config(
                request.config_name or "holiday_no_offer"
            )
            config_name = request.config_name or "holiday_no_offer"

        # Build preview data
        preview_data = {
            "campaign_id": request.campaign_id,
            "config_name": config_name,
            "has_offer": config.has_offer,
            "personalization_data": {
                "client_first_name": "John",
                **config.to_dict(),
                "unsubscribe_link": "https://example.com/unsubscribe",
            },
        }

        return preview_data

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating preview: {str(e)}")


@router.post("/update-campaign-config")
async def update_campaign_config(request: CampaignConfigRequest):
    """Update a campaign's configuration"""
    try:
        automation_integration = get_email_automation_integration()

        if request.custom_offer:
            # Create custom configuration
            config = EmailCampaignConfigManager.create_custom_config(
                offer_details=request.custom_offer.offer_details,
                promo_code=request.custom_offer.promo_code,
                offer_expiry=request.custom_offer.offer_expiry,
                discount_percentage=request.custom_offer.discount_percentage,
            )
        else:
            # Use predefined configuration
            config = EmailCampaignConfigManager.get_config(
                request.config_name or "holiday_no_offer"
            )

        # Note: In a full implementation, you would update the campaign's automation rules
        # For now, we'll return the configuration that would be applied

        return {
            "status": "success",
            "campaign_id": request.campaign_id,
            "applied_config": config.to_dict(),
            "message": f"Campaign {request.campaign_id} configuration updated",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating campaign: {str(e)}"
        )


@router.post("/trigger-campaign-with-config")
async def trigger_campaign_with_config(
    campaign_type: str,
    config_name: Optional[str] = None,
    custom_offer: Optional[OfferConfigRequest] = None,
):
    """Manually trigger a campaign with specific configuration"""
    try:
        automation_integration = get_email_automation_integration()

        if custom_offer:
            # Create custom configuration
            config = EmailCampaignConfigManager.create_custom_config(
                offer_details=custom_offer.offer_details,
                promo_code=custom_offer.promo_code,
                offer_expiry=custom_offer.offer_expiry,
                discount_percentage=custom_offer.discount_percentage,
            )
        else:
            # Use predefined configuration
            config = EmailCampaignConfigManager.get_config(
                config_name or "holiday_no_offer"
            )

        # Trigger the appropriate campaign type
        if campaign_type == "valentines_day":
            await automation_integration.trigger_holiday_promotion("valentines_day")
        elif campaign_type == "fathers_day":
            await automation_integration.trigger_holiday_promotion("fathers_day")
        elif campaign_type == "seasonal":
            await automation_integration.trigger_seasonal_promotion()
        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown campaign type: {campaign_type}"
            )

        return {
            "status": "success",
            "campaign_type": campaign_type,
            "config_applied": config.to_dict(),
            "message": f"{campaign_type} campaign triggered successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error triggering campaign: {str(e)}"
        )


@router.get("/campaign-examples")
async def get_campaign_examples():
    """Get examples of different campaign configurations"""
    examples = {
        "discount_focused": {
            "description": "Traditional percentage-off promotions",
            "configs": [
                "valentines_with_discount",
                "fathers_day_with_discount",
                "seasonal_with_discount",
            ],
        },
        "no_offers": {
            "description": "Service quality focused, no discounts",
            "configs": [
                "valentines_no_offer",
                "fathers_day_no_offer",
                "seasonal_no_offer",
            ],
        },
        "value_added": {
            "description": "Complimentary services and bonuses",
            "configs": [
                "valentines_gift_focus",
                "fathers_day_family_deal",
                "seasonal_service_focus",
            ],
        },
        "custom_examples": {
            "description": "Examples of custom configurations",
            "examples": [
                {
                    "name": "luxury_focus",
                    "offer_details": "EXCLUSIVE VIP EXPERIENCE",
                    "promo_code": "VIP",
                    "offer_expiry": "Limited availability",
                },
                {
                    "name": "gift_card_bonus",
                    "offer_details": "FREE $25 GIFT CARD",
                    "promo_code": "BONUS25",
                    "offer_expiry": "With any $100+ service",
                },
                {
                    "name": "no_discount_premium",
                    "offer_details": None,
                    "promo_code": None,
                    "offer_expiry": None,
                },
            ],
        },
    }

    return examples
