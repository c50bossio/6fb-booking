from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from database import engine, Base
import models
import location_models
from routers import auth, bookings, appointments, payments, clients, users, timezones, calendar, services, barber_availability, recurring_appointments, webhooks, analytics, booking_rules, notifications, imports, sms_conversations, sms_webhooks, barbers, webhook_management, enterprise, marketing, short_urls, notification_preferences, email_analytics, test_data, reviews, integrations, api_keys, commissions, privacy, cache, ai_analytics  # products, shopify_webhooks temporarily disabled due to bleach dependency
from routers.services import public_router as services_public_router
from utils.rate_limit import limiter, rate_limit_exceeded_handler
from services.integration_service import IntegrationServiceFactory
from models.integration import IntegrationType
from middleware import SecurityHeadersMiddleware, RequestValidationMiddleware, APIKeyValidationMiddleware
from middleware.multi_tenancy import MultiTenancyMiddleware
from middleware.financial_security import FinancialSecurityMiddleware
from middleware.sentry_middleware import SentryEnhancementMiddleware
import logging

# Initialize Sentry error tracking (must be done before importing FastAPI app)
from config.sentry import configure_sentry
sentry_configured = configure_sentry()

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="6FB Booking API v2")

# Add rate limiter to app state
app.state.limiter = limiter

# Register integration services
@app.on_event("startup")
async def startup_event():
    """Register integration services on startup"""
    try:
        # Import integration service adapters
        from services.integration_adapters import (
            GMBServiceAdapter,
            GoogleCalendarServiceAdapter,
            StripeServiceAdapter,
            SendGridServiceAdapter,
            TwilioServiceAdapter
        )
        
        logger = logging.getLogger(__name__)
        logger.info("Registering integration services...")
        
        # Register all available integration services
        IntegrationServiceFactory.register(IntegrationType.GOOGLE_MY_BUSINESS, GMBServiceAdapter)
        IntegrationServiceFactory.register(IntegrationType.GOOGLE_CALENDAR, GoogleCalendarServiceAdapter)
        IntegrationServiceFactory.register(IntegrationType.STRIPE, StripeServiceAdapter)
        IntegrationServiceFactory.register(IntegrationType.SENDGRID, SendGridServiceAdapter)
        IntegrationServiceFactory.register(IntegrationType.TWILIO, TwilioServiceAdapter)
        
        logger.info(f"Successfully registered {len(IntegrationServiceFactory._services)} integration services")
        
        # Apply double-booking prevention enhancements
        from services.booking_service_wrapper import configure_booking_service
        configure_booking_service(enable_double_booking_prevention=True)
        logger.info("Double-booking prevention system activated")
        
        # Log Sentry status
        if sentry_configured:
            logger.info("Sentry error tracking is active")
        else:
            logger.info("Sentry error tracking is disabled")
            
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to register integration services: {e}")
        
        # Capture startup errors in Sentry if configured
        if sentry_configured:
            import sentry_sdk
            sentry_sdk.capture_exception(e)

# Add security middleware
import logging
import os

# Add Sentry enhancement middleware (early in chain for comprehensive coverage)
if sentry_configured:
    secret_key = os.getenv("SECRET_KEY")
    app.add_middleware(SentryEnhancementMiddleware, secret_key=secret_key)

# Add request validation middleware (order matters - this should be first)
app.add_middleware(RequestValidationMiddleware)

# Add API key validation for webhook endpoints
app.add_middleware(APIKeyValidationMiddleware, protected_paths={"/api/v1/webhooks", "/api/v1/internal"})

# Add multi-tenancy middleware for location-based access control
app.add_middleware(MultiTenancyMiddleware)

# Add financial security middleware for payment endpoints
app.add_middleware(FinancialSecurityMiddleware)

# Add enhanced security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

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
app.include_router(reviews.router, prefix="/api/v1")  # Re-enabled for testing
# app.include_router(locations.router, prefix="/api/v1")  # Temporarily disabled due to schema error
app.include_router(integrations.router)  # Integration management endpoints - re-enabled for testing
app.include_router(api_keys.router, prefix="/api/v1")  # API key management
app.include_router(commissions.router, prefix="/api/v1")  # Commission management
app.include_router(privacy.router)  # GDPR compliance and privacy management
app.include_router(cache.router)  # Redis cache management and monitoring
app.include_router(ai_analytics.router, prefix="/api/v1")  # Revolutionary AI-powered cross-user analytics
# app.include_router(products.router)  # Product management and Shopify integration - disabled due to bleach dependency
# app.include_router(shopify_webhooks.router)  # Shopify webhook handlers for real-time sync - disabled due to bleach dependency

# Include public routes (no authentication required)
app.include_router(services_public_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "6FB Booking API v2"}

@app.get("/health")
def health_check():
    """Enhanced health check including Sentry status"""
    health_status = {"status": "healthy"}
    
    # Add Sentry health information if configured
    if sentry_configured:
        try:
            from config.sentry import sentry_health_check
            health_status["sentry"] = sentry_health_check()
        except Exception as e:
            health_status["sentry"] = {"enabled": False, "error": str(e)}
    else:
        health_status["sentry"] = {"enabled": False}
    
    return health_status