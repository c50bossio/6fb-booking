"""
Main FastAPI application for 6FB Booking Platform
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
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
)

# Import security middleware
from middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
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
    appointments,
    analytics,
    training as training_router,
    revenue,
    automation as automation_router,
    websocket,
    notifications,
    booking,
    calendar,
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
    public_dashboard,
    test_email,
    clients,
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
    title="6FB Booking Platform API",
    description="Six Figure Barber booking and analytics platform",
    version="1.0.0",
)

# Store settings in app state for middleware access
app.state.settings = settings

# Add middleware (order matters - error handling should be outermost)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS
# Get allowed origins from environment
env_origins = (
    os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if os.getenv("CORS_ALLOWED_ORIGINS")
    else []
)

# Always include these origins
default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8081",  # 6FB Dashboard
    "http://localhost:8082",  # Bossio Dashboard
    "http://localhost:8083",  # Alternative dashboard
    "https://sixfb-frontend.onrender.com",
    "https://sixfb-frontend-paby.onrender.com",  # Your actual Render frontend URL
    "https://bookbarber-dkbwc7iez-6fb.vercel.app",  # New Vercel deployment
    "https://bookbarber.com",  # Production domain
    "https://app.bookbarber.com",  # App subdomain
    "https://*.bookbarber.com",  # All subdomains
    "https://*.vercel.app",  # All Vercel preview deployments
]

# Combine environment and default origins
cors_origins = list(set(env_origins + default_origins))
# Remove empty strings
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
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
)

# Register exception handlers
register_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(barbers.router, prefix="/api/v1/barbers", tags=["Barbers"])
app.include_router(
    appointments.router, prefix="/api/v1/appointments", tags=["Appointments"]
)
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
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
    compensation_plans.router,
    prefix="/api/v1/compensation-plans",
    tags=["Compensation Plans"],
)
app.include_router(
    barber_payments.router,
    prefix="/api/v1/barber-payments",
    tags=["Barber Payments"],
)
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
    prefix="/api/v1/booking-public",
    tags=["Booking Public"],
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

# Add authentication system (disabled for now)
# app = add_auth_to_sixfb_backend(app)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# Homepage route
@app.get("/")
async def serve_homepage():
    return FileResponse("static/index.html")


# Dashboard route - Redirect to Next.js frontend
@app.get("/dashboard")
async def redirect_to_frontend_dashboard():
    return RedirectResponse(url="http://localhost:3000/dashboard", status_code=302)


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
        "message": "Welcome to 6FB Booking Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }

    # Try to check database connection
    try:
        from config.database import SessionLocal

        db = SessionLocal()
        from sqlalchemy import text

        db.execute(text("SELECT 1"))
        db.close()
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = "disconnected"
        health_status["database_error"] = str(e)
        # Don't fail the health check if database is down

    return health_status


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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
