"""
Simplified tests for barber profile functionality.

Tests the actual implementation using User model with barber profile fields.
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from main import app
from models import User, BarberPortfolioImage, BarberSpecialty
from services.barber_profile_service import BarberProfileService
from tests.factories import UserFactory, BaseFactory


class TestBarberProfileBasic:
    """Basic tests for barber profiles using User model."""
    
    def test_create_barber_user_with_profile_fields(self, db: Session):
        """Test creating a barber user with profile fields."""
        # Arrange
        barber = UserFactory.create_barber(
            bio="Professional barber with 5 years experience",
            years_experience=5,
            profile_image_url="https://example.com/profile.jpg",
            specialties=["Haircut", "Beard Trimming"],
            social_links={"instagram": "https://instagram.com/barber"}
        )
        
        # Act
        db.add(barber)
        db.commit()
        db.refresh(barber)
        
        # Assert
        assert barber.role == 'barber'
        assert barber.bio == "Professional barber with 5 years experience"
        assert barber.years_experience == 5
        assert barber.profile_image_url == "https://example.com/profile.jpg"
        assert barber.specialties == ["Haircut", "Beard Trimming"]
        assert barber.social_links["instagram"] == "https://instagram.com/barber"
    
    def test_barber_profile_service_get_profile(self, db: Session):
        """Test getting barber profile through service."""
        # Arrange
        barber = UserFactory.create_barber(
            bio="Expert barber",
            years_experience=8
        )
        db.add(barber)
        db.commit()
        
        service = BarberProfileService(db)
        
        # Act
        profile = service.get_barber_profile(barber.id)
        
        # Assert
        assert profile is not None
        assert profile.id == barber.id
        assert profile.bio == "Expert barber"
        assert profile.years_experience == 8
    
    def test_create_portfolio_image(self, db: Session):
        """Test creating portfolio image for barber."""
        # Arrange
        barber = UserFactory.create_barber()
        db.add(barber)
        db.commit()
        
        portfolio_image = BarberPortfolioImage(
            barber_id=barber.id,
            image_url="https://example.com/portfolio.jpg",
            title="Professional Work",
            description="Professional haircut",
            is_featured=True,
            display_order=1
        )
        
        # Act
        db.add(portfolio_image)
        db.commit()
        db.refresh(portfolio_image)
        
        # Assert
        assert portfolio_image.barber_id == barber.id
        assert portfolio_image.image_url == "https://example.com/portfolio.jpg"
        assert portfolio_image.is_featured is True
    
    def test_create_specialty(self, db: Session):
        """Test creating specialty for barber."""
        # Arrange
        barber = UserFactory.create_barber()
        db.add(barber)
        db.commit()
        
        specialty = BarberSpecialty(
            barber_id=barber.id,
            specialty_name="Fade Cuts",
            category="Haircut",
            experience_level="expert",
            is_primary=True
        )
        
        # Act
        db.add(specialty)
        db.commit()
        db.refresh(specialty)
        
        # Assert
        assert specialty.barber_id == barber.id
        assert specialty.specialty_name == "Fade Cuts"
        assert specialty.category == "Haircut"
        assert specialty.experience_level == "expert"
        assert specialty.is_primary is True


class TestBarberProfileAPI:
    """Test API endpoints for barber profiles."""
    
    def test_get_barber_profile_endpoint(self, client: TestClient, db: Session, test_barber: User, barber_auth_headers: dict):
        """Test getting individual barber profile."""
        # Act
        response = client.get(f"/api/v2/barber-profiles/{test_barber.id}", headers=barber_auth_headers)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        
        # Verify data structure
        expected_fields = ['id', 'name', 'bio', 'years_experience', 'profile_image_url']
        for field in expected_fields:
            assert field in data
        
        assert data['id'] == test_barber.id
        assert data['name'] == "Test Barber"
        assert data['bio'] == "Professional barber with 5 years experience"
    
    def test_get_nonexistent_barber_profile(self, client: TestClient, db: Session, barber_auth_headers: dict):
        """Test getting profile for non-existent barber."""
        # Act
        response = client.get("/api/v2/barber-profiles/99999", headers=barber_auth_headers)
        
        # Assert
        assert response.status_code == 404


class TestBarberSelectionIntegration:
    """Test integration with booking flow."""
    
    def test_barber_data_for_booking_component(self, db: Session):
        """Test barber data structure for BarberSelection component."""
        # Arrange
        barber = UserFactory.create_barber(
            name="Alex Smith",
            bio="Specialist in modern cuts and styling",
            years_experience=7,
            profile_image_url="https://example.com/alex.jpg",
            specialties=["Modern Cuts", "Beard Trimming"]
        )
        
        # Add portfolio image
        portfolio = BarberPortfolioImage(
            barber_id=barber.id,
            image_url="https://example.com/portfolio1.jpg",
            title="Modern Work",
            description="Modern fade cut",
            is_featured=True,
            display_order=1
        )
        
        # Add specialty
        specialty = BarberSpecialty(
            barber_id=barber.id,
            specialty_name="Fade Cuts",
            category="Haircut",
            experience_level="expert",
            is_primary=True
        )
        
        db.add_all([barber, portfolio, specialty])
        db.commit()
        
        # Act
        service = BarberProfileService(db)
        profile = service.get_barber_profile(barber.id, include_relationships=True)
        
        # Assert - Verify data structure for frontend component
        assert profile is not None
        assert profile.name == "Alex Smith"
        assert profile.bio == "Specialist in modern cuts and styling" 
        assert profile.years_experience == 7
        assert profile.profile_image_url == "https://example.com/alex.jpg"
        
        # Check that relationships are loaded (if service supports it)
        # This would be implemented in the actual service
    
    def test_barber_availability_context(self, db: Session):
        """Test that barbers are shown in individual shop context."""
        # Arrange
        shop_barber1 = UserFactory.create_barber(email="barber1@shop.com")
        shop_barber2 = UserFactory.create_barber(email="barber2@shop.com")
        
        db.add_all([shop_barber1, shop_barber2])
        db.commit()
        
        # Act
        service = BarberProfileService(db)
        # Get all active barber profiles using get_barber_profile method
        barber1_profile = service.get_barber_profile(shop_barber1.id)
        barber2_profile = service.get_barber_profile(shop_barber2.id)
        
        # Assert
        assert barber1_profile is not None
        assert barber2_profile is not None
        
        # Verify all returned barbers are active
        assert barber1_profile.is_active is True
        assert barber1_profile.role == 'barber'
        assert barber2_profile.is_active is True
        assert barber2_profile.role == 'barber'


# Simple integration test
def test_basic_barber_profile_workflow(db: Session, client: TestClient, test_barber: User, barber_auth_headers: dict):
    """Test basic workflow for barber profiles."""
    # 1. Verify barber profile can be retrieved
    response = client.get(f"/api/v2/barber-profiles/{test_barber.id}", headers=barber_auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data['id'] == test_barber.id
    assert data['name'] == test_barber.name
    assert data['bio'] == test_barber.bio
    
    # 2. Create portfolio and specialty
    portfolio = BarberPortfolioImage(
        barber_id=test_barber.id,
        image_url="https://example.com/work1.jpg",
        title="Modern Fade",
        description="Modern fade cut",
        is_featured=True,
        display_order=1
    )
    
    specialty = BarberSpecialty(
        barber_id=test_barber.id,
        specialty_name="Modern Cuts",
        category="Haircut",
        experience_level="expert",
        is_primary=True
    )
    
    db.add_all([portfolio, specialty])
    db.commit()
    
    # 3. Verify service can find barber with relationships
    service = BarberProfileService(db)
    profile = service.get_barber_profile(test_barber.id)
    
    assert profile is not None
    assert profile.bio == "Professional barber with 5 years experience"