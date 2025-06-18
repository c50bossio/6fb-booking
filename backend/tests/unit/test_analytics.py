"""
Unit tests for analytics endpoints
"""
import pytest
from datetime import datetime, timedelta
from api.v1.auth import get_password_hash


class TestAnalyticsEndpoints:
    """Test analytics API endpoints"""
    
    def setup_test_data(self, db):
        """Set up test data for analytics"""
        from models.user import User
        from models.location import Location
        from models.barber import Barber
        from models.client import Client
        from models.appointment import Appointment
        
        # Create location
        location = Location(
            name="Test Barbershop",
            address="123 Test St",
            city="Test City",
            state="TS",
            zip_code="12345",
            phone="555-1234",
            is_active=True
        )
        db.add(location)
        db.flush()
        
        # Create barber user
        user = User(
            email="testbarber@example.com",
            hashed_password=get_password_hash("password123"),
            first_name="Test",
            last_name="Barber",
            role="barber",
            is_active=True,
            primary_location_id=location.id
        )
        db.add(user)
        db.flush()
        
        # Create barber
        barber = Barber(
            user_id=user.id,
            location_id=location.id,
            commission_rate=0.7,
            is_active=True
        )
        db.add(barber)
        db.flush()
        
        # Create clients and appointments
        for i in range(5):
            client = Client(
                first_name=f"Client{i}",
                last_name="Test",
                email=f"client{i}@example.com",
                phone=f"555-200{i}",
                location_id=location.id
            )
            db.add(client)
            db.flush()
            
            # Create appointments
            appointment = Appointment(
                barber_id=barber.id,
                client_id=client.id,
                location_id=location.id,
                service_name="Haircut",
                start_time=datetime.now() - timedelta(days=i),
                end_time=datetime.now() - timedelta(days=i, hours=-1),
                price=30.00,
                tip=5.00,
                status="completed"
            )
            db.add(appointment)
        
        db.commit()
        return location.id, barber.id, user.id
    
    def test_revenue_overview(self, client):
        """Test revenue overview endpoint"""
        from models.user import User
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        location_id, barber_id, user_id = self.setup_test_data(db)
        
        # Get user for auth
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        
        # Login
        login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": user.email,
                "password": "password123"
            }
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get revenue overview
        response = client.get(
            "/api/v1/analytics/revenue/overview",
            headers=headers,
            params={"location_id": location_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_revenue" in data
        assert "appointment_count" in data
        assert "average_ticket" in data
        assert data["total_revenue"] == 175.00  # 5 appointments * $35
        assert data["appointment_count"] == 5
    
    def test_barber_performance(self, client):
        """Test barber performance endpoint"""
        from models.user import User
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        location_id, barber_id, user_id = self.setup_test_data(db)
        
        # Get user for auth
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        
        # Login
        login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": user.email,
                "password": "password123"
            }
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get barber performance
        response = client.get(
            f"/api/v1/analytics/barbers/{barber_id}/performance",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "trend" in data
        
        metrics = data["metrics"]
        assert metrics["total_revenue"] == 175.00
        assert metrics["appointment_count"] == 5
        assert metrics["average_ticket"] == 35.00
    
    def test_client_retention(self, client):
        """Test client retention analytics"""
        from models.user import User
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        location_id, barber_id, user_id = self.setup_test_data(db)
        
        # Get user for auth
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        
        # Login as admin to access analytics
        admin_user = {
            "email": "admin@test.com",
            "password": "adminpass123"
        }
        
        db = TestingSessionLocal()
        admin = User(
            email=admin_user["email"],
            hashed_password=get_password_hash(admin_user["password"]),
            first_name="Admin",
            last_name="User",
            role="admin",
            is_active=True,
            primary_location_id=location_id
        )
        db.add(admin)
        db.commit()
        db.close()
        
        # Login
        login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": admin_user["email"],
                "password": admin_user["password"]
            }
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get retention analytics
        response = client.get(
            "/api/v1/analytics/clients/retention",
            headers=headers,
            params={"location_id": location_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data
        assert "returning_clients" in data
        assert "retention_rate" in data
    
    def test_sixfb_score(self, client):
        """Test 6FB score calculation"""
        from models.user import User
        from models.barber import Barber
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        location_id, barber_id, user_id = self.setup_test_data(db)
        
        # Get user for auth
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        
        # Login
        login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": user.email,
                "password": "password123"
            }
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Calculate 6FB score
        response = client.post(
            f"/api/v1/analytics/barbers/{barber_id}/calculate-score",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "components" in data
        assert 0 <= data["score"] <= 100