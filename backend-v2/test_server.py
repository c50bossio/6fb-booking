#!/usr/bin/env python3
"""
Minimal test server to verify backend functionality
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="BookedBarber Test API", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "BookedBarber V2 Test API is running", "version": "2.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "backend-v2"}

@app.get("/api/v1/auth/me")
def get_current_user():
    """Mock endpoint for auth testing"""
    return {"message": "No authentication configured in test mode"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)