"""
Google Ads API service for BookedBarber V2.
Handles OAuth flow, campaign management, conversion tracking, and performance reporting.

This service integrates with Google Ads API v15 to provide:
- OAuth2 authentication flow
- Campaign creation and management
- Conversion import from tracking system
- Audience creation from customer data
- Budget and bid management
- Performance reporting
- Offline conversions upload
"""

import os
import json
import logging
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.integration import Integration, IntegrationType, IntegrationStatus
from models.tracking import ConversionEvent, ConversionStatus
from models import User, Client, Appointment
from schemas_new.integration import IntegrationCreate, IntegrationUpdate
from services.integration_service import BaseIntegrationService, IntegrationServiceFactory
from utils.encryption import encrypt_text, decrypt_text


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GoogleAdsService(BaseIntegrationService):
    """Google Ads API service with OAuth and campaign management"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self._client_id = os.getenv("GOOGLE_ADS_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
        self._client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET")
        self.developer_token = os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
        
        # API endpoints
        self.oauth_base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.ads_api_base_url = "https://googleads.googleapis.com/v15"
        
        # Rate limiting configuration
        self.rate_limit_per_minute = 60
        self.rate_limit_per_day = 15000
        
        if not all([self._client_id, self._client_secret, self.developer_token]):
            logger.warning("Google Ads credentials not fully configured")
    
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.GOOGLE_ADS
    
    @property
    def oauth_authorize_url(self) -> str:
        return self.oauth_base_url
    
    @property
    def oauth_token_url(self) -> str:
        return self.token_url
    
    @property
    def required_scopes(self) -> List[str]:
        return ["https://www.googleapis.com/auth/adwords"]
    
    @property
    def client_id(self) -> str:
        return self._client_id
    
    @property
    def client_secret(self) -> str:
        return self._client_secret
    
    @property
    def default_redirect_uri(self) -> str:
        return os.getenv("GOOGLE_ADS_REDIRECT_URI", "http://localhost:8000/api/v2/integrations/google-ads/callback")
    
    def get_oauth_url(self, redirect_uri: str, state: str = None) -> str:
        """Generate OAuth authorization URL for Google Ads access"""
        if not self.client_id:
            raise HTTPException(
                status_code=500,
                detail="Google Ads OAuth not configured. Please set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET."
            )
        
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "scope": " ".join(self.required_scopes),
            "redirect_uri": redirect_uri,
            "access_type": "offline",
            "prompt": "consent",
        }
        
        if state:
            params["state"] = state
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.oauth_authorize_url}?{query_string}"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        if not all([self.client_id, self.client_secret]):
            raise HTTPException(
                status_code=500,
                detail="Google Ads OAuth credentials not configured"
            )
        
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, data=token_data)
            
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code for tokens: {response.text}"
            )
        
        return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh an expired access token using refresh token"""
        if not all([self.client_id, self.client_secret]):
            raise HTTPException(
                status_code=500,
                detail="Google Ads OAuth credentials not configured"
            )
        
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, data=token_data)
            
        if response.status_code != 200:
            logger.error(f"Token refresh failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to refresh token: {response.text}"
            )
        
        return response.json()
    
    async def verify_connection(self, integration: Integration) -> Tuple[bool, Optional[str]]:
        """Verify that the integration connection is valid"""
        try:
            customer_accounts = await self.list_customer_accounts(integration)
            if customer_accounts:
                return True, None
            else:
                return False, "No Google Ads accounts found"
        except Exception as e:
            logger.error(f"Connection verification failed: {str(e)}")
            return False, str(e)
    
    async def get_authenticated_headers(self, integration: Integration) -> Dict[str, str]:
        """Get authenticated headers for Google Ads API calls"""
        await self.refresh_token_if_needed(integration)
        
        access_token = decrypt_text(integration.access_token)
        customer_id = integration.config.get("customer_id")
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "developer-token": self.developer_token,
            "Content-Type": "application/json",
        }
        
        if customer_id:
            headers["login-customer-id"] = customer_id
        
        return headers
    
    async def list_customer_accounts(self, integration: Integration) -> List[Dict[str, Any]]:
        """List all Google Ads customer accounts accessible by the authenticated user"""
        try:
            headers = await self.get_authenticated_headers(integration)
            
            query = """
                SELECT
                    customer_client.id,
                    customer_client.descriptive_name,
                    customer_client.currency_code,
                    customer_client.time_zone,
                    customer_client.status
                FROM customer_client
                WHERE customer_client.manager = FALSE
            """
            
            request_data = {
                "query": query,
                "pageSize": 100
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{integration.config.get('customer_id', 'root')}/googleAds:searchStream",
                    headers=headers,
                    json=request_data
                )
            
            if response.status_code == 200:
                data = response.json()
                accounts = []
                
                for result in data.get("results", []):
                    customer = result.get("customerClient", {})
                    accounts.append({
                        "id": customer.get("id"),
                        "name": customer.get("descriptiveName"),
                        "currency": customer.get("currencyCode"),
                        "timezone": customer.get("timeZone"),
                        "status": customer.get("status")
                    })
                
                return accounts
            else:
                logger.error(f"Failed to list customer accounts: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error listing customer accounts: {str(e)}")
            return []
    
    async def create_campaign(
        self,
        integration: Integration,
        campaign_name: str,
        budget_amount: Decimal,
        campaign_type: str = "SEARCH",
        status: str = "PAUSED",
        targeting: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a new Google Ads campaign"""
        try:
            headers = await self.get_authenticated_headers(integration)
            customer_id = integration.config.get("customer_id")
            
            if not customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="No Google Ads customer ID configured"
                )
            
            # Create campaign budget first
            budget_operation = {
                "create": {
                    "name": f"{campaign_name} Budget",
                    "amountMicros": str(int(budget_amount * 1_000_000)),
                    "deliveryMethod": "STANDARD"
                }
            }
            
            # Create campaign
            campaign_operation = {
                "create": {
                    "name": campaign_name,
                    "status": status,
                    "advertisingChannelType": campaign_type,
                    "campaignBudget": f"customers/{customer_id}/campaignBudgets/{budget_operation['create']['name']}",
                    "biddingStrategy": {
                        "targetCpa": {
                            "targetCpaMicros": "50000000"  # $50 target CPA
                        }
                    }
                }
            }
            
            # Apply targeting if provided
            if targeting:
                if "locations" in targeting:
                    campaign_operation["create"]["geoTargetTypeSetting"] = {
                        "positiveGeoTargetType": "PRESENCE_OR_INTEREST"
                    }
                
                if "schedule" in targeting:
                    campaign_operation["create"]["adScheduleTargets"] = targeting["schedule"]
            
            # Execute operations
            operations = [
                {"campaignBudgetOperation": budget_operation},
                {"campaignOperation": campaign_operation}
            ]
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{customer_id}/googleAds:mutate",
                    headers=headers,
                    json={"operations": operations}
                )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "campaign_id": result.get("results", [{}])[1].get("resourceName"),
                    "budget_id": result.get("results", [{}])[0].get("resourceName"),
                    "details": result
                }
            else:
                logger.error(f"Failed to create campaign: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create campaign: {response.text}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating campaign: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating campaign: {str(e)}"
            )
    
    async def upload_offline_conversions(
        self,
        integration: Integration,
        conversions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Upload offline conversions to Google Ads"""
        try:
            headers = await self.get_authenticated_headers(integration)
            customer_id = integration.config.get("customer_id")
            conversion_action_id = integration.config.get("conversion_action_id")
            
            if not all([customer_id, conversion_action_id]):
                raise HTTPException(
                    status_code=400,
                    detail="Customer ID and conversion action ID required"
                )
            
            # Format conversions for Google Ads API
            operations = []
            for conversion in conversions:
                operation = {
                    "create": {
                        "conversionAction": f"customers/{customer_id}/conversionActions/{conversion_action_id}",
                        "gclid": conversion.get("gclid"),
                        "conversionDateTime": conversion.get("conversion_time"),
                        "conversionValue": conversion.get("value", 0),
                        "currencyCode": conversion.get("currency", "USD")
                    }
                }
                
                # Add custom variables if provided
                if "custom_variables" in conversion:
                    operation["create"]["customVariables"] = conversion["custom_variables"]
                
                operations.append({"conversionUploadOperation": operation})
            
            # Upload conversions
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{customer_id}/conversionUploads:uploadClickConversions",
                    headers=headers,
                    json={
                        "operations": operations,
                        "partialFailure": True
                    }
                )
            
            if response.status_code == 200:
                result = response.json()
                success_count = len([r for r in result.get("results", []) if "resourceName" in r])
                
                return {
                    "success": True,
                    "uploaded_count": success_count,
                    "total_count": len(conversions),
                    "details": result
                }
            else:
                logger.error(f"Failed to upload conversions: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to upload conversions: {response.text}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading conversions: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error uploading conversions: {str(e)}"
            )
    
    async def create_customer_match_audience(
        self,
        integration: Integration,
        audience_name: str,
        customer_data: List[Dict[str, str]],
        membership_lifespan_days: int = 30
    ) -> Dict[str, Any]:
        """Create a customer match audience from customer data"""
        try:
            headers = await self.get_authenticated_headers(integration)
            customer_id = integration.config.get("customer_id")
            
            if not customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="No Google Ads customer ID configured"
                )
            
            # Create user list first
            user_list_operation = {
                "create": {
                    "name": audience_name,
                    "description": f"Customer match audience created from BookedBarber data",
                    "membershipLifeSpan": membership_lifespan_days,
                    "crmBasedUserList": {
                        "uploadKeyType": "CONTACT_INFO",
                        "dataSourceType": "FIRST_PARTY"
                    }
                }
            }
            
            # Create user list
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{customer_id}/userLists:mutate",
                    headers=headers,
                    json={"operations": [{"userListOperation": user_list_operation}]}
                )
            
            if response.status_code != 200:
                logger.error(f"Failed to create user list: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create user list: {response.text}"
                )
            
            user_list_result = response.json()
            user_list_resource = user_list_result.get("results", [{}])[0].get("resourceName")
            
            # Format customer data for upload
            members = []
            for customer in customer_data:
                member = {}
                
                if customer.get("email"):
                    member["hashedEmail"] = self._normalize_and_hash(customer["email"])
                
                if customer.get("phone"):
                    member["hashedPhoneNumber"] = self._normalize_and_hash(customer["phone"])
                
                if customer.get("first_name") and customer.get("last_name"):
                    member["addressInfo"] = {
                        "hashedFirstName": self._normalize_and_hash(customer["first_name"]),
                        "hashedLastName": self._normalize_and_hash(customer["last_name"])
                    }
                    
                    if customer.get("postal_code"):
                        member["addressInfo"]["postalCode"] = customer["postal_code"]
                    
                    if customer.get("country_code"):
                        member["addressInfo"]["countryCode"] = customer["country_code"]
                
                if member:
                    members.append(member)
            
            # Upload members to the user list
            member_operations = [
                {
                    "userIdentifier": member,
                    "remove": False
                }
                for member in members
            ]
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/{user_list_resource}/members:mutate",
                    headers=headers,
                    json={"operations": member_operations}
                )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "user_list_id": user_list_resource,
                    "members_added": len(members),
                    "audience_name": audience_name
                }
            else:
                logger.error(f"Failed to add members to user list: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to add members to user list: {response.text}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating customer match audience: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating customer match audience: {str(e)}"
            )
    
    async def update_campaign_budget(
        self,
        integration: Integration,
        campaign_id: str,
        new_budget_amount: Decimal
    ) -> Dict[str, Any]:
        """Update campaign budget"""
        try:
            headers = await self.get_authenticated_headers(integration)
            customer_id = integration.config.get("customer_id")
            
            if not customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="No Google Ads customer ID configured"
                )
            
            # Get campaign details first to find budget ID
            query = f"""
                SELECT
                    campaign.id,
                    campaign.campaign_budget
                FROM campaign
                WHERE campaign.resource_name = '{campaign_id}'
            """
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{customer_id}/googleAds:search",
                    headers=headers,
                    json={"query": query}
                )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to get campaign details: {response.text}"
                )
            
            campaign_data = response.json()
            budget_resource = campaign_data.get("results", [{}])[0].get("campaign", {}).get("campaignBudget")
            
            # Update budget
            budget_operation = {
                "update": {
                    "resourceName": budget_resource,
                    "amountMicros": str(int(new_budget_amount * 1_000_000))
                },
                "updateMask": "amount_micros"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{customer_id}/campaignBudgets:mutate",
                    headers=headers,
                    json={"operations": [budget_operation]}
                )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "new_budget": float(new_budget_amount),
                    "details": response.json()
                }
            else:
                logger.error(f"Failed to update budget: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to update budget: {response.text}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating campaign budget: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error updating campaign budget: {str(e)}"
            )
    
    async def get_campaign_performance(
        self,
        integration: Integration,
        campaign_ids: Optional[List[str]] = None,
        date_range: str = "LAST_30_DAYS",
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get campaign performance metrics"""
        try:
            headers = await self.get_authenticated_headers(integration)
            customer_id = integration.config.get("customer_id")
            
            if not customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="No Google Ads customer ID configured"
                )
            
            # Default metrics if none specified
            if not metrics:
                metrics = [
                    "impressions",
                    "clicks",
                    "cost_micros",
                    "conversions",
                    "conversion_value",
                    "average_cpc",
                    "ctr",
                    "conversion_rate"
                ]
            
            # Build query
            query_parts = [
                "SELECT",
                "    campaign.id,",
                "    campaign.name,",
                "    campaign.status,",
                f"    {', '.join([f'metrics.{m}' for m in metrics])}",
                "FROM campaign",
                f"WHERE segments.date DURING {date_range}"
            ]
            
            if campaign_ids:
                campaign_filter = " OR ".join([f"campaign.resource_name = '{cid}'" for cid in campaign_ids])
                query_parts.append(f"AND ({campaign_filter})")
            
            query = "\n".join(query_parts)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{customer_id}/googleAds:searchStream",
                    headers=headers,
                    json={"query": query}
                )
            
            if response.status_code == 200:
                data = response.json()
                campaigns_performance = []
                
                for result in data.get("results", []):
                    campaign = result.get("campaign", {})
                    metrics_data = result.get("metrics", {})
                    
                    performance = {
                        "campaign_id": campaign.get("id"),
                        "campaign_name": campaign.get("name"),
                        "status": campaign.get("status"),
                        "metrics": {
                            "impressions": metrics_data.get("impressions", 0),
                            "clicks": metrics_data.get("clicks", 0),
                            "cost": metrics_data.get("costMicros", 0) / 1_000_000,
                            "conversions": metrics_data.get("conversions", 0),
                            "conversion_value": metrics_data.get("conversionValue", 0),
                            "average_cpc": metrics_data.get("averageCpc", 0) / 1_000_000,
                            "ctr": metrics_data.get("ctr", 0),
                            "conversion_rate": metrics_data.get("conversionRate", 0)
                        }
                    }
                    
                    campaigns_performance.append(performance)
                
                # Calculate totals
                totals = {
                    "impressions": sum(c["metrics"]["impressions"] for c in campaigns_performance),
                    "clicks": sum(c["metrics"]["clicks"] for c in campaigns_performance),
                    "cost": sum(c["metrics"]["cost"] for c in campaigns_performance),
                    "conversions": sum(c["metrics"]["conversions"] for c in campaigns_performance),
                    "conversion_value": sum(c["metrics"]["conversion_value"] for c in campaigns_performance)
                }
                
                if totals["clicks"] > 0:
                    totals["average_cpc"] = totals["cost"] / totals["clicks"]
                    totals["conversion_rate"] = (totals["conversions"] / totals["clicks"]) * 100
                else:
                    totals["average_cpc"] = 0
                    totals["conversion_rate"] = 0
                
                if totals["impressions"] > 0:
                    totals["ctr"] = (totals["clicks"] / totals["impressions"]) * 100
                else:
                    totals["ctr"] = 0
                
                return {
                    "success": True,
                    "date_range": date_range,
                    "campaigns": campaigns_performance,
                    "totals": totals
                }
            else:
                logger.error(f"Failed to get campaign performance: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to get campaign performance: {response.text}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting campaign performance: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error getting campaign performance: {str(e)}"
            )
    
    async def sync_conversions_from_tracking(
        self,
        integration: Integration,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Sync conversions from the BookedBarber tracking system to Google Ads"""
        try:
            # Get conversions from tracking system
            conversions = self.db.query(ConversionEvent).filter(
                ConversionEvent.created_at >= start_date,
                ConversionEvent.created_at <= end_date,
                ConversionEvent.google_ads_synced == False
            ).all()
            
            if not conversions:
                return {
                    "success": True,
                    "message": "No conversions to sync",
                    "synced_count": 0
                }
            
            # Format conversions for upload
            formatted_conversions = []
            for conversion in conversions:
                # Check if we have GCLID in event_data
                if conversion.event_data and conversion.event_data.get("gclid"):
                    formatted_conversions.append({
                        "gclid": conversion.event_data["gclid"],
                        "conversion_time": conversion.created_at.isoformat() + "Z",
                        "value": float(conversion.event_value) if conversion.event_value else 0,
                        "currency": conversion.event_currency or "USD",
                        "custom_variables": {
                            "user_id": str(conversion.user_id),
                            "event_name": conversion.event_name,
                            "event_type": conversion.event_type.value
                        }
                    })
            
            if formatted_conversions:
                # Upload to Google Ads
                result = await self.upload_offline_conversions(integration, formatted_conversions)
                
                # Mark conversions as synced
                for conversion in conversions:
                    conversion.google_ads_synced = True
                    conversion.google_ads_sync_time = datetime.utcnow()
                    conversion.status = ConversionStatus.TRACKED
                
                self.db.commit()
                
                return result
            else:
                return {
                    "success": True,
                    "message": "No conversions with GCLID found",
                    "synced_count": 0
                }
                
        except Exception as e:
            logger.error(f"Error syncing conversions: {str(e)}")
            
            # Mark conversions as failed
            for conversion in conversions:
                conversion.status = ConversionStatus.FAILED
                conversion.error_message = str(e)
            
            self.db.commit()
            
            raise HTTPException(
                status_code=500,
                detail=f"Error syncing conversions: {str(e)}"
            )
    
    async def create_remarketing_audience_from_appointments(
        self,
        integration: Integration,
        audience_name: str,
        days_back: int = 30,
        include_completed: bool = True,
        include_cancelled: bool = False
    ) -> Dict[str, Any]:
        """Create a remarketing audience from appointment data"""
        try:
            # Get appointments based on criteria
            query = self.db.query(Appointment).join(Client).filter(
                Appointment.created_at >= datetime.utcnow() - timedelta(days=days_back)
            )
            
            if include_completed and not include_cancelled:
                query = query.filter(Appointment.status == "completed")
            elif include_cancelled and not include_completed:
                query = query.filter(Appointment.status == "cancelled")
            elif include_completed and include_cancelled:
                query = query.filter(Appointment.status.in_(["completed", "cancelled"]))
            
            appointments = query.all()
            
            # Extract unique customer data
            customer_data = []
            seen_emails = set()
            
            for appointment in appointments:
                if appointment.client and appointment.client.email not in seen_emails:
                    seen_emails.add(appointment.client.email)
                    customer_data.append({
                        "email": appointment.client.email,
                        "phone": appointment.client.phone,
                        "first_name": appointment.client.first_name,
                        "last_name": appointment.client.last_name,
                        "postal_code": None,  # Client model doesn't have postal_code yet
                        "country_code": "US"  # Default to US, should be configurable
                    })
            
            if customer_data:
                # Create customer match audience
                result = await self.create_customer_match_audience(
                    integration,
                    audience_name,
                    customer_data,
                    membership_lifespan_days=90  # 90 days for remarketing
                )
                
                # Store audience info in integration config
                if "audiences" not in integration.config:
                    integration.config["audiences"] = []
                
                integration.config["audiences"].append({
                    "id": result["user_list_id"],
                    "name": audience_name,
                    "created_at": datetime.utcnow().isoformat(),
                    "criteria": {
                        "days_back": days_back,
                        "include_completed": include_completed,
                        "include_cancelled": include_cancelled
                    },
                    "size": len(customer_data)
                })
                
                self.db.commit()
                
                return result
            else:
                return {
                    "success": False,
                    "message": "No customers found matching criteria",
                    "members_added": 0
                }
                
        except Exception as e:
            logger.error(f"Error creating remarketing audience: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating remarketing audience: {str(e)}"
            )
    
    def _normalize_and_hash(self, value: str) -> str:
        """Normalize and hash data for customer match upload"""
        import hashlib
        
        # Normalize: lowercase and strip whitespace
        normalized = value.lower().strip()
        
        # Remove common phone number formatting
        if any(char in normalized for char in ['+', '-', '(', ')', ' ']):
            normalized = ''.join(filter(str.isdigit, normalized))
        
        # Hash using SHA256
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    
    async def pause_campaign(self, integration: Integration, campaign_id: str) -> Dict[str, Any]:
        """Pause a campaign"""
        return await self._update_campaign_status(integration, campaign_id, "PAUSED")
    
    async def enable_campaign(self, integration: Integration, campaign_id: str) -> Dict[str, Any]:
        """Enable a campaign"""
        return await self._update_campaign_status(integration, campaign_id, "ENABLED")
    
    async def _update_campaign_status(
        self,
        integration: Integration,
        campaign_id: str,
        status: str
    ) -> Dict[str, Any]:
        """Update campaign status"""
        try:
            headers = await self.get_authenticated_headers(integration)
            customer_id = integration.config.get("customer_id")
            
            if not customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="No Google Ads customer ID configured"
                )
            
            campaign_operation = {
                "update": {
                    "resourceName": campaign_id,
                    "status": status
                },
                "updateMask": "status"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ads_api_base_url}/customers/{customer_id}/campaigns:mutate",
                    headers=headers,
                    json={"operations": [campaign_operation]}
                )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "status": status,
                    "details": response.json()
                }
            else:
                logger.error(f"Failed to update campaign status: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to update campaign status: {response.text}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating campaign status: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error updating campaign status: {str(e)}"
            )
    
    async def test_connection(self, integration: Integration) -> Dict[str, Any]:
        """Test the Google Ads integration connection"""
        try:
            accounts = await self.list_customer_accounts(integration)
            
            if accounts:
                return {
                    "healthy": True,
                    "message": f"Connected successfully. Found {len(accounts)} Google Ads account(s).",
                    "accounts_count": len(accounts),
                    "accounts": accounts[:5]  # Return first 5 accounts
                }
            else:
                return {
                    "healthy": False,
                    "message": "No Google Ads accounts found. Please ensure proper permissions are granted.",
                    "accounts_count": 0
                }
                
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Connection test failed: {str(e)}",
                "error": str(e)
            }


# Register the service with the factory
IntegrationServiceFactory.register(IntegrationType.GOOGLE_ADS, GoogleAdsService)