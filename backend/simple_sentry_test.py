#!/usr/bin/env python3
"""
Simple FastAPI app just to test Sentry integration
"""
from fastapi import FastAPI
from sentry_config import init_sentry
import logging

# Initialize Sentry first
init_sentry()

# Setup logging
logger = logging.getLogger(__name__)

# Create minimal FastAPI app
app = FastAPI(title="Sentry Test API")

@app.get("/")
def read_root():
    return {"message": "Sentry test API is running"}

@app.get("/sentry-debug")
def trigger_error():
    """Sentry debug endpoint - triggers a test error"""
    logger.info("Sentry debug endpoint called - triggering test error")
    
    # This will be captured by Sentry
    division_by_zero = 1 / 0
    
    return {"message": "This should not be reached"}

@app.get("/health")
def health():
    return {"status": "healthy", "sentry": "configured"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)