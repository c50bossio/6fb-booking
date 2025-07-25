from fastapi import FastAPI
from db import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
# Import tracking models to register them with SQLAlchemy
from routers import auth, auth_simple, appointments, payments, clients, users, timezones, services, barber_availability, recurring_appointments, webhooks, dashboard, booking_rules, notifications, imports, sms_conversations, sms_webhooks, barbers, webhook_management, enterprise, marketing, short_urls, notification_preferences, test_data, reviews, integrations, api_keys, commissions, privacy, mfa, tracking, google_calendar, agents, billing, invitations, trial_monitoring, organizations, customer_pixels, public_booking, health, pricing_validation, six_fb_compliance, commission_rates, exports, locations, products, social_auth, search
# Consolidated analytics router (replaces: analytics, ai_analytics, marketing_analytics, email_analytics)
from routers import unified_analytics

# Import V2 API endpoints for Six Figure Barber enhancements
from api.v2.endpoints import client_lifecycle, booking_intelligence, upselling, ai_upselling, calendar_revenue_optimization
# service_templates temporarily disabled due to FastAPI error
from routers.services import public_router as services_public_router
from utils.rate_limit import limiter, rate_limit_exceeded_handler
from utils.error_handling import create_error_handler
from services.integration_service import IntegrationServiceFactory
from models.integration import IntegrationType
from middleware import SecurityHeadersMiddleware, RequestValidationMiddleware, MFAEnforcementMiddleware
from middleware.multi_tenancy import MultiTenancyMiddleware
from middleware.financial_security import FinancialSecurityMiddleware
from middleware.sentry_middleware import SentryEnhancementMiddleware
from middleware.enhanced_security import EnhancedSecurityMiddleware, WebhookSecurityMiddleware
from middleware.configuration_security import ConfigurationSecurityMiddleware, configuration_reporter
from middleware.cache_middleware import SmartCacheMiddleware
import logging

# Initialize Sentry error tracking (must be done before importing FastAPI app)
from config.sentry import configure_sentry
sentry_configured = configure_sentry()

# Create database tables
Base.metadata.create_all(bind=engine)

# Define lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger = logging.getLogger(__name__)
    logger.info("🚀 Starting BookedBarber V2 backend...")
    
    # Initialize Redis cache
    try:
        from services.startup_cache import startup_cache_init
        cache_results = await startup_cache_init()
        logger.info(f"✅ Cache initialization completed: {cache_results}")
    except Exception as e:
        logger.error(f"❌ Cache initialization failed: {e}")
        # Continue without cache rather than fail startup
    
    yield
    
    # Shutdown
    try:
        from services.startup_cache import shutdown_cache
        await shutdown_cache()
        logger.info("✅ Cache shutdown completed")
    except Exception as e:
        logger.error(f"❌ Cache shutdown failed: {e}")

# Create FastAPI app with lifespan management
app = FastAPI(title="6FB Booking API v2", lifespan=lifespan)

# Health check endpoint moved to enhanced version below

# Add rate limiter to app state
app.state.limiter = limiter

# Add centralized error handling
create_error_handler(app)

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
        
        # Apply double-booking prevention enhancements (disabled - service archived)
        # from services.booking_service_wrapper import configure_booking_service
        # configure_booking_service(enable_double_booking_prevention=True)
        # logger.info("Double-booking prevention system activated")
        
        # Initialize MFA middleware instance for session management
        # Create a reference to the MFA middleware for session management
        if not hasattr(app.state, 'mfa_middleware'):
            app.state.mfa_middleware = MFAEnforcementMiddleware(app)
            logger.info("MFA enforcement middleware initialized for session management")
        
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

# Add Redis caching middleware
from middleware.cache_middleware import SmartCacheMiddleware

# Add security middleware
import logging
import os

logger = logging.getLogger(__name__)

# Environment-based middleware configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ENABLE_DEVELOPMENT_MODE = os.getenv("ENABLE_DEVELOPMENT_MODE", "true").lower() == "true"

if ENVIRONMENT == "development" and ENABLE_DEVELOPMENT_MODE:
    # Lightweight middleware stack for development
    logger.info("🔧 Development mode: Using lightweight middleware stack")
    
    # Add smart cache middleware for development
    app.add_middleware(SmartCacheMiddleware, enable_cache=True)
    
    # Only essential middleware for development
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Skip heavy middleware in development
    logger.info("⚡ Skipping heavy middleware: RequestValidation, MultiTenancy, FinancialSecurity, MFA")
    
else:
    # Full production middleware stack with enhanced security
    logger.info("🔒 Production mode: Using full middleware stack with enhanced security")
    
    # Add enhanced security middleware stack
    environment = ENVIRONMENT if ENVIRONMENT != "development" else "production"
    
    # Add configuration security middleware (first for critical security validation)
    config_security_middleware = ConfigurationSecurityMiddleware(app, check_interval_minutes=30)
    app.add_middleware(ConfigurationSecurityMiddleware, check_interval_minutes=30)
    configuration_reporter.set_middleware(config_security_middleware)
    
    # Add Sentry enhancement middleware (early in chain for comprehensive coverage)
    if sentry_configured:
        secret_key = os.getenv("SECRET_KEY")
        app.add_middleware(SentryEnhancementMiddleware, secret_key=secret_key)

    # Add enhanced security middleware with rate limiting and monitoring
    app.add_middleware(EnhancedSecurityMiddleware, environment=environment)
    
    # Add webhook security middleware for signature validation
    webhook_secrets = {
        "/api/v2/webhooks/stripe": os.getenv("STRIPE_WEBHOOK_SECRET", ""),
        "/api/v2/webhooks/sendgrid": os.getenv("SENDGRID_WEBHOOK_SECRET", ""),
        "/api/v2/webhooks/twilio": os.getenv("TWILIO_WEBHOOK_SECRET", "")
    }
    app.add_middleware(WebhookSecurityMiddleware, webhook_secrets=webhook_secrets)

    # Add request validation middleware (order matters - this should be first)
    app.add_middleware(RequestValidationMiddleware)

    # API key validation middleware temporarily disabled

    # Add multi-tenancy middleware for location-based access control
    app.add_middleware(MultiTenancyMiddleware)

    # Add financial security middleware for payment endpoints
    app.add_middleware(FinancialSecurityMiddleware)

    # Add MFA enforcement middleware for admin operations
    app.add_middleware(MFAEnforcementMiddleware)

    # Add enhanced security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add smart cache middleware for production (after security middleware)
    app.add_middleware(SmartCacheMiddleware, enable_cache=True)
    
    logger.info("✅ Enhanced security stack applied with production-grade settings, configuration validation, and intelligent caching")

# Add rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Production-ready CORS configuration with enhanced security
def configure_cors():
    """Configure CORS with environment-specific security settings"""
    
    # Base allowed origins from environment or defaults
    allowed_origins = []
    
    if ENVIRONMENT == "production":
        # Production: Only allow specific verified domains
        production_origins = os.getenv("PRODUCTION_ORIGINS", "").split(",")
        production_origins = [origin.strip() for origin in production_origins if origin.strip()]
        
        if production_origins:
            allowed_origins = production_origins
        else:
            # Fallback for production - no localhost allowed
            logger.warning("No PRODUCTION_ORIGINS set - using minimal secure defaults")
            allowed_origins = ["https://bookedbarber.com", "https://app.bookedbarber.com"]
    
    elif ENVIRONMENT == "staging":
        # Staging: Allow staging domains
        staging_origins = os.getenv("STAGING_ORIGINS", "").split(",")
        staging_origins = [origin.strip() for origin in staging_origins if origin.strip()]
        
        if staging_origins:
            allowed_origins = staging_origins
        else:
            # Fallback staging domains
            allowed_origins = [
                "https://staging.bookedbarber.com",
                "https://staging-app.bookedbarber.com"
            ]
    
    else:
        # Development: Allow localhost and development domains
        dev_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
        allowed_origins = [origin.strip() for origin in dev_origins if origin.strip()]
    
    # Add deployment platform URLs if they exist
    railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    vercel_url = os.getenv("VERCEL_URL")
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    
    if railway_url and ENVIRONMENT != "production":
        allowed_origins.append(f"https://{railway_url}")
    if vercel_url and ENVIRONMENT != "production":
        allowed_origins.append(f"https://{vercel_url}")
    if render_url and ENVIRONMENT != "production":
        allowed_origins.append(render_url)
    
    # Remove duplicates and empty values
    allowed_origins = list(set([origin for origin in allowed_origins if origin]))
    
    # Security headers for CORS
    allowed_headers = [
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRFToken",
        "Cache-Control",
        "X-Device-Fingerprint",  # For MFA device trust
        "X-Trust-Token",         # For MFA device trust
        "X-MFA-Token"           # For MFA session management
    ]
    
    # Production-specific security
    if ENVIRONMENT == "production":
        allowed_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
        max_age = 3600  # 1 hour for production
    else:
        allowed_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
        max_age = 86400  # 24 hours for development
    
    logger.info(f"CORS configured for environment '{ENVIRONMENT}' with {len(allowed_origins)} origins")
    logger.info(f"Allowed origins: {allowed_origins}")
    
    return {
        "allow_origins": allowed_origins,
        "allow_credentials": True,
        "allow_methods": allowed_methods,
        "allow_headers": allowed_headers,
        "expose_headers": ["Content-Length", "Content-Range", "X-MFA-Required", "X-User-ID"],
        "max_age": max_age
    }

# Configure and apply CORS
cors_config = configure_cors()
app.add_middleware(CORSMiddleware, **cors_config)

# Include health router (no prefix for easy access)
app.include_router(health.router)

# Include routers with API versioning
app.include_router(auth.router, prefix="/api/v2")
app.include_router(auth_simple.router, prefix="/api/v2")  # Simplified auth for schema compatibility
app.include_router(social_auth.router, prefix="/api/v2")  # Social authentication (Google/Facebook OAuth)

# Removed auth bypass - using real authentication only
app.include_router(mfa.router, prefix="/api/v2")  # Multi-Factor Authentication endpoints
# DEPRECATED: bookings.router removed - use appointments.router instead (cleaner API)
app.include_router(appointments.router, prefix="/api/v2")  # Standardized appointment endpoints
app.include_router(payments.router, prefix="/api/v2")
app.include_router(clients.router, prefix="/api/v2")
app.include_router(users.router, prefix="/api/v2")
app.include_router(timezones.router, prefix="/api/v2")
app.include_router(google_calendar.router, prefix="/api/v2")  # Unified Google Calendar integration
app.include_router(services.router, prefix="/api/v2")
# app.include_router(service_templates.router, prefix="/api/v2/service-templates")  # Temporarily disabled due to schema issues
app.include_router(pricing_validation.router, prefix="/api/v2")
app.include_router(six_fb_compliance.router, prefix="/api/v2")
app.include_router(barbers.router, prefix="/api/v2")
app.include_router(barber_availability.router, prefix="/api/v2")
app.include_router(recurring_appointments.router, prefix="/api/v2")
app.include_router(webhooks.router, prefix="/api/v2")
# Replaced with unified_analytics.router - see consolidated analytics below
app.include_router(dashboard.router, prefix="/api/v2")
app.include_router(booking_rules.router, prefix="/api/v2")
app.include_router(notifications.router, prefix="/api/v2")
app.include_router(imports.router, prefix="/api/v2")
app.include_router(exports.router, prefix="/api/v2")  # Data export functionality
app.include_router(sms_conversations.router, prefix="/api/v2")
app.include_router(sms_webhooks.router, prefix="/api/v2")
app.include_router(webhook_management.router, prefix="/api/v2")  # Re-enabled with webhook models
app.include_router(enterprise.router, prefix="/api/v2")
app.include_router(marketing.router, prefix="/api/v2")
# Replaced with unified_analytics.router - see consolidated analytics below
app.include_router(short_urls.router, prefix="/s")  # Prefix for branded short URLs to avoid conflicts
app.include_router(notification_preferences.router)  # No prefix, includes its own /api/v2
# Email analytics consolidated into unified_analytics.router
app.include_router(test_data.router, prefix="/api/v2")
app.include_router(reviews.router, prefix="/api/v2")  # Re-enabled for testing
app.include_router(locations.router, prefix="/api/v2")  # Re-enabled - schema implementation verified
app.include_router(integrations.router)  # Integration management endpoints - re-enabled for testing
app.include_router(api_keys.router, prefix="/api/v2")  # API key management
app.include_router(commissions.router, prefix="/api/v2")  # Commission management
app.include_router(commission_rates.router, prefix="/api/v2")  # Commission rate management - re-enabled for testing
app.include_router(billing.router, prefix="/api/v2")  # Chair-based billing and subscription management - re-enabled for testing
app.include_router(invitations.router)  # Staff invitation management - re-enabled for testing
app.include_router(organizations.router, prefix="/api/v2")  # Organization management
app.include_router(trial_monitoring.router, prefix="/api/v2")  # Trial expiration monitoring and notifications
app.include_router(privacy.router)  # GDPR compliance and privacy management
# app.include_router(cache.router)  # Redis cache management and monitoring - disabled due to archived services
# Replaced with unified_analytics.router - see consolidated analytics below
# CONSOLIDATED ANALYTICS ROUTER - Replaces analytics, ai_analytics, marketing_analytics, email_analytics
app.include_router(unified_analytics.router, prefix="/api/v2")  # Unified analytics with core, AI, and marketing analytics
app.include_router(agents.router, prefix="/api/v2")  # AI Agent management - enabled with mock provider
app.include_router(tracking.router)  # Conversion tracking and attribution
app.include_router(customer_pixels.router)  # Customer tracking pixel management
app.include_router(public_booking.router)  # Public booking endpoints for organization-specific pages
app.include_router(products.router)  # Product management and Shopify integration - re-enabled
# app.include_router(cdn.router)  # CDN management and optimization - temporarily disabled
# app.include_router(database.router)  # Database management and read replica monitoring - temporarily disabled
# app.include_router(shopify_webhooks.router)  # Shopify webhook handlers for real-time sync - disabled due to bleach dependency

# Include public routes (no authentication required)
app.include_router(services_public_router, prefix="/api/v2")

# V2 API endpoints for Six Figure Barber enhancements
app.include_router(client_lifecycle.router, prefix="/api/v2")  # Client lifecycle management
app.include_router(booking_intelligence.router, prefix="/api/v2")  # AI-powered booking intelligence
app.include_router(upselling.router, prefix="/api/v2")  # Upselling tracking and conversion analytics
app.include_router(ai_upselling.router, prefix="/api/v2")  # AI Agent for autonomous upselling
app.include_router(calendar_revenue_optimization.router, prefix="/api/v2")  # Calendar revenue optimization - Six Figure Barber methodology
app.include_router(search.router, prefix="/api/v2")  # Global search functionality

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

@app.get("/security/status")
def security_status():
    """Get security configuration status"""
    from config import settings
    
    # Only provide detailed info in non-production environments
    if settings.is_production():
        return {
            "environment": "production",
            "configuration_secure": configuration_reporter.get_compliance_report().get("production_ready", False),
            "security_score": configuration_reporter.get_compliance_report().get("security_score", 0)
        }
    else:
        return configuration_reporter.get_security_status()

@app.get("/security/compliance")
def security_compliance():
    """Get security compliance report"""
    return configuration_reporter.get_compliance_report()