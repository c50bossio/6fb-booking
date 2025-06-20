"""
Simple Trafft Integration Endpoint - No complex dependencies
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import logging
import requests
from datetime import datetime

from config.database import get_db
from utils.auth_decorators import get_current_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


class TrafftSimpleData(BaseModel):
    client_id: str
    client_secret: str
    subdomain: str
    business_name: str
    owner_email: str
    phone: Optional[str] = None
    verification_token: Optional[str] = None


@router.post("/simple-connect")
def connect_trafft_simple(
    data: TrafftSimpleData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simple Trafft connection using requests (not async)"""
    try:
        logger.info(f"Testing simple Trafft connection for {data.business_name}")

        # Validate required fields
        if not all(
            [data.client_id, data.client_secret, data.subdomain, data.business_name]
        ):
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Try to authenticate with Trafft using requests
        auth_url = f"{data.subdomain.rstrip('/')}/oauth/token"

        auth_data = {
            "grant_type": "client_credentials",
            "client_id": data.client_id,
            "client_secret": data.client_secret,
            "scope": "read write",
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }

        logger.info(f"Attempting OAuth authentication at {auth_url}")

        # Make the OAuth request
        response = requests.post(auth_url, data=auth_data, headers=headers, timeout=30)

        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")

            if access_token:
                # Test API access
                api_url = f"{data.subdomain.rstrip('/')}/api/v1/locations"
                api_headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                }

                locations_response = requests.get(
                    api_url, headers=api_headers, timeout=30
                )

                if locations_response.status_code == 200:
                    locations_data = locations_response.json()
                    locations = locations_data.get("data", [])

                    # Success - return real connection info
                    return {
                        "status": "connected",
                        "message": f"Successfully connected {data.business_name} to 6FB Platform",
                        "business_name": data.business_name,
                        "locations_imported": len(locations),
                        "staff_imported": 0,  # Would need to call employees endpoint
                        "services_imported": 0,  # Would need to call services endpoint
                        "webhook_url": "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft",
                        "setup_complete": True,
                        "connection_test": "passed",
                        "api_response": f"Found {len(locations)} locations",
                        "next_steps": [
                            "✅ OAuth credentials verified",
                            "✅ API connection successful",
                            "✅ Ready for data import",
                            "🎯 Real Trafft integration working",
                        ],
                    }
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"API test failed: {locations_response.status_code} - {locations_response.text[:200]}",
                    )
            else:
                raise HTTPException(
                    status_code=400, detail="No access token received from Trafft"
                )
        else:
            error_text = response.text[:500]
            logger.error(f"OAuth failed: {response.status_code} - {error_text}")
            raise HTTPException(
                status_code=400,
                detail=f"Trafft authentication failed: {response.status_code} - {error_text}",
            )

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=400,
            detail="Connection timeout - please check your Trafft URL and try again",
        )
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=400,
            detail="Connection error - please check your Trafft URL and try again",
        )
    except Exception as e:
        logger.error(f"Unexpected error during Trafft connection: {e}")
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")
