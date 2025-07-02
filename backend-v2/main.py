from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from database import engine, Base
import models
import location_models
from routers import auth, bookings, appointments, payments, clients, users, timezones, calendar, services, barber_availability, recurring_appointments, webhooks, analytics, booking_rules, notifications, imports, sms_conversations, sms_webhooks, barbers, webhook_management, enterprise, marketing, short_urls, notification_preferences, email_analytics, test_data, reviews
# Temporarily disabled: integrations
from routers.services import public_router as services_public_router
from utils.rate_limit import limiter, rate_limit_exceeded_handler

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="6FB Booking API v2")

# Add rate limiter to app state
app.state.limiter = limiter

# Add rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Enhanced CORS setup for development and production
import os

# Get allowed origins from environment or use defaults
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

# Add Railway and Vercel deployment URLs if they exist
railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN")
vercel_url = os.getenv("VERCEL_URL")

if railway_url:
    allowed_origins.append(f"https://{railway_url}")
if vercel_url:
    allowed_origins.append(f"https://{vercel_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRFToken",
        "Cache-Control"
    ],
    expose_headers=["Content-Length", "Content-Range"],
    max_age=86400  # 24 hours
)

# Include routers with API versioning
app.include_router(auth.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")  # Standardized appointment endpoints
app.include_router(payments.router, prefix="/api/v1")
app.include_router(clients.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(timezones.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(services.router, prefix="/api/v1")
app.include_router(barbers.router, prefix="/api/v1")
app.include_router(barber_availability.router, prefix="/api/v1")
app.include_router(recurring_appointments.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(booking_rules.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(imports.router, prefix="/api/v1")
app.include_router(sms_conversations.router, prefix="/api/v1")
app.include_router(sms_webhooks.router, prefix="/api/v1")
app.include_router(webhook_management.router, prefix="/api/v1")  # Re-enabled with webhook models
app.include_router(enterprise.router, prefix="/api/v1")
app.include_router(marketing.router, prefix="/api/v1")
app.include_router(short_urls.router)  # No prefix for branded short URLs
app.include_router(notification_preferences.router)  # No prefix, includes its own /api/v1
app.include_router(email_analytics.router, prefix="/api/v1")
app.include_router(test_data.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
# app.include_router(locations.router, prefix="/api/v1")  # Temporarily disabled due to schema error
# app.include_router(integrations.router)  # Integration management endpoints - temporarily disabled

# Include public routes (no authentication required)
app.include_router(services_public_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "6FB Booking API v2"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}