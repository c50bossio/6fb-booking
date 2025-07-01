"""
Pytest configuration and fixtures for BookedBarber V2 tests
"""

import os
# Set testing environment before importing anything else
os.environ["TESTING"] = "true"

import pytest
import asyncio
from typing import Generator, AsyncGenerator
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_db
from models import User
from utils.auth import get_password_hash, create_access_token


# Test database URL - use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"


# Remove event_loop fixture as pytest-asyncio provides it


@pytest.fixture(scope="function")
def engine():
    """Create a test database engine"""
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db(engine) -> Generator[Session, None, None]:
    """Create a test database session"""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def override_get_db(db: Session):
    """Override the get_db dependency"""
    def _override_get_db():
        try:
            yield db
        finally:
            pass
    return _override_get_db


@pytest.fixture(scope="function")
async def async_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client"""
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client(override_get_db):
    """Create a synchronous test client"""
    from fastapi.testclient import TestClient
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db: Session) -> User:
    """Create a test user"""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password=get_password_hash("testpass123"),
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_admin(db: Session) -> User:
    """Create a test admin user"""
    admin = User(
        email="admin@example.com",
        name="Admin User",
        hashed_password=get_password_hash("adminpass123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture(scope="function")
def auth_headers(test_user: User) -> dict:
    """Get authentication headers for test user"""
    access_token = create_access_token(data={"sub": test_user.email, "role": test_user.role})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(scope="function")
def admin_auth_headers(test_admin: User) -> dict:
    """Get authentication headers for admin user"""
    access_token = create_access_token(data={"sub": test_admin.email, "role": test_admin.role})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def anyio_backend():
    """Use asyncio backend for anyio"""
    return "asyncio"


@pytest.fixture(scope="function")
def test_client_data() -> dict:
    """Sample client data for testing"""
    return {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@example.com",
        "phone": "555-5678",
        "notes": "Regular customer",
        "tags": "Loyal"
    }


@pytest.fixture(scope="function") 
def test_user_token(test_user: User) -> str:
    """Get access token for test user"""
    return create_access_token(data={"sub": test_user.email, "role": test_user.role})


@pytest.fixture(scope="function")
def mock_notification_service(monkeypatch):
    """Mock notification service to prevent actual email/SMS sending"""
    from unittest.mock import Mock, AsyncMock
    
    # Mock the notification service instance methods
    mock_service = Mock()
    mock_service.send_email = Mock(return_value={"success": True})
    mock_service.send_sms = Mock(return_value={"success": True})
    mock_service.queue_notification = Mock(return_value=[])
    mock_service.schedule_appointment_reminders = Mock(return_value=None)
    
    # Mock the entire notification service module
    monkeypatch.setattr("services.notification_service.notification_service", mock_service)
    
    # Also mock at the import level for any direct imports
    import services.notification_service as ns
    monkeypatch.setattr(ns, "notification_service", mock_service)
    
    return mock_service


@pytest.fixture(scope="function")
def disable_rate_limiting(monkeypatch):
    """Disable rate limiting for tests"""
    # Ensure environment variable is set
    monkeypatch.setenv("TESTING", "true")
    
    # Also override the settings directly
    from config import settings
    original_env = settings.environment
    settings.environment = "test"
    
    yield
    
    # Restore original environment
    settings.environment = original_env