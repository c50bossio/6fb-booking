"""
Health check and system status endpoints for monitoring services
"""

import asyncio
import time
from typing import Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
import httpx
import os
import logging

from config.database import get_db
from config.settings import settings
from services.monitoring_service import monitoring_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """
    Basic health check endpoint for uptime monitoring
    Returns 200 if service is healthy, 503 if unhealthy
    """
    try:
        # Quick health check without detailed diagnostics
        is_healthy = True
        response_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "6fb-booking-api",
            "version": os.getenv("RELEASE_VERSION", "unknown"),
        }

        # Quick database check
        try:
            db = next(get_db())
            result = db.execute(text("SELECT 1"))
            result.fetchone()
            response_data["database"] = "healthy"
        except Exception as e:
            is_healthy = False
            response_data["database"] = "unhealthy"
            response_data["database_error"] = str(e)

        if not is_healthy:
            response_data["status"] = "unhealthy"
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=response_data
            )

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@router.get("/health/detailed", response_model=Dict[str, Any])
async def detailed_health_check(db: Session = Depends(get_db)):
    """
    Detailed health check with comprehensive system diagnostics
    """
    health_start = time.time()
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {},
        "response_time_ms": 0,
    }

    overall_healthy = True

    # Database connectivity check
    try:
        db_start = time.time()
        result = db.execute(text("SELECT 1"))
        result.fetchone()
        db_time = (time.time() - db_start) * 1000

        health_data["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": round(db_time, 2),
            "message": "Database connection successful",
        }
    except Exception as e:
        overall_healthy = False
        health_data["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "message": "Database connection failed",
        }

    # Database tables check
    try:
        tables_to_check = ["users", "barbers", "appointments", "services", "locations"]
        table_counts = {}

        for table in tables_to_check:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                table_counts[table] = count
            except Exception as e:
                table_counts[table] = f"Error: {str(e)}"

        health_data["checks"]["database_tables"] = {
            "status": "healthy",
            "table_counts": table_counts,
            "message": "Database tables accessible",
        }
    except Exception as e:
        health_data["checks"]["database_tables"] = {
            "status": "warning",
            "error": str(e),
            "message": "Some database tables inaccessible",
        }

    # External services checks
    external_checks = await check_external_services()
    health_data["checks"]["external_services"] = external_checks

    # System metrics
    if monitoring_service:
        try:
            system_metrics = monitoring_service.get_system_metrics()
            health_data["checks"]["system_metrics"] = {
                "status": "healthy",
                "metrics": system_metrics,
                "message": "System metrics collected",
            }

            # Check for critical thresholds
            alerts = monitoring_service.check_critical_thresholds(system_metrics)
            if alerts:
                health_data["checks"]["system_metrics"]["status"] = "warning"
                health_data["checks"]["system_metrics"]["alerts"] = alerts

        except Exception as e:
            health_data["checks"]["system_metrics"] = {
                "status": "warning",
                "error": str(e),
                "message": "System metrics unavailable",
            }

    # Environment configuration check
    config_check = check_environment_config()
    health_data["checks"]["configuration"] = config_check
    if config_check["status"] != "healthy":
        overall_healthy = False

    # Set overall status
    health_data["status"] = "healthy" if overall_healthy else "unhealthy"
    health_data["response_time_ms"] = round((time.time() - health_start) * 1000, 2)

    if not overall_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=health_data
        )

    return health_data


async def check_external_services() -> Dict[str, Any]:
    """Check external service connectivity"""
    services = {
        "stripe": {
            "url": "https://api.stripe.com/v1/account",
            "headers": (
                {"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"}
                if settings.STRIPE_SECRET_KEY
                else None
            ),
            "timeout": 5,
        },
        # Add other external services as needed
    }

    results = {}

    async with httpx.AsyncClient() as client:
        for service_name, config in services.items():
            try:
                if not config.get("headers"):
                    results[service_name] = {
                        "status": "skipped",
                        "message": "API key not configured",
                    }
                    continue

                start_time = time.time()
                response = await client.get(
                    config["url"],
                    headers=config.get("headers", {}),
                    timeout=config.get("timeout", 5),
                )
                response_time = (time.time() - start_time) * 1000

                if response.status_code < 400:
                    results[service_name] = {
                        "status": "healthy",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status_code,
                    }
                else:
                    results[service_name] = {
                        "status": "unhealthy",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status_code,
                        "error": f"HTTP {response.status_code}",
                    }

            except Exception as e:
                results[service_name] = {
                    "status": "unhealthy",
                    "error": str(e),
                    "message": f"Failed to connect to {service_name}",
                }

    return results


def check_environment_config() -> Dict[str, Any]:
    """Check critical environment configuration"""
    config_checks = {
        "SECRET_KEY": bool(settings.SECRET_KEY and len(settings.SECRET_KEY) > 32),
        "JWT_SECRET_KEY": bool(
            settings.JWT_SECRET_KEY and len(settings.JWT_SECRET_KEY) > 32
        ),
        "DATABASE_URL": bool(settings.DATABASE_URL),
        "ENVIRONMENT": bool(settings.ENVIRONMENT),
    }

    optional_configs = {
        "STRIPE_SECRET_KEY": bool(settings.STRIPE_SECRET_KEY),
        "SENDGRID_API_KEY": bool(os.getenv("SENDGRID_API_KEY")),
        "SENTRY_DSN": bool(os.getenv("SENTRY_DSN")),
    }

    missing_required = [key for key, value in config_checks.items() if not value]
    missing_optional = [key for key, value in optional_configs.items() if not value]

    if missing_required:
        return {
            "status": "unhealthy",
            "message": f"Missing required configuration: {', '.join(missing_required)}",
            "missing_required": missing_required,
            "missing_optional": missing_optional,
        }

    return {
        "status": "healthy",
        "message": "All required configuration present",
        "missing_optional": missing_optional,
        "configured_services": [
            key for key, value in optional_configs.items() if value
        ],
    }


@router.get("/health/live", response_model=Dict[str, str])
async def liveness_probe():
    """
    Kubernetes/Docker liveness probe
    Should only fail if the service is completely broken
    """
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}


@router.get("/health/ready", response_model=Dict[str, Any])
async def readiness_probe(db: Session = Depends(get_db)):
    """
    Kubernetes/Docker readiness probe
    Checks if service is ready to receive traffic
    """
    try:
        # Quick database check
        db.execute(text("SELECT 1"))

        # Check if critical services are configured
        if not settings.SECRET_KEY or not settings.JWT_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "not_ready",
                    "message": "Missing critical configuration",
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "6fb-booking-api",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "not_ready",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@router.get("/health/metrics", response_model=Dict[str, Any])
async def health_metrics():
    """
    System metrics endpoint for monitoring dashboards
    """
    if not monitoring_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "Monitoring service not initialized"},
        )

    try:
        # Get current system status
        status_data = await monitoring_service.health_check()

        # Get metrics summary
        metrics_summary = await monitoring_service.get_metrics_summary(
            time_range_minutes=10
        )

        return {
            "health_status": status_data,
            "metrics_summary": metrics_summary,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "message": "Failed to collect health metrics"},
        )


@router.get("/uptime")
async def uptime_check():
    """
    Simple uptime endpoint for UptimeRobot and similar services
    Returns minimal response for fast monitoring
    """
    return {
        "ok": True,
        "timestamp": datetime.utcnow().isoformat(),
        "service": "6fb-booking",
    }


@router.get("/health/payments", response_model=Dict[str, Any])
async def payment_health_check(db: Session = Depends(get_db)):
    """
    Payment system health check and monitoring dashboard
    """
    try:
        from services.payment_monitoring_service import get_payment_monitor

        payment_monitor = get_payment_monitor(db)

        health_summary = payment_monitor.get_payment_health_summary()
        active_alerts = payment_monitor.get_active_alerts()
        metrics = payment_monitor.get_payment_metrics(time_range_hours=1)

        return {
            "payment_health": health_summary,
            "active_alerts": [
                {
                    "id": alert.id,
                    "severity": alert.severity.value,
                    "title": alert.title,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat(),
                }
                for alert in active_alerts
            ],
            "recent_metrics": metrics,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Payment health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "message": "Payment health check failed"},
        )


@router.post("/health/payments/reset-alerts")
async def reset_payment_alerts(db: Session = Depends(get_db)):
    """
    Reset all payment alerts (for testing or after issue resolution)
    """
    try:
        from services.payment_monitoring_service import get_payment_monitor

        payment_monitor = get_payment_monitor(db)

        # Get all active alerts
        active_alerts = payment_monitor.get_active_alerts()

        # Resolve all alerts
        for alert in active_alerts:
            payment_monitor.resolve_alert(alert.id)

        return {
            "status": "success",
            "resolved_alerts": len(active_alerts),
            "message": f"Resolved {len(active_alerts)} payment alerts",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to reset payment alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "message": "Failed to reset payment alerts"},
        )


@router.get("/health/database", response_model=Dict[str, Any])
async def database_health_check(db: Session = Depends(get_db)):
    """
    Database performance health check and monitoring dashboard
    """
    try:
        from services.database_monitoring_service import get_database_monitor
        from config.database import engine

        db_monitor = get_database_monitor(engine)

        health_summary = db_monitor.get_database_health_summary()
        active_alerts = db_monitor.get_active_alerts()
        slow_queries = db_monitor.get_slow_queries(limit=10)

        return {
            "database_health": health_summary,
            "active_alerts": [
                {
                    "id": alert.id,
                    "severity": alert.severity,
                    "title": alert.title,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat(),
                }
                for alert in active_alerts
            ],
            "slow_queries": slow_queries,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "message": "Database health check failed"},
        )


@router.get("/health/security", response_model=Dict[str, Any])
async def security_health_check():
    """
    Security monitoring health check and dashboard
    """
    try:
        from services.security_monitoring_service import get_security_monitor

        security_monitor = get_security_monitor()

        security_summary = security_monitor.get_security_summary()
        active_alerts = security_monitor.get_active_alerts()
        headers_status = security_monitor.get_security_headers_status()

        return {
            "security_health": {
                "status": (
                    "healthy"
                    if security_summary["summary"]["critical_events"] == 0
                    else "warning"
                ),
                "summary": security_summary,
                "headers_configuration": headers_status,
            },
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
        logger.error(f"Security health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "message": "Security health check failed"},
        )
