"""
EMERGENCY LOGIN ENDPOINT - NO CORS RESTRICTIONS
This endpoint bypasses all CORS checks for emergency access
"""

from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Annotated

from config.database import get_db
from services.auth_service import AuthService
from utils.security import verify_password, get_password_hash
from models.user import User

router = APIRouter()


@router.options("/emergency-login")
async def emergency_login_options():
    """Handle CORS preflight for emergency login - allow ALL origins"""
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "false",  # Don't send credentials
            "Access-Control-Max-Age": "3600",
        }
    )


@router.post("/emergency-login")
async def emergency_login(
    username: Annotated[str, Form()],
    password: Annotated[str, Form()],
    db: Session = Depends(get_db)
):
    """
    Emergency login endpoint with no CORS restrictions
    This bypasses all CORS middleware for debugging purposes
    """
    try:
        # Find user by email/username
        user = db.query(User).filter(
            (User.email == username) | (User.username == username)
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=401,
                detail="User account is disabled"
            )
        
        # Create access token
        auth_service = AuthService()
        access_token = auth_service.create_access_token(
            data={"sub": user.email}
        )
        
        # Return response with permissive CORS headers
        response_data = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "permissions": user.get_permissions() if hasattr(user, 'get_permissions') else [],
                "primary_location_id": user.primary_location_id
            }
        }
        
        return JSONResponse(
            content=response_data,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "false",
                "Cache-Control": "no-store, no-cache, must-revalidate",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Return error with CORS headers
        return JSONResponse(
            content={"detail": f"Emergency login error: {str(e)}"},
            status_code=500,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "false",
            }
        )