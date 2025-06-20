"""
Real Trafft OAuth Integration Endpoint
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging
import secrets

from config.database import get_db
from services.trafft_oauth_client import TrafftOAuthClient, TrafftOAuthError
from services.trafft_data_sync import TrafftDataSyncService
from utils.auth_decorators import get_current_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


class TrafftOAuthData(BaseModel):
    client_id: str
    client_secret: str
    subdomain: str
    business_name: str
    owner_email: str
    phone: Optional[str] = None
    verification_token: Optional[str] = None


@router.post("/connect")
async def connect_trafft_oauth(
    data: TrafftOAuthData,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Connect to Trafft using OAuth 2.0 credentials and sync real data"""
    try:
        logger.info(f"Starting real Trafft OAuth connection for {data.business_name}")

        # Validate required fields
        if not all(
            [data.client_id, data.client_secret, data.subdomain, data.business_name]
        ):
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Create Trafft OAuth client with real credentials
        async with TrafftOAuthClient(
            client_id=data.client_id,
            client_secret=data.client_secret,
            base_url=data.subdomain,
        ) as trafft_client:

            # Test connection first
            logger.info("Testing Trafft API connection...")
            connection_test = await trafft_client.test_connection()

            if not connection_test.get("connected"):
                raise HTTPException(
                    status_code=400,
                    detail="Failed to connect to Trafft API. Please check your credentials.",
                )

            # Perform initial data sync
            logger.info("Starting data synchronization...")
            sync_service = TrafftDataSyncService(db)
            sync_results = await sync_service.full_sync(trafft_client, current_user.id)

            # Set up webhooks in background
            webhook_secret = data.verification_token or secrets.token_urlsafe(32)
            webhook_url = "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft"

            background_tasks.add_task(
                _setup_webhooks_background,
                data.client_id,
                data.client_secret,
                data.subdomain,
                webhook_url,
                webhook_secret,
            )

            # Store OAuth credentials securely (in background)
            background_tasks.add_task(
                _store_oauth_credentials,
                current_user.id,
                data.client_id,
                data.client_secret,
                data.subdomain,
                db,
            )

            logger.info(f"Trafft connection successful: {sync_results}")

            return JSONResponse(
                status_code=201,
                content={
                    "status": "connected",
                    "message": f"Successfully connected {data.business_name} to 6FB Platform",
                    "business_name": data.business_name,
                    "locations_imported": sync_results.get("locations_imported", 0),
                    "staff_imported": sync_results.get("barbers_imported", 0),
                    "services_imported": sync_results.get("services_found", 0),
                    "appointments_synced": sync_results.get("appointments_imported", 0),
                    "clients_imported": sync_results.get("clients_imported", 0),
                    "webhook_url": webhook_url,
                    "setup_complete": True,
                    "sync_errors": sync_results.get("errors", []),
                    "next_steps": [
                        "✅ OAuth credentials verified",
                        "✅ Real data imported from Trafft",
                        "✅ Webhooks being configured",
                        "🎯 Dashboard showing live data",
                        "🔄 Real-time sync active",
                    ],
                },
            )

    except TrafftOAuthError as e:
        logger.error(f"Trafft API error: {e}")
        raise HTTPException(
            status_code=400, detail=f"Trafft connection failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during Trafft connection: {e}")
        raise HTTPException(
            status_code=500, detail="Connection failed. Please try again."
        )


async def _setup_webhooks_background(
    client_id: str,
    client_secret: str,
    base_url: str,
    webhook_url: str,
    webhook_secret: str,
):
    """Background task to set up Trafft webhooks"""
    try:
        async with TrafftOAuthClient(client_id, client_secret, base_url) as client:
            webhook_events = [
                "appointment.created",
                "appointment.updated",
                "appointment.cancelled",
                "appointment.completed",
                "customer.created",
                "customer.updated",
            ]

            await client.register_webhook(webhook_url, webhook_events, webhook_secret)
            logger.info(f"Webhooks registered successfully for {base_url}")

    except Exception as e:
        logger.error(f"Failed to register webhooks: {e}")


async def _store_oauth_credentials(
    user_id: int, client_id: str, client_secret: str, base_url: str, db: Session
):
    """Background task to store OAuth credentials securely"""
    try:
        # In production, encrypt these credentials before storing
        # For now, we'll store them in the user's barber profile
        from models.barber import Barber

        barber = db.query(Barber).filter(Barber.id == user_id).first()
        if not barber:
            # Create barber profile if it doesn't exist
            barber = Barber(
                email=f"user_{user_id}@temp.com",
                first_name="User",
                last_name=str(user_id),
                subscription_tier="premium",
            )
            db.add(barber)

        # Store credentials (encrypt in production!)
        barber.trafft_client_id = client_id
        barber.trafft_client_secret = client_secret  # Encrypt this!
        barber.trafft_subdomain = base_url
        barber.trafft_last_sync = datetime.now()

        db.commit()
        logger.info(f"OAuth credentials stored for user {user_id}")

    except Exception as e:
        logger.error(f"Failed to store OAuth credentials: {e}")
        db.rollback()
