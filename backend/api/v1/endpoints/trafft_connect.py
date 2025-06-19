"""
One-Click Trafft Integration for 6FB Platform Scaling
Streamlined connection flow for new barbershop partners
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging
from datetime import datetime
import secrets

from config.database import get_db
from config.settings import get_settings
from models.user import User
from models.location import Location
from models.barber import Barber
from services.trafft_client import TrafftClient, TrafftAPIError
from middleware.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()


@router.post("/connect-trafft")
async def one_click_trafft_connect(
    trafft_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    One-click Trafft connection for new barbershop partners

    Expected trafft_data:
    {
        "api_key": "sk_live_...",  # pragma: allowlist secret
        "subdomain": "mybarbershop",
        "business_name": "My Barbershop",
        "owner_email": "owner@mybarbershop.com",
        "phone": "+1234567890"
    }
    """
    try:
        api_key = trafft_data.get("api_key")
        subdomain = trafft_data.get("subdomain")
        business_name = trafft_data.get("business_name")

        if not all([api_key, subdomain, business_name]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: api_key, subdomain, business_name",
            )

        # Step 1: Validate Trafft API connection
        logger.info(f"Testing Trafft connection for {business_name}")
        async with TrafftClient(api_key) as client:
            # Test API connection
            locations = await client.get_locations()
            employees = await client.get_employees()
            services = await client.get_services()

            if not locations:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No locations found in Trafft account",
                )

        # Step 2: Create webhook secret for this business
        webhook_secret = secrets.token_urlsafe(32)

        # Step 3: Auto-import locations
        imported_locations = []
        for trafft_location in locations:
            location = await _create_location_from_trafft(
                trafft_location, current_user.id, api_key, db
            )
            imported_locations.append(location)

        # Step 4: Auto-import barbers/employees
        imported_barbers = []
        for employee in employees:
            barber = await _create_barber_from_trafft(
                employee, imported_locations[0].id if imported_locations else None, db
            )
            imported_barbers.append(barber)

        # Step 5: Set up webhook URL for this business
        webhook_url = f"{settings.BACKEND_URL}/api/v1/webhooks/trafft"

        # Step 6: Register webhooks with Trafft (in background)
        background_tasks.add_task(
            _setup_trafft_webhooks, api_key, webhook_url, webhook_secret
        )

        # Step 7: Start initial data sync (in background)
        background_tasks.add_task(
            _sync_historical_data,
            api_key,
            imported_locations[0].id if imported_locations else None,
        )

        # Step 8: Update user's barber profile with Trafft info
        if current_user.barber_profile:
            current_user.barber_profile.trafft_api_key = api_key
            current_user.barber_profile.trafft_subdomain = subdomain
            if imported_locations:
                current_user.barber_profile.location_id = imported_locations[0].id

        db.commit()

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "status": "connected",
                "message": f"Successfully connected {business_name} to 6FB Platform",
                "business_name": business_name,
                "locations_imported": len(imported_locations),
                "barbers_imported": len(imported_barbers),
                "services_found": len(services),
                "webhook_url": webhook_url,
                "next_steps": [
                    "✅ Trafft API connection verified",
                    "✅ Locations and barbers imported",
                    "✅ Webhooks being registered",
                    "⏳ Historical data sync starting",
                    "🎯 Dashboard will populate with live data",
                ],
                "setup_complete": True,
                "dashboard_url": f"{settings.FRONTEND_URL}/dashboard",
            },
        )

    except TrafftAPIError as e:
        logger.error(f"Trafft API error during connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trafft connection failed: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error during Trafft connection: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Connection failed. Please try again.",
        )


@router.get("/connection-status")
async def get_trafft_connection_status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current Trafft connection status for the user"""
    try:
        if not current_user.barber_profile:
            return {"connected": False, "message": "No barber profile found"}

        barber = current_user.barber_profile

        if not barber.trafft_api_key:
            return {"connected": False, "message": "Trafft not connected"}

        # Test if API key is still valid
        try:
            async with TrafftClient(barber.trafft_api_key) as client:
                await client.authenticate()

            # Get location info
            location_info = None
            if barber.location:
                location_info = {
                    "name": barber.location.name,
                    "address": barber.location.address,
                    "phone": barber.location.phone,
                }

            return {
                "connected": True,
                "business_name": barber.business_name,
                "subdomain": barber.trafft_subdomain,
                "location": location_info,
                "last_sync": barber.trafft_last_sync,
                "api_status": "active",
            }

        except TrafftAPIError:
            return {
                "connected": False,
                "message": "API key invalid or expired",
                "action_needed": "reconnect",
            }

    except Exception as e:
        logger.error(f"Error checking connection status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not check connection status",
        )


@router.post("/disconnect")
async def disconnect_trafft(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Disconnect Trafft integration for the user"""
    try:
        if not current_user.barber_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="No barber profile found"
            )

        barber = current_user.barber_profile

        # Clear Trafft credentials
        barber.trafft_api_key = None
        barber.trafft_subdomain = None
        barber.trafft_last_sync = None

        db.commit()

        return {
            "status": "disconnected",
            "message": "Trafft integration disconnected successfully",
            "note": "Historical data remains in your 6FB account",
        }

    except Exception as e:
        logger.error(f"Error disconnecting Trafft: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Disconnection failed",
        )


# Helper functions
async def _create_location_from_trafft(
    trafft_location: Dict, owner_user_id: int, api_key: str, db: Session
) -> Location:
    """Create 6FB location from Trafft location data"""

    # Parse Trafft location data
    name = trafft_location.get("name", "Unknown Location")
    address = trafft_location.get("address", "")
    phone = trafft_location.get("phone", "")

    # Parse address components
    city, state, zip_code = _parse_address(address)

    location = Location(
        name=name,
        business_name=name,
        location_code=name.lower().replace(" ", "_").replace("-", "_"),
        address=address,
        city=city,
        state=state,
        zip_code=zip_code,
        phone=phone,
        trafft_location_id=str(trafft_location.get("id", "")),
        trafft_api_key=api_key,
        mentor_id=owner_user_id,
        is_active=True,
        onboarding_status="completed",
    )

    db.add(location)
    db.flush()

    logger.info(f"Created location: {name}")
    return location


async def _create_barber_from_trafft(
    employee: Dict, location_id: Optional[int], db: Session
) -> Barber:
    """Create 6FB barber from Trafft employee data"""

    first_name = employee.get("firstName", "Unknown")
    last_name = employee.get("lastName", "")
    email = employee.get("email", f"{first_name.lower()}@example.com")

    barber = Barber(
        email=email,
        first_name=first_name,
        last_name=last_name,
        phone=employee.get("phone"),
        trafft_employee_id=str(employee.get("id", "")),
        trafft_employee_email=email,
        location_id=location_id,
        is_active=True,
        subscription_tier="basic",
    )

    db.add(barber)
    db.flush()

    logger.info(f"Created barber: {first_name} {last_name}")
    return barber


def _parse_address(address: str) -> tuple[str, str, str]:
    """Parse address into city, state, zip components"""
    city = "Unknown"
    state = "FL"
    zip_code = "00000"

    if address:
        parts = address.split(", ")
        if len(parts) >= 3:
            city = parts[-3] if len(parts) > 2 else "Unknown"
            state_zip = parts[-2] if len(parts) > 1 else "FL 00000"
            if " " in state_zip:
                state, zip_code = state_zip.split(" ", 1)

    return city, state, zip_code


async def _setup_trafft_webhooks(api_key: str, webhook_url: str, webhook_secret: str):
    """Background task to set up Trafft webhooks"""
    try:
        async with TrafftClient(api_key) as client:
            webhook_events = [
                "appointment.created",
                "appointment.updated",
                "appointment.cancelled",
                "appointment.completed",
                "customer.created",
                "customer.updated",
            ]

            for event in webhook_events:
                await client.register_webhook(webhook_url, event, webhook_secret)

        logger.info(f"Webhooks registered successfully for {webhook_url}")

    except Exception as e:
        logger.error(f"Failed to register webhooks: {e}")


async def _sync_historical_data(api_key: str, location_id: Optional[int]):
    """Background task to sync historical appointment data"""
    try:
        from services.trafft_sync_service import TrafftSyncService
        from config.database import SessionLocal

        db = SessionLocal()
        sync_service = TrafftSyncService(db)

        # Sync last 30 days of appointments
        from datetime import datetime, timedelta

        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        async with TrafftClient(api_key) as client:
            appointments = await client.get_appointments(start_date, end_date)

            synced_count = 0
            for appointment_data in appointments:
                try:
                    result = await sync_service.process_appointment_webhook(
                        appointment_data
                    )
                    if result.get("status") == "success":
                        synced_count += 1
                except Exception as e:
                    logger.error(f"Error syncing appointment: {e}")
                    continue

            db.commit()
            logger.info(
                f"Historical sync completed: {synced_count} appointments synced"
            )

    except Exception as e:
        logger.error(f"Historical sync failed: {e}")
    finally:
        db.close()
