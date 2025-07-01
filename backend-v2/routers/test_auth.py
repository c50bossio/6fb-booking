from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from database import engine
from utils.auth import verify_password, create_access_token, create_refresh_token
from datetime import timedelta
import schemas

router = APIRouter(prefix="/test", tags=["test"])

@router.post("/login", response_model=schemas.Token)
async def test_login(user_credentials: schemas.UserLogin):
    """Test login endpoint that bypasses ORM."""
    
    with engine.connect() as conn:
        # Find user by email
        result = conn.execute(
            text("SELECT id, email, hashed_password, role FROM users WHERE email = :email AND is_active = true"),
            {"email": user_credentials.username}
        )
        user_row = result.fetchone()
        
        if not user_row:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Verify password
        if not verify_password(user_credentials.password, user_row.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user_row.email, "role": user_row.role},
            expires_delta=timedelta(minutes=15)
        )
        refresh_token = create_refresh_token(
            data={"sub": user_row.email}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

@router.get("/health")
async def test_health():
    """Simple health check."""
    return {"status": "ok", "message": "Test router is working"}

@router.post("/login-simple")
async def test_login_simple(user_credentials: schemas.UserLogin):
    """Ultra simple login test - no password verification."""
    
    if user_credentials.username == "test-barber@6fb.com" and user_credentials.password == "testpass123":
        # Create tokens without password verification
        access_token = create_access_token(
            data={"sub": "test-barber@6fb.com", "role": "barber"},
            expires_delta=timedelta(minutes=15)
        )
        refresh_token = create_refresh_token(
            data={"sub": "test-barber@6fb.com"}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")