"""
Temporary auth bypass for testing frontend integration
"""
from fastapi import APIRouter
from datetime import datetime, timedelta, timezone
from utils.auth_simple import create_access_token, create_refresh_token
import schemas

router = APIRouter(prefix="/auth-test", tags=["auth-test"])

@router.post("/login", response_model=schemas.Token)
async def test_login_bypass():
    """Temporary bypass login for testing frontend"""
    
    # Create tokens for a test user that actually exists in the database
    # Using customer@bookedbarber.com (ID: 3, role: user)
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": "customer@bookedbarber.com", "role": "user"},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": "customer@bookedbarber.com"}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }