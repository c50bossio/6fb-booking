"""
Email Campaign Configuration System
Provides easy configuration for email campaigns with customizable offers
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class CampaignOfferConfig:
    """Configuration class for campaign offers"""

    def __init__(
        self,
        offer_details: Optional[str] = None,
        promo_code: Optional[str] = None,
        offer_expiry: Optional[str] = None,
        discount_percentage: Optional[int] = None,
        has_offer: bool = True,
    ):
        self.has_offer = has_offer and (offer_details is not None)
        self.offer_details = offer_details if self.has_offer else None
        self.promo_code = promo_code if self.has_offer else None
        self.offer_expiry = offer_expiry if self.has_offer else None
        self.discount_percentage = discount_percentage if self.has_offer else None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for personalization data"""
        if not self.has_offer:
            return {"offer_details": None, "promo_code": None, "offer_expiry": None}

        return {
            "offer_details": self.offer_details,
            "promo_code": self.promo_code,
            "offer_expiry": self.offer_expiry,
        }


class EmailCampaignConfigManager:
    """Manager for email campaign configurations"""

    # Predefined campaign configurations
    CAMPAIGN_CONFIGS = {
        # Valentine's Day Configurations
        "valentines_with_discount": CampaignOfferConfig(
            offer_details="25% OFF DATE NIGHT PACKAGE",
            promo_code="LOVE25",
            offer_expiry="Valid through February 14th",
            discount_percentage=25,
        ),
        "valentines_no_offer": CampaignOfferConfig(has_offer=False),
        "valentines_gift_focus": CampaignOfferConfig(
            offer_details="COMPLIMENTARY GIFT CARD BONUS",
            promo_code="VALENTINE",
            offer_expiry="Buy $100 gift card, get $25 free",
        ),
        # Father's Day Configurations
        "fathers_day_with_discount": CampaignOfferConfig(
            offer_details="30% OFF DAD'S DAY PACKAGE",
            promo_code="DAD30",
            offer_expiry="Valid through Father's Day weekend",
            discount_percentage=30,
        ),
        "fathers_day_no_offer": CampaignOfferConfig(has_offer=False),
        "fathers_day_family_deal": CampaignOfferConfig(
            offer_details="FATHER & SON COMBO - SAVE 35%",
            promo_code="FAMILY35",
            offer_expiry="Book together and save big",
        ),
        # Seasonal Configurations
        "seasonal_with_discount": CampaignOfferConfig(
            offer_details="30% OFF PREMIUM SERVICES",
            promo_code="SEASON30",
            offer_expiry="Valid through end of month",
            discount_percentage=30,
        ),
        "seasonal_no_offer": CampaignOfferConfig(has_offer=False),
        "seasonal_service_focus": CampaignOfferConfig(
            offer_details="COMPLIMENTARY UPGRADE INCLUDED",
            promo_code="UPGRADE",
            offer_expiry="Premium add-ons at no extra cost",
        ),
        # Generic configurations for other holidays
        "holiday_standard_discount": CampaignOfferConfig(
            offer_details="25% OFF HOLIDAY SPECIAL",
            promo_code="HOLIDAY25",
            offer_expiry="Limited time offer",
            discount_percentage=25,
        ),
        "holiday_no_offer": CampaignOfferConfig(has_offer=False),
    }

    @classmethod
    def get_config(cls, config_name: str) -> CampaignOfferConfig:
        """Get a predefined campaign configuration"""
        return cls.CAMPAIGN_CONFIGS.get(
            config_name, cls.CAMPAIGN_CONFIGS["holiday_no_offer"]
        )

    @classmethod
    def create_custom_config(
        cls,
        offer_details: Optional[str] = None,
        promo_code: Optional[str] = None,
        offer_expiry: Optional[str] = None,
        discount_percentage: Optional[int] = None,
    ) -> CampaignOfferConfig:
        """Create a custom campaign configuration"""
        return CampaignOfferConfig(
            offer_details=offer_details,
            promo_code=promo_code,
            offer_expiry=offer_expiry,
            discount_percentage=discount_percentage,
            has_offer=offer_details is not None,
        )

    @classmethod
    def get_campaign_with_config(
        cls, campaign_id: str, config_name: str
    ) -> Dict[str, Any]:
        """Get campaign configuration for automation rules"""
        config = cls.get_config(config_name)

        base_config = {"campaign_id": campaign_id, "config_name": config_name}

        # Add offer configuration
        base_config.update(config.to_dict())

        return base_config


# Example usage configurations for different scenarios:

# For businesses that want discounts:
VALENTINES_WITH_OFFER = EmailCampaignConfigManager.get_campaign_with_config(
    "valentines_day_campaign", "valentines_with_discount"
)

# For businesses that prefer no discounts:
VALENTINES_NO_OFFER = EmailCampaignConfigManager.get_campaign_with_config(
    "valentines_day_campaign", "valentines_no_offer"
)

# Custom configuration example:
CUSTOM_SPRING_PROMO = EmailCampaignConfigManager.create_custom_config(
    offer_details="FREE BEARD TRIM WITH ANY HAIRCUT",
    promo_code="SPRINGFREE",
    offer_expiry="Valid through March 31st",
)

# Configuration examples for different business models:
LUXURY_FOCUS_CONFIG = EmailCampaignConfigManager.create_custom_config(
    offer_details="EXCLUSIVE VIP EXPERIENCE",
    promo_code="VIP",
    offer_expiry="Limited availability",
)

NO_DISCOUNT_CONFIG = EmailCampaignConfigManager.create_custom_config()
