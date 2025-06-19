"""
Trafft Sync API Endpoints
Provides API endpoints for managing Trafft integration and synchronization
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from services.trafft_sync import (
    TrafftSyncService,
    perform_initial_import,
    sync_recent_changes,
    register_trafft_webhooks,
)
from services.trafft_client import get_trafft_client, TrafftAPIError
from config.database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trafft", tags=["trafft-sync"])


@router.get("/status")
async def get_trafft_status():
    """Get Trafft integration status"""
    try:
        async with await get_trafft_client() as client:
            # Check API connection
            await client.authenticate()

            # Get webhook status
            webhooks = await client.get_webhooks()

            return {
                "status": "connected",
                "api_health": "healthy",
                "webhook_status": "active" if webhooks else "inactive",
                "webhooks_registered": len(webhooks),
                "last_check": datetime.utcnow().isoformat(),
            }

    except TrafftAPIError as e:
        logger.error(f"Trafft API error: {e}")
        return {
            "status": "error",
            "api_health": "unhealthy",
            "error": str(e),
            "last_check": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Unexpected error checking Trafft status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/connect")
async def connect_trafft(api_key: str):
    """Connect to Trafft with API key"""
    try:
        # Test connection with provided API key
        from services.trafft_client import TrafftClient

        async with TrafftClient(api_key) as client:
            await client.authenticate()

            # If successful, store API key (in real app, store securely)
            # For demo purposes, we'll just return success

            return {
                "status": "connected",
                "message": "Successfully connected to Trafft",
                "timestamp": datetime.utcnow().isoformat(),
            }

    except TrafftAPIError as e:
        logger.error(f"Trafft connection failed: {e}")
        raise HTTPException(status_code=401, detail=f"Connection failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error connecting to Trafft: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/disconnect")
async def disconnect_trafft():
    """Disconnect from Trafft"""
    try:
        # In real app, remove stored API key and disable webhooks
        async with await get_trafft_client() as client:
            # Get and delete all webhooks
            webhooks = await client.get_webhooks()
            for webhook in webhooks:
                await client.delete_webhook(webhook.get("id"))

        return {
            "status": "disconnected",
            "message": "Successfully disconnected from Trafft",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error disconnecting from Trafft: {e}")
        # Still return success since we want to disconnect regardless
        return {
            "status": "disconnected",
            "message": "Disconnected (with warnings)",
            "warning": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@router.post("/sync/initial")
async def initial_import_endpoint(
    background_tasks: BackgroundTasks, days_back: int = 30
):
    """Perform initial import of data from Trafft"""
    try:
        # Start import in background
        background_tasks.add_task(perform_initial_import, days_back)

        return {
            "status": "started",
            "message": f"Initial import started for last {days_back} days",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error starting initial import: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/manual")
async def manual_sync_endpoint(background_tasks: BackgroundTasks, hours_back: int = 24):
    """Perform manual sync of recent changes"""
    try:
        # Start sync in background
        background_tasks.add_task(sync_recent_changes, hours_back)

        return {
            "status": "started",
            "message": f"Manual sync started for last {hours_back} hours",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error starting manual sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/register")
async def register_webhooks_endpoint():
    """Register webhooks with Trafft for real-time sync"""
    try:
        result = await register_trafft_webhooks()

        if result.get("status") == "registered":
            return JSONResponse(status_code=200, content=result)
        else:
            return JSONResponse(status_code=400, content=result)

    except Exception as e:
        logger.error(f"Error registering webhooks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhooks/status")
async def get_webhook_status():
    """Get webhook registration status"""
    try:
        async with await get_trafft_client() as client:
            webhooks = await client.get_webhooks()

            return {
                "status": "active" if webhooks else "inactive",
                "webhooks": webhooks,
                "count": len(webhooks),
                "events_listening": [
                    "appointment.created",
                    "appointment.updated",
                    "appointment.cancelled",
                    "appointment.completed",
                    "customer.created",
                    "customer.updated",
                    "payment.completed",
                ],
            }

    except Exception as e:
        logger.error(f"Error getting webhook status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointments/recent")
async def get_recent_appointments(hours_back: int = 24):
    """Get recent appointments from Trafft"""
    try:
        from datetime import timedelta

        async with await get_trafft_client() as client:
            end_date = datetime.now()
            start_date = end_date - timedelta(hours=hours_back)

            appointments = await client.get_appointments(start_date, end_date)

            return {
                "appointments": appointments,
                "count": len(appointments),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
            }

    except Exception as e:
        logger.error(f"Error getting recent appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers")
async def get_trafft_customers(limit: int = 50, offset: int = 0):
    """Get customers from Trafft"""
    try:
        async with await get_trafft_client() as client:
            customers = await client.get_customers(limit=limit, offset=offset)

            return {
                "customers": customers,
                "count": len(customers),
                "pagination": {"limit": limit, "offset": offset},
            }

    except Exception as e:
        logger.error(f"Error getting customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/services")
async def get_trafft_services():
    """Get services from Trafft"""
    try:
        async with await get_trafft_client() as client:
            services = await client.get_services()

            return {"services": services, "count": len(services)}

    except Exception as e:
        logger.error(f"Error getting services: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employees")
async def get_trafft_employees():
    """Get employees/barbers from Trafft"""
    try:
        async with await get_trafft_client() as client:
            employees = await client.get_employees()

            return {"employees": employees, "count": len(employees)}

    except Exception as e:
        logger.error(f"Error getting employees: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/revenue")
async def get_trafft_revenue_report(
    start_date: str, end_date: str, employee_id: Optional[int] = None
):
    """Get revenue report from Trafft"""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        async with await get_trafft_client() as client:
            report = await client.get_revenue_report(start_dt, end_dt, employee_id)

            return report

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        logger.error(f"Error getting revenue report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/history")
async def get_sync_history(db: Session = Depends(get_db)):
    """Get synchronization history"""
    try:
        # In a real app, this would query a sync_history table
        # For now, return mock data
        return {
            "sync_events": [
                {
                    "id": 1,
                    "timestamp": "2024-12-18 14:30:25",
                    "type": "webhook",
                    "event": "appointment.created",
                    "status": "success",
                    "details": "New appointment synced successfully",
                },
                {
                    "id": 2,
                    "timestamp": "2024-12-18 13:45:33",
                    "type": "periodic",
                    "event": "bulk_sync",
                    "status": "success",
                    "details": "12 appointments synced from last 24 hours",
                },
            ],
            "total": 2,
        }

    except Exception as e:
        logger.error(f"Error getting sync history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def trafft_health_check():
    """Health check for Trafft integration"""
    try:
        async with await get_trafft_client() as client:
            await client.authenticate()

            return {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "service": "trafft-integration",
            }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "service": "trafft-integration",
        }
