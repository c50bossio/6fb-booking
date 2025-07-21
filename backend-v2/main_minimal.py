"""
Minimal FastAPI application for MVP stabilization
Only includes essential functionality: auth, appointments, and basic features.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
import models

# Import only essential routers for MVP
try:
    from routers import auth, bookings, appointments, users, health
    ROUTERS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Some routers not available: {e}")
    ROUTERS_AVAILABLE = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    yield
    print("👋 Application shutdown")

# Create FastAPI app
app = FastAPI(
    title="BookedBarber V2 - MVP",
    description="Minimal booking platform for MVP testing",
    version="2.0.0-mvp",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include essential routers only
if ROUTERS_AVAILABLE:
    try:
        app.include_router(health.router, prefix="/api/v1", tags=["health"])
        print("✅ Health router included")
    except:
        pass
    
    try:
        app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
        print("✅ Auth router included")
    except Exception as e:
        print(f"⚠️  Auth router failed: {e}")
    
    try:
        app.include_router(users.router, prefix="/api/v1", tags=["users"])
        print("✅ Users router included")
    except Exception as e:
        print(f"⚠️  Users router failed: {e}")
    
    try:
        app.include_router(appointments.router, prefix="/api/v1", tags=["appointments"])
        print("✅ Appointments router included")
    except Exception as e:
        print(f"⚠️  Appointments router failed: {e}")
        
        # Try bookings as fallback
        try:
            app.include_router(bookings.router, prefix="/api/v1", tags=["bookings"])
            print("✅ Bookings router included (fallback)")
        except Exception as e2:
            print(f"⚠️  Bookings router also failed: {e2}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "BookedBarber V2 MVP is running",
        "status": "healthy",
        "version": "2.0.0-mvp"
    }

@app.get("/api/v1/test-user")
async def create_test_user():
    """Create a test user for login testing"""
    try:
        from database import get_db
        from models import User
        from utils.auth import get_password_hash
        from sqlalchemy.orm import Session
        
        db = next(get_db())
        
        # Check if test user exists
        existing_user = db.query(User).filter(User.email == "admin@bookedbarber.com").first()
        if existing_user:
            return {
                "message": "Test user already exists", 
                "email": "admin@bookedbarber.com",
                "password": "password123"
            }
        
        # Create test user
        hashed_password = get_password_hash("password123")
        test_user = User(
            email="admin@bookedbarber.com",
            hashed_password=hashed_password,
            first_name="Admin",
            last_name="User",
            role="admin",
            is_active=True
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        return {
            "message": "Test user created successfully",
            "email": "admin@bookedbarber.com", 
            "password": "password123",
            "user_id": test_user.id
        }
        
    except Exception as e:
        return {"error": f"Failed to create test user: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)