"""
Tests for analytics API endpoints
"""
import pytest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from config.database import get_db
from models.user import User
from models.location import Location
from models.barber import Barber
from models.appointment import Appointment
from models.client import Client
from services.auth_service import AuthService

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_db():
    # This should be a test database session
    # For now, we'll use the regular get_db
    db = next(get_db())
    yield db
    db.rollback()

@pytest.fixture
def auth_headers(test_db):
    """Create test user and return auth headers"""
    # Create test user
    user = User(
        email="test@example.com",
        hashed_password=AuthService.hash_password("testpass123"),
        first_name="Test",
        last_name="User",
        role="admin",
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    
    # Generate token
    token = AuthService.create_access_token({"sub": user.email})
    
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_data(test_db):
    """Create test data for analytics"""
    # Create location
    location = Location(
        name="Test Location",
        address="123 Test St",
        city="Test City",
        state="TS",
        zip_code="12345",
        phone="555-0123"
    )
    test_db.add(location)
    
    # Create barber user
    barber_user = User(
        email="barber@example.com",
        hashed_password=AuthService.hash_password("testpass123"),
        first_name="Test",
        last_name="Barber",
        role="barber"
    )
    test_db.add(barber_user)
    test_db.commit()
    
    # Create barber
    barber = Barber(
        user_id=barber_user.id,
        location_id=location.id,
        commission_rate=60.0,
        phone="555-0124"
    )
    test_db.add(barber)
    
    # Create clients
    clients = []
    for i in range(5):
        client = Client(
            first_name=f"Client{i}",
            last_name="Test",
            email=f"client{i}@example.com",
            phone=f"555-010{i}"
        )
        test_db.add(client)
        clients.append(client)
    
    test_db.commit()
    
    # Create appointments
    base_date = date.today() - timedelta(days=30)
    for i in range(20):
        appointment_date = base_date + timedelta(days=i)
        appointment = Appointment(
            barber_id=barber.id,
            client_id=clients[i % 5].id,
            location_id=location.id,
            appointment_time=datetime.combine(appointment_date, datetime.min.time().replace(hour=10 + (i % 8))),
            service_name="Haircut",
            duration=30,
            price=50.0 + (i * 2),
            service_price=40.0 + (i * 1.5),
            product_price=5.0,
            tip_amount=5.0 + (i * 0.5),
            status="completed" if i < 15 else "scheduled",
            rating=4.5 if i < 15 else None
        )
        test_db.add(appointment)
    
    test_db.commit()
    
    return {
        "location": location,
        "barber": barber,
        "clients": clients
    }

class TestAnalyticsAPI:
    """Test analytics API endpoints"""
    
    def test_revenue_analytics(self, client, auth_headers, test_data):
        """Test revenue analytics endpoint"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/revenue?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check data structure
        for item in data:
            assert "date" in item
            assert "revenue" in item
            assert "services" in item
            assert "products" in item
            assert "tips" in item
            assert item["revenue"] >= 0
    
    def test_revenue_analytics_with_location(self, client, auth_headers, test_data):
        """Test revenue analytics with location filter"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        location_id = test_data["location"].id
        
        response = client.get(
            f"/api/v1/analytics/revenue?start_date={start_date}&end_date={end_date}&location_id={location_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_booking_analytics(self, client, auth_headers, test_data):
        """Test booking analytics endpoint"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/bookings?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for item in data:
            assert "date" in item
            assert "total" in item
            assert "completed" in item
            assert "cancelled" in item
            assert "no_show" in item
            assert "pending" in item
            assert item["total"] >= 0
    
    def test_performance_metrics(self, client, auth_headers, test_data):
        """Test performance metrics endpoint"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/metrics?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "totalRevenue" in data
        assert "revenueGrowth" in data
        assert "totalBookings" in data
        assert "activeClients" in data
        assert "avgBookingValue" in data
        assert "utilizationRate" in data
        assert "insights" in data
        
        assert data["totalRevenue"] >= 0
        assert data["totalBookings"] >= 0
        assert isinstance(data["insights"], list)
    
    def test_service_analytics(self, client, auth_headers, test_data):
        """Test service analytics endpoint"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/services?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for item in data:
            assert "name" in item
            assert "bookings" in item
            assert "revenue" in item
            assert "avg_duration" in item
    
    def test_retention_analytics(self, client, auth_headers, test_data):
        """Test retention analytics endpoint"""
        start_date = date.today() - timedelta(days=90)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/retention?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "overallRetention" in data
        assert "newClients" in data
        assert "returningClients" in data
        assert "monthlyRetention" in data
        assert "visitFrequency" in data
        assert "cohortAnalysis" in data
        assert "segmentAnalysis" in data
    
    def test_peak_hours_analytics(self, client, auth_headers, test_data):
        """Test peak hours analytics endpoint"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/peak-hours?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for item in data:
            assert "day" in item
            assert "hour" in item
            assert "bookings" in item
            assert item["day"] in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            assert 0 <= item["hour"] <= 23
    
    def test_barber_comparison(self, client, auth_headers, test_data):
        """Test barber comparison endpoint"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/barber-comparison?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for barber in data:
            assert "id" in barber
            assert "name" in barber
            assert "bookings" in barber
            assert "revenue" in barber
            assert "rating" in barber
            assert "efficiency" in barber
    
    def test_export_csv(self, client, auth_headers, test_data):
        """Test CSV export endpoint"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        response = client.get(
            f"/api/v1/analytics/export?format=csv&start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]
    
    def test_date_validation(self, client, auth_headers):
        """Test date range validation"""
        # End date before start date
        response = client.get(
            "/api/v1/analytics/revenue?start_date=2024-01-31&end_date=2024-01-01",
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Date range too large (>365 days)
        start_date = date.today() - timedelta(days=400)
        end_date = date.today()
        response = client.get(
            f"/api/v1/analytics/revenue?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        assert response.status_code == 422
    
    def test_unauthorized_access(self, client):
        """Test unauthorized access to analytics"""
        response = client.get("/api/v1/analytics/revenue?start_date=2024-01-01&end_date=2024-01-31")
        assert response.status_code == 401
    
    def test_permission_checks(self, client, test_db):
        """Test role-based access control"""
        # Create barber user (limited permissions)
        barber_user = User(
            email="barber_limited@example.com",
            hashed_password=AuthService.hash_password("testpass123"),
            first_name="Limited",
            last_name="Barber",
            role="barber"
        )
        test_db.add(barber_user)
        test_db.commit()
        
        token = AuthService.create_access_token({"sub": barber_user.email})
        headers = {"Authorization": f"Bearer {token}"}
        
        # Barber should have limited access to certain analytics
        response = client.get(
            "/api/v1/analytics/network-insights",
            headers=headers
        )
        assert response.status_code == 403
    
    def test_caching(self, client, auth_headers):
        """Test that caching is working"""
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        # First request
        response1 = client.get(
            f"/api/v1/analytics/revenue?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Second request (should be cached)
        response2 = client.get(
            f"/api/v1/analytics/revenue?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        assert response2.status_code == 200
        
        # Data should be identical
        assert response1.json() == response2.json()