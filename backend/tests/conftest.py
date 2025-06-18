"""
Pytest configuration and fixtures
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from config.database import Base, get_db
from api.v1.auth import get_password_hash


# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_db():
    """Create test database for each test"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client"""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user():
    """Test user data"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
        "role": "barber"
    }


@pytest.fixture
def admin_user():
    """Admin user data"""
    return {
        "email": "admin@example.com",
        "password": "adminpassword123",
        "first_name": "Admin",
        "last_name": "User",
        "role": "super_admin"
    }


@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for test user"""
    # Create user
    from models.user import User
    db = TestingSessionLocal()
    
    db_user = User(
        email=test_user["email"],
        hashed_password=get_password_hash(test_user["password"]),
        first_name=test_user["first_name"],
        last_name=test_user["last_name"],
        role=test_user["role"],
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.close()
    
    # Login
    response = client.post(
        "/api/v1/auth/token",
        data={
            "username": test_user["email"],
            "password": test_user["password"]
        }
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    return {"Authorization": f"Bearer {token}"}