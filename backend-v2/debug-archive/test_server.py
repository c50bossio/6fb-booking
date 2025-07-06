#!/usr/bin/env python3
"""
Test server for integration testing.
Only includes the integration and review routes for testing.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import User
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
import json

# Create FastAPI app
app = FastAPI(
    title="BookedBarber Test API",
    description="Test server for integration testing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock user for testing
def get_mock_user():
    """Mock user for testing integration endpoints."""
    user = User()
    user.id = 1
    user.email = "test@example.com"
    user.name = "Test User"
    user.role = "admin"
    user.is_active = True
    return user

# Mock data for testing
mock_integrations = [
    {
        "id": 1,
        "user_id": 1,
        "integration_type": "google_calendar",
        "name": "Google Calendar",
        "status": "active",
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "config": {"calendar_id": "primary"},
        "scopes": ["https://www.googleapis.com/auth/calendar"]
    },
    {
        "id": 2,
        "user_id": 1,
        "integration_type": "stripe",
        "name": "Stripe Payments",
        "status": "pending",
        "is_active": False,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "config": {},
        "scopes": []
    }
]

mock_reviews = [
    {
        "id": 1,
        "business_id": "test_business",
        "reviewer_name": "John Doe",
        "rating": 5,
        "review_text": "Great service!",
        "review_date": datetime.now().isoformat(),
        "platform": "google",
        "response_text": "Thank you for your review!",
        "is_responded": True
    }
]

# Mock endpoints to replace the real routers
@app.get("/api/v1/integrations/status")
async def get_integration_status(current_user: User = Depends(get_mock_user)):
    """Mock endpoint for integration status."""
    return mock_integrations

@app.post("/api/v1/integrations/connect")
async def initiate_oauth_connection(
    request: Dict[str, Any],
    current_user: User = Depends(get_mock_user)
):
    """Mock OAuth initiation endpoint."""
    integration_type = request.get("integration_type")
    if not integration_type:
        raise HTTPException(status_code=400, detail="integration_type is required")
    
    return {
        "authorization_url": f"https://oauth.example.com/authorize?type={integration_type}&state=test123",
        "state": "test123"
    }

@app.post("/api/v1/integrations/callback")
async def oauth_callback(
    request: Dict[str, Any],
    current_user: User = Depends(get_mock_user)
):
    """Mock OAuth callback endpoint."""
    return {
        "success": True,
        "message": "Integration connected successfully",
        "integration_id": 3
    }

@app.delete("/api/v1/integrations/{integration_id}")
async def disconnect_integration(
    integration_id: int,
    current_user: User = Depends(get_mock_user)
):
    """Mock integration disconnect endpoint."""  
    return {
        "success": True,
        "message": f"Integration {integration_id} disconnected successfully"
    }

@app.get("/api/v1/integrations/health/all")
async def get_all_integration_health(
    current_user: User = Depends(get_mock_user)
):
    """Mock health check for all integrations."""
    return {
        "summary": {
            "total": 2,
            "healthy": 1,
            "unhealthy": 1,
            "pending": 0
        },
        "integrations": [
            {
                "id": 1,
                "name": "Google Calendar",
                "type": "google_calendar", 
                "status": "healthy",
                "last_check": datetime.now().isoformat(),
                "response_time_ms": 150
            },
            {
                "id": 2,
                "name": "Stripe Payments",
                "type": "stripe",
                "status": "unhealthy", 
                "last_check": datetime.now().isoformat(),
                "error": "API key expired"
            }
        ]
    }

@app.get("/api/v1/reviews")
async def get_reviews(
    current_user: User = Depends(get_mock_user)
):
    """Mock reviews endpoint."""
    return mock_reviews

@app.get("/api/v1/reviews/analytics")
async def get_review_analytics(
    current_user: User = Depends(get_mock_user)
):
    """Mock review analytics endpoint."""
    return {
        "total_reviews": 10,
        "average_rating": 4.2,
        "response_rate": 0.8,
        "platforms": {
            "google": 6,
            "yelp": 3,
            "facebook": 1
        }
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Test server running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)