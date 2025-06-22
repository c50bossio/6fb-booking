"""
Security monitoring and CSP reporting endpoints
"""

import json
import logging
from typing import Dict, Any
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import Response

from services.security_monitoring_service import get_security_monitor
from config.settings import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/csp-report")
async def csp_violation_report(request: Request):
    """
    Handle Content Security Policy violation reports
    """
    try:
        # Get the raw body
        body = await request.body()
        report_data = json.loads(body.decode("utf-8"))

        # Extract CSP report
        csp_report = report_data.get("csp-report", {})
        source_ip = request.client.host if request.client else "unknown"

        # Log the violation
        logger.warning(f"CSP Violation from {source_ip}: {csp_report}")

        # Record in security monitoring
        security_monitor = get_security_monitor()
        security_monitor.handle_csp_violation(csp_report, source_ip)

        return Response(status_code=204)  # No content response

    except json.JSONDecodeError:
        logger.error("Invalid JSON in CSP violation report")
        return Response(status_code=400)
    except Exception as e:
        logger.error(f"Error processing CSP violation report: {str(e)}")
        return Response(status_code=500)


@router.get("/security-headers")
async def get_security_headers():
    """
    Get current security headers configuration
    """
    security_monitor = get_security_monitor()
    return security_monitor.get_security_headers_status()


@router.get("/security-summary")
async def get_security_summary():
    """
    Get security monitoring summary and statistics
    """
    try:
        security_monitor = get_security_monitor()
        summary = security_monitor.get_security_summary()
        active_alerts = security_monitor.get_active_alerts()

        return {
            "security_summary": summary,
            "active_alerts": [
                {
                    "id": alert.id,
                    "severity": alert.severity,
                    "title": alert.title,
                    "message": alert.message,
                    "events_count": alert.events_count,
                    "first_seen": alert.first_seen.isoformat(),
                    "last_seen": alert.last_seen.isoformat(),
                }
                for alert in active_alerts
            ],
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error getting security summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "message": "Failed to get security summary"},
        )


@router.post("/security-alerts/{alert_id}/resolve")
async def resolve_security_alert(alert_id: str):
    """
    Resolve a security alert
    """
    try:
        security_monitor = get_security_monitor()
        security_monitor.resolve_alert(alert_id)

        return {
            "status": "success",
            "message": f"Security alert {alert_id} resolved",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error resolving security alert: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "message": "Failed to resolve security alert"},
        )


@router.get("/security-test")
async def security_headers_test(request: Request):
    """
    Test endpoint that applies all security headers
    """
    security_monitor = get_security_monitor()

    response_data = {
        "message": "Security headers test endpoint",
        "request_info": {
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "client": request.client.host if request.client else None,
        },
        "security_headers_applied": True,
        "timestamp": datetime.utcnow().isoformat(),
    }

    response = Response(
        content=json.dumps(response_data, indent=2), media_type="application/json"
    )

    # Apply security headers
    response = security_monitor.apply_security_headers(response)

    return response
