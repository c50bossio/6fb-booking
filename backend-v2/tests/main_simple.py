"""
Simplified FastAPI backend for debugging authentication issues
This version removes potentially blocking middleware and complex imports
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
import sqlite3
import bcrypt
from jose import jwt
from pydantic import BaseModel

# Settings - Using environment variable for security
import os
SECRET_KEY = os.getenv("TEST_SECRET_KEY", "INSECURE_TEST_KEY_DO_NOT_USE_IN_PRODUCTION")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Schemas
class UserLogin(BaseModel):
    email: str
    password: str

# Create FastAPI app
app = FastAPI(
    title="BookedBarber V2 - Simple Mode", 
    description="Simplified backend for debugging",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint to verify server is working"""
    return {"message": "BookedBarber V2 - Simple Mode", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "mode": "simple"}

@app.post("/api/v1/auth/login-simple")
async def login_simple(user_credentials: UserLogin):
    """Simplified login endpoint without SQLAlchemy"""
    try:
        # Connect to database directly
        conn = sqlite3.connect('6fb_booking.db')
        cursor = conn.cursor()
        
        # Find user
        cursor.execute("SELECT id, email, role, hashed_password FROM users WHERE email = ?", (user_credentials.email,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {
                "success": False,
                "message": "User not found"
            }
        
        user_id, email, role, hashed_password = user
        
        # Verify password
        is_valid = bcrypt.checkpw(user_credentials.password.encode('utf-8'), hashed_password.encode('utf-8'))
        
        if not is_valid:
            conn.close()
            return {
                "success": False,
                "message": "Invalid password"
            }
        
        # Create access token
        from datetime import datetime
        payload = {
            "sub": email,
            "role": role,
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        access_token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        conn.close()
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "role": role
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }

@app.get("/api/v1/services-simple")
async def get_services_simple():
    """Simplified services endpoint"""
    try:
        conn = sqlite3.connect('6fb_booking.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name, base_price, duration_minutes FROM services LIMIT 10")
        services = cursor.fetchall()
        
        conn.close()
        
        return {
            "success": True,
            "services": [
                {
                    "id": service[0],
                    "name": service[1],
                    "price": float(service[2]) if service[2] else 0.0,
                    "duration": service[3] if service[3] else 30
                }
                for service in services
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)