"""
Main FastAPI application for 6FB Booking Platform
Force deployment trigger - Updated: 2025-06-23 14:30:00 UTC
Build version: v1.0.0-2025-06-23-deploy-fix
"""

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from middleware.dynamic_cors import DynamicCORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.orm import Session
import uvicorn
import os
from datetime import datetime

from config.database import engine, Base, get_db, SessionLocal
from config.settings import settings

# Import all models to ensure they're registered with SQLAlchemy
from models import (
    appointment,
    barber,
    client,
    customer,
    location,
    user,
    analytics,
    training,
    automation,
    revenue_share,
    notification,
    payment,
    communication,
    barber_payment,
    booking,
    google_calendar_settings,
    square_payment,
    product,
    mfa_settings,
)

# Import security middleware
from middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from middleware.csrf_protection import CSRFProtectionMiddleware

# from middleware.advanced_security import AdvancedSecurityMiddleware, SecurityHeadersEnhancedMiddleware
from middleware.request_logging import RequestLoggingMiddleware
from middleware.error_handling import (
    ErrorHandlingMiddleware,
    register_exception_handlers,
)

# Import routers from api.v1
from api.v1 import (
    auth,
    users,
    locations,
    barbers,
    clients,
    appointments,
    analytics,
    training as training_router,
    revenue,
    automation as automation_router,
    websocket,
    notifications,
    booking,
    calendar,
    services,
    payouts,
    customer_auth,
    customer_booking,
)
from api.v1.endpoints import (
    payments,
    webhooks,
    communications,
    public_status,
    dashboard,
    temp_reset,
    debug,
    square_integration,
    square,
    square_oauth,  # New comprehensive Square OAuth module
    location_payment_management,
    barber_payment_splits,
    barber_payroll,
    compensation_plans,
    barber_payments,
    test_stripe_status,
    barber_stripe_connect,
    test_payout,
    booking_public,
    booking_authenticated,
    recurring_bookings,
    public_dashboard,
    test_email,
    clients,
    google_calendar,
    security_admin,
    health,
    availability_check,
    emergency_login,
    stripe_health,
    payout_schedules,
    payment_processors,
    gift_certificates,
    shopify_integration,
    product_catalog,
    barber_pin_auth,
    sales,
    pos_transactions,
)

# Import logging setup
from utils.logging import setup_logging
import logging

# Import Sentry configuration
from sentry_config import init_sentry

# Import authentication system (disabled for now)
# import sys
# sys.path.append("/Users/bossio/auth-system")
# from fastapi_auth_integration import add_auth_to_sixfb_backend

# Import Square sync scheduler
from tasks.square_sync import start_square_sync, stop_square_sync

# Initialize Sentry before anything else
init_sentry()

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Booked Barber Platform API",
    description="Booked Barber booking and analytics platform",
    version="1.0.0",
)

# Store settings in app state for middleware access
app.state.settings = settings

# Add middleware (order matters - error handling should be outermost)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CSRFProtectionMiddleware, strict_mode=False
)  # Set to True for production
# app.add_middleware(AdvancedSecurityMiddleware, enable_monitoring=True)
app.add_middleware(RateLimitMiddleware)
# app.add_middleware(SecurityHeadersEnhancedMiddleware)

# Configure CORS with dynamic origin validation for Vercel deployments
cors_origins = settings.CORS_ORIGINS

app.add_middleware(
    DynamicCORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Cache-Control",
    ],
    settings=settings,  # Pass settings for dynamic origin checking
)

# Register exception handlers
register_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(barbers.router, prefix="/api/v1/barbers", tags=["Barbers"])
app.include_router(clients.router, prefix="/api/v1/clients", tags=["Clients"])
app.include_router(
    appointments.router, prefix="/api/v1/appointments", tags=["Appointments"]
)
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(services.router, prefix="/api/v1/services", tags=["Services"])
app.include_router(training_router.router, prefix="/api/v1/training", tags=["Training"])
app.include_router(revenue.router, prefix="/api/v1/revenue", tags=["Revenue"])
app.include_router(
    automation_router.router, prefix="/api/v1/automation", tags=["Automation"]
)
app.include_router(websocket.router, prefix="/api/v1", tags=["WebSocket"])
app.include_router(
    notifications.router, prefix="/api/v1/notifications", tags=["Notifications"]
)
app.include_router(booking.router, prefix="/api/v1/booking", tags=["Booking"])
app.include_router(calendar.router, prefix="/api/v1/calendar", tags=["Calendar"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(communications.router, prefix="/api/v1", tags=["Communications"])
app.include_router(
    compensation_plans.router,
    prefix="/api/v1/compensation-plans",
    tags=["Compensation Plans"],
)
app.include_router(
    test_payout.router, prefix="/api/v1/test-payout", tags=["Test Payout"]
)
app.include_router(
    public_status.router, prefix="/api/v1/public", tags=["Public Status"]
)
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(temp_reset.router, prefix="/api/v1/temp", tags=["Temp"])
app.include_router(debug.router, prefix="/api/v1/debug", tags=["Debug"])
app.include_router(
    square_integration.router, prefix="/api/v1/square", tags=["Square Integration"]
)
app.include_router(
    square.router, prefix="/api/v1/square-oauth", tags=["Square OAuth & Payouts"]
)
app.include_router(
    location_payment_management.router,
    prefix="/api/v1/location-payments",
    tags=["Location Payments"],
)
app.include_router(
    barber_payment_splits.router,
    prefix="/api/v1/payment-splits",
    tags=["Payment Splits"],
)
app.include_router(barber_payroll.router, prefix="/api/v1/payroll", tags=["Payroll"])
app.include_router(
    barber_payments.router,
    prefix="/api/v1/barber-payments",
    tags=["Barber Payments"],
)
app.include_router(payouts.router, prefix="/api/v1/payouts", tags=["Payouts"])
app.include_router(
    test_stripe_status.router,
    prefix="/api/v1/test-stripe",
    tags=["Test Stripe"],
)
app.include_router(
    barber_stripe_connect.router,
    prefix="/api/v1/stripe-connect",
    tags=["Stripe Connect"],
)
app.include_router(
    booking_public.router,
    prefix="/api/v1/booking/public",
    tags=["Public Booking"],
)
app.include_router(
    recurring_bookings.router,
    prefix="/api/v1/booking/recurring",
    tags=["Recurring Bookings"],
)
app.include_router(
    booking_authenticated.router,
    prefix="/api/v1/booking-auth",
    tags=["Booking Authenticated"],
)
app.include_router(
    public_dashboard.router,
    prefix="/api/v1",
    tags=["Public Dashboard"],
)
app.include_router(
    test_email.router,
    prefix="/api/v1",
    tags=["Test"],
)
app.include_router(
    clients.router,
    prefix="/api/v1/clients",
    tags=["Clients"],
)
app.include_router(
    google_calendar.router,
    prefix="/api/v1",
    tags=["Google Calendar"],
)
app.include_router(
    security_admin.router,
    prefix="/api/v1/security",
    tags=["Security Administration"],
)
app.include_router(
    health.router,
    prefix="/api/v1",
    tags=["Health Monitoring"],
)
app.include_router(
    availability_check.router,
    prefix="/api/v1/availability",
    tags=["Availability Check"],
)
app.include_router(
    emergency_login.router,
    prefix="/api/v1",
    tags=["Emergency Login"],
)
app.include_router(
    stripe_health.router,
    prefix="/api/v1",
    tags=["Stripe Health"],
)
app.include_router(
    payout_schedules.router,
    prefix="/api/v1/payout-schedules",
    tags=["Payout Schedules"],
)
app.include_router(
    payment_processors.router,
    prefix="/api/v1",
    tags=["Payment Processors"],
)
app.include_router(
    square_oauth.router,
    prefix="/api/v1/square-oauth",
    tags=["Square OAuth Complete"],
)
app.include_router(
    gift_certificates.router,
    prefix="/api/v1",
    tags=["Gift Certificates"],
)
app.include_router(
    shopify_integration.router,
    prefix="/api/v1/shopify",
    tags=["Shopify Integration"],
)
app.include_router(
    product_catalog.router,
    prefix="/api/v1/product-catalog",
    tags=["Product Catalog"],
)
app.include_router(
    barber_pin_auth.router,
    prefix="/api/v1",
    tags=["Barber PIN Authentication"],
)
app.include_router(
    pos_transactions.router,
    prefix="/api/v1",
    tags=["POS Transactions"],
)
app.include_router(
    sales.router,
    prefix="/api/v1/sales",
    tags=["Sales"],
)

# Customer API routes
app.include_router(
    customer_auth.router,
    prefix="/api/v1/customer/auth",
    tags=["Customer Authentication"],
)
app.include_router(
    customer_booking.router,
    prefix="/api/v1/customer",
    tags=["Customer Booking"],
)

# Add authentication system (disabled for now)
# app = add_auth_to_sixfb_backend(app)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# Homepage route
@app.get("/")
async def serve_homepage():
    return FileResponse("static/index.html")


# Version endpoint to track deployments
@app.get("/version")
async def get_version():
    """Get deployment version information"""
    return {
        "version": os.getenv("RELEASE_VERSION", "v1.0.0-2025-06-23-deploy-fix"),
        "build_date": "2025-06-23 14:30:00 UTC",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "commit": os.getenv("RENDER_GIT_COMMIT", "unknown"),
    }


# Dashboard route - Redirect to Next.js frontend
@app.get("/dashboard")
async def redirect_to_frontend_dashboard():
    return RedirectResponse(
        url="https://app.bookedbarber.com/dashboard", status_code=302
    )


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    try:
        # Create all database tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
        logger.warning(
            "Application starting without database table creation - tables may need to be created manually"
        )

    # Start Square sync scheduler
    try:
        start_square_sync()
        logger.info("Square sync scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start Square sync scheduler: {str(e)}")

    # Start payout scheduler
    try:
        from services.payout_scheduler import payout_scheduler

        payout_scheduler.start()

        # Schedule all active compensation plans
        db = SessionLocal()
        try:
            payout_scheduler.schedule_all_payouts(db)
        finally:
            db.close()

        logger.info("Payout scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start payout scheduler: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    try:
        stop_square_sync()
        logger.info("Square sync scheduler stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop Square sync scheduler: {str(e)}")

    try:
        from services.payout_scheduler import payout_scheduler

        payout_scheduler.stop()
        logger.info("Payout scheduler stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop payout scheduler: {str(e)}")


@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to Booked Barber Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.get("/health")
async def health_check_redirect():
    """Redirect to the proper health endpoint for backward compatibility"""
    return RedirectResponse(url="/api/v1/health", status_code=301)


@app.get("/api/v1/settings")
async def get_settings():
    """Basic settings endpoint for frontend compatibility"""
    return {
        "business": {
            "name": "Booked Barber Platform",
            "address": "123 Main St",
            "phone": "555-123-4567",
            "email": "admin@bookedbarber.com",
        },
        "notifications": {
            "email_enabled": True,
            "sms_enabled": True,
            "push_enabled": True,
        },
        "security": {"two_factor_enabled": False, "session_timeout": 1440},
    }


@app.get("/cors-test")
async def cors_test(request: Request):
    """Test CORS configuration and return origin information"""
    origin = request.headers.get("origin", "")
    user_agent = request.headers.get("user-agent", "")

    return {
        "message": "CORS test endpoint",
        "origin": origin,
        "origin_allowed": settings.is_allowed_origin(origin) if origin else False,
        "user_agent": user_agent,
        "timestamp": datetime.utcnow().isoformat(),
        "allowed_origins_count": len(settings.CORS_ORIGINS),
        "railway_origin": (
            ".railway.app" in origin or ".up.railway.app" in origin if origin else False
        ),
    }


@app.options("/{path:path}")
async def handle_options(path: str, request: Request):
    """Handle CORS preflight requests for all paths with proper origin validation"""
    origin = request.headers.get("origin", "")

    # Use settings to validate origin
    allowed_origin = "*"  # Default fallback

    if origin and settings.is_allowed_origin(origin):
        allowed_origin = origin
        logger.info(f"OPTIONS: Allowed origin {origin} for path {path}")
    elif origin:
        # Check if it's a Railway domain
        if ".railway.app" in origin or ".up.railway.app" in origin:
            allowed_origin = origin
            logger.info(f"OPTIONS: Allowed Railway origin {origin} for path {path}")
        else:
            logger.warning(
                f"OPTIONS: Origin {origin} not in allowed list for path {path}"
            )

    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH",
            "Access-Control-Allow-Headers": "Accept,Accept-Language,Content-Language,Content-Type,Authorization,X-Requested-With,Cache-Control,X-API-Key",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",  # 24 hours
            "Vary": "Origin",
        },
    )


@app.get("/api/usage-summary")
def get_usage_summary():
    """API usage summary for dashboard"""
    # TODO: Implement real usage tracking
    # For now, return mock data to make the dashboard work
    return {
        "total_api_calls": 1250,
        "cached_calls": 0,
        "fresh_calls": 1250,
        "cache_hit_rate_percent": 0,
        "top_endpoints": {
            "/api/v1/appointments": {"total": 450, "cached": 0, "fresh": 450},
            "/api/v1/users": {"total": 380, "cached": 0, "fresh": 380},
            "/api/v1/payments": {"total": 220, "cached": 0, "fresh": 220},
            "/api/v1/barbers": {"total": 120, "cached": 0, "fresh": 120},
            "/health": {"total": 80, "cached": 0, "fresh": 80},
        },
        "hourly_breakdown": {
            "09:00": {"total": 120, "cached": 0, "fresh": 120},
            "10:00": {"total": 180, "cached": 0, "fresh": 180},
            "11:00": {"total": 200, "cached": 0, "fresh": 200},
            "12:00": {"total": 150, "cached": 0, "fresh": 150},
            "13:00": {"total": 170, "cached": 0, "fresh": 170},
            "14:00": {"total": 190, "cached": 0, "fresh": 190},
            "15:00": {"total": 160, "cached": 0, "fresh": 160},
            "16:00": {"total": 80, "cached": 0, "fresh": 80},
        },
        "estimated_cost_today": 0,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/performance-stats")
def get_performance_stats():
    """Performance statistics for dashboard"""
    return {
        "performance": {
            "avg_response_time_ms": 85,
            "total_requests": 1250,
            "total_endpoints": 12,
            "cache_hit_rate": 0,
            "error_rate": 0.5,
        },
        "cache": {"cache_type": "redis", "total_keys": 0, "memory_usage": "0MB"},
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/cost-estimates")
def get_cost_estimates():
    """API cost estimates"""
    return {
        "cost_breakdown": {},
        "total_estimated_cost": 0,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "note": "6FB Platform uses internal APIs - no external API costs",
    }


@app.get("/sentry-debug")
def trigger_error():
    """Sentry debug endpoint - triggers a test error"""
    # Only allow in development environment
    if settings.ENVIRONMENT.lower() != "development":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    logger.info("Sentry debug endpoint called - triggering test error")
    # This will be captured by Sentry
    division_by_zero = 1 / 0

    return {"message": "This should not be reached"}


if __name__ == "__main__":
    # Use PORT environment variable for Railway compatibility
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)  # nosec B104
