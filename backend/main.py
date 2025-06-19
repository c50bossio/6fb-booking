"""
Main FastAPI application for 6FB Booking Platform
"""
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
import uvicorn
import os
from datetime import datetime

from config.database import engine, Base, get_db
from config.settings import settings

# Import all models to ensure they're registered with SQLAlchemy
from models import (
    appointment, barber, client, location, 
    user, analytics, training, automation, revenue_share, notification, payment,
    communication
)

# Import security middleware
from middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from middleware.request_logging import RequestLoggingMiddleware
from middleware.error_handling import ErrorHandlingMiddleware, register_exception_handlers

# Import routers from api.v1
from api.v1 import (
    auth, users, locations, barbers, appointments,
    analytics, training as training_router, revenue, automation as automation_router,
    websocket, notifications
)
from api.v1.endpoints import payments, webhooks, communications

# Import logging setup
from utils.logging import setup_logging

# Create all database tables
Base.metadata.create_all(bind=engine)

# Setup logging
setup_logging()

# Initialize FastAPI app
app = FastAPI(
    title="6FB Booking Platform API",
    description="Six Figure Barber booking and analytics platform",
    version="1.0.0"
)

# Store settings in app state for middleware access
app.state.settings = settings

# Add middleware (order matters - error handling should be outermost)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS
# Get allowed origins from environment or use defaults
cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if os.getenv("CORS_ALLOWED_ORIGINS") else []
if not cors_origins:
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://sixfb-frontend.onrender.com",  # Your Render frontend URL
        "https://*.onrender.com"  # Allow all Render subdomains during deployment
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
register_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(barbers.router, prefix="/api/v1/barbers", tags=["Barbers"])
app.include_router(appointments.router, prefix="/api/v1/appointments", tags=["Appointments"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(training_router.router, prefix="/api/v1/training", tags=["Training"])
app.include_router(revenue.router, prefix="/api/v1/revenue", tags=["Revenue"])
app.include_router(automation_router.router, prefix="/api/v1/automation", tags=["Automation"])
app.include_router(websocket.router, prefix="/api/v1", tags=["WebSocket"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(communications.router, prefix="/api/v1", tags=["Communications"])

@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to 6FB Booking Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "disconnected",
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )