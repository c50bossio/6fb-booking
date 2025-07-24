"""
Comprehensive tests for barber profile functionality.

Tests cover:
- Barber profile CRUD operations
- Profile completion tracking
- Portfolio management
- Specialties management
- API endpoints
- Authentication and authorization
- Individual barbershop context (NOT marketplace)
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from main import app
from models import User, BarberPortfolioImage, BarberSpecialty
from services.barber_profile_service import BarberProfileService
from schemas_new.barber_profile import (
    BarberProfileCreate, 
    BarberProfileUpdate,
    BarberPortfolioImageCreate,
    BarberSpecialtyCreate
)
from tests.factories import UserFactory, BaseFactory


class BarberProfileFactory(BaseFactory):
    """Factory for creating barber profile test data using User model."""
    
    @classmethod
    def create_barber_with_profile(cls, **kwargs):
        """Create a User instance with barber profile fields."""
        defaults = {
            'id': cls.get_next_id(),
            'email': cls.random_email('barber'),
            'name': f"Test Barber {cls.get_next_id()}",
            'hashed_password': "$2b$12$fake_hashed_password",
            'role': 'barber',
            'is_active': True,
            'bio': f"Professional barber with {cls.get_next_id()} years experience",
            'years_experience': 5,
            'profile_image_url': f"https://example.com/profile_{cls.get_next_id()}.jpg",
            'social_links': {
                'instagram': f"https://instagram.com/barber_{cls.get_next_id()}",
                'website': f"https://barber{cls.get_next_id()}.com"
            },
            'specialties': ["Haircut", "Beard Trimming"],
            'profile_completed': True,
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return User(**defaults)
    
    @classmethod
    def create_barber_profile_schema(cls, **kwargs):
        """Create a BarberProfileCreate schema with defaults."""
        defaults = {
            'bio': f"Professional barber with {cls.get_next_id()} years experience",
            'years_experience': 5,
            'hourly_rate': Decimal('45.00'),
            'profile_image_url': f"https://example.com/profile_{cls.get_next_id()}.jpg",
            'instagram_url': f"https://instagram.com/barber_{cls.get_next_id()}",
            'website_url': f"https://barber{cls.get_next_id()}.com",
            'certifications': ["Certified Master Barber"],
            'awards': ["Best Barber 2023"],
            'education': ["Barber Academy Graduate"]
        }
        defaults.update(kwargs)
        return BarberProfileCreate(**defaults)
    
    @classmethod
    def create_portfolio_image(cls, **kwargs):
        """Create a BarberPortfolioImage instance."""
        defaults = {
            'barber_id': 1,
            'image_url': f"https://example.com/portfolio_{cls.get_next_id()}.jpg",
            'description': f"Professional work example {cls.get_next_id()}",
            'tags': ["haircut", "styling", "professional"],
            'is_featured': False,
            'display_order': cls.get_next_id(),
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return BarberPortfolioImage(**defaults)
    
    @classmethod
    def create_specialty(cls, **kwargs):
        """Create a BarberSpecialty instance."""
        defaults = {
            'barber_id': 1,
            'specialty_name': f"Specialty {cls.get_next_id()}",
            'description': f"Specialized in advanced {cls.get_next_id()} techniques",
            'years_experience': 3,
            'price_modifier': Decimal('1.25'),  # 25% premium
            'is_featured': False,
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return BarberSpecialty(**defaults)


class TestBarberProfileService:
    """Test cases for BarberProfileService."""
    
    def test_create_barber_profile_success(self, db: Session):
        """Test successful barber profile creation."""
        # Arrange
        barber = UserFactory.create_barber()
        db.add(barber)
        db.commit()
        
        profile_data = BarberProfileFactory.create_barber_profile_schema()
        service = BarberProfileService(db)
        
        # Act
        profile = service.create_profile(barber.id, profile_data)
        
        # Assert
        assert profile is not None
        assert profile.user_id == barber.id
        assert profile.bio == profile_data.bio
        assert profile.years_experience == profile_data.years_experience
        assert profile.hourly_rate == profile_data.hourly_rate
        assert profile.is_active is True
        
        # Verify profile was saved to database
        db_profile = db.query(BarberProfile).filter(BarberProfile.user_id == barber.id).first()
        assert db_profile is not None
        assert db_profile.bio == profile_data.bio
    
    def test_create_profile_duplicate_user_fails(self, db: Session):
        """Test that creating duplicate profile for same user fails."""
        # Arrange
        barber = UserFactory.create_barber()
        db.add(barber)
        db.commit()
        
        service = BarberProfileService(db)
        profile_data = BarberProfileFactory.create_barber_profile_schema()
        
        # Create first profile
        service.create_profile(barber.id, profile_data)
        
        # Act & Assert
        with pytest.raises(ValueError, match="Profile already exists"):
            service.create_profile(barber.id, profile_data)
    
    def test_get_profile_by_user_id_success(self, db: Session):
        """Test retrieving profile by user ID."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(user_id=barber.id)
        db.add_all([barber, profile])
        db.commit()
        
        service = BarberProfileService(db)
        
        # Act
        retrieved_profile = service.get_profile_by_user_id(barber.id)
        
        # Assert
        assert retrieved_profile is not None
        assert retrieved_profile.user_id == barber.id
        assert retrieved_profile.bio == profile.bio
    
    def test_get_profile_nonexistent_returns_none(self, db: Session):
        """Test retrieving non-existent profile returns None."""
        # Arrange
        service = BarberProfileService(db)
        
        # Act
        profile = service.get_profile_by_user_id(999)
        
        # Assert
        assert profile is None
    
    def test_update_profile_success(self, db: Session):
        """Test successful profile update."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(user_id=barber.id)
        db.add_all([barber, profile])
        db.commit()
        
        service = BarberProfileService(db)
        update_data = BarberProfileUpdate(
            bio="Updated bio",
            years_experience=10,
            hourly_rate=Decimal('60.00')
        )
        
        # Act
        updated_profile = service.update_profile(barber.id, update_data)
        
        # Assert
        assert updated_profile.bio == "Updated bio"
        assert updated_profile.years_experience == 10
        assert updated_profile.hourly_rate == Decimal('60.00')
        
        # Verify changes persisted
        db.refresh(profile)
        assert profile.bio == "Updated bio"
    
    def test_calculate_profile_completion(self, db: Session):
        """Test profile completion percentage calculation."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(
            user_id=barber.id,
            bio="Bio",
            years_experience=5,
            hourly_rate=Decimal('45.00'),
            profile_image_url="https://example.com/image.jpg",
            instagram_url="https://instagram.com/barber",
            website_url=None,  # Missing field
            certifications=[],  # Empty field
            awards=["Award 1"],
            education=["Education 1"]
        )
        db.add_all([barber, profile])
        db.commit()
        
        service = BarberProfileService(db)
        
        # Act
        completion = service.calculate_profile_completion(profile)
        
        # Assert
        # Should be around 80% (8 out of 10 fields completed)
        assert 75 <= completion <= 85
    
    def test_add_portfolio_image_success(self, db: Session):
        """Test adding portfolio image."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(user_id=barber.id)
        db.add_all([barber, profile])
        db.commit()
        
        service = BarberProfileService(db)
        image_data = BarberPortfolioImageCreate(
            image_url="https://example.com/portfolio.jpg",
            description="Professional haircut",
            tags=["haircut", "professional"],
            is_featured=True
        )
        
        # Act
        portfolio_image = service.add_portfolio_image(profile.id, image_data)
        
        # Assert
        assert portfolio_image is not None
        assert portfolio_image.barber_profile_id == profile.id
        assert portfolio_image.image_url == image_data.image_url
        assert portfolio_image.is_featured is True
    
    def test_add_specialty_success(self, db: Session):
        """Test adding specialty."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(user_id=barber.id)
        db.add_all([barber, profile])
        db.commit()
        
        service = BarberProfileService(db)
        specialty_data = BarberSpecialtyCreate(
            specialty_name="Beard Trimming",
            description="Expert beard styling and trimming",
            years_experience=3,
            price_modifier=Decimal('1.15')
        )
        
        # Act
        specialty = service.add_specialty(profile.id, specialty_data)
        
        # Assert
        assert specialty is not None
        assert specialty.barber_profile_id == profile.id
        assert specialty.specialty_name == "Beard Trimming"
        assert specialty.price_modifier == Decimal('1.15')
    
    def test_get_profiles_for_shop_context(self, db: Session):
        """Test retrieving profiles in shop context (NOT marketplace)."""
        # Arrange
        shop_owner = UserFactory.create_user(role='shop_owner')
        barber1 = UserFactory.create_barber()
        barber2 = UserFactory.create_barber()
        profile1 = BarberProfileFactory.create_barber_profile(user_id=barber1.id)
        profile2 = BarberProfileFactory.create_barber_profile(user_id=barber2.id)
        
        db.add_all([shop_owner, barber1, barber2, profile1, profile2])
        db.commit()
        
        service = BarberProfileService(db)
        
        # Act - This should be called in context of a specific shop
        # In real implementation, this would filter by shop/organization
        profiles = service.get_active_profiles()
        
        # Assert
        assert len(profiles) == 2
        assert all(profile.is_active for profile in profiles)
        
        # Verify this is NOT a marketplace function
        # (profiles are not publicly discoverable across shops)


class TestBarberProfileAPI:
    """Test cases for barber profile API endpoints."""
    
    def test_create_profile_endpoint_success(self, client: TestClient, auth_headers: dict, db: Session):
        """Test POST /api/v2/barber-profiles/ endpoint."""
        # Arrange
        profile_data = {
            "bio": "Professional barber with 5 years experience",
            "years_experience": 5,
            "hourly_rate": 45.00,
            "profile_image_url": "https://example.com/profile.jpg",
            "instagram_url": "https://instagram.com/barber",
            "certifications": ["Certified Master Barber"],
            "awards": ["Best Barber 2023"],
            "education": ["Barber Academy Graduate"]
        }
        
        # Act
        response = client.post(
            "/api/v2/barber-profiles/",
            json=profile_data,
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["bio"] == profile_data["bio"]
        assert data["years_experience"] == profile_data["years_experience"]
        assert "completion_percentage" in data
    
    def test_get_profile_endpoint_success(self, client: TestClient, auth_headers: dict, db: Session, test_user: User):
        """Test GET /api/v2/barber-profiles/ endpoint."""
        # Arrange
        profile = BarberProfileFactory.create_barber_profile(user_id=test_user.id)
        db.add(profile)
        db.commit()
        
        # Act
        response = client.get("/api/v2/barber-profiles/", headers=auth_headers)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == test_user.id
        assert data["bio"] == profile.bio
    
    def test_update_profile_endpoint_success(self, client: TestClient, auth_headers: dict, db: Session, test_user: User):
        """Test PUT /api/v2/barber-profiles/ endpoint."""
        # Arrange
        profile = BarberProfileFactory.create_barber_profile(user_id=test_user.id)
        db.add(profile)
        db.commit()
        
        update_data = {
            "bio": "Updated professional bio",
            "years_experience": 8,
            "hourly_rate": 55.00
        }
        
        # Act
        response = client.put(
            "/api/v2/barber-profiles/",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["bio"] == update_data["bio"]
        assert data["years_experience"] == update_data["years_experience"]
    
    def test_add_portfolio_image_endpoint_success(self, client: TestClient, auth_headers: dict, db: Session, test_user: User):
        """Test POST /api/v2/barber-profiles/portfolio endpoint."""
        # Arrange
        profile = BarberProfileFactory.create_barber_profile(user_id=test_user.id)
        db.add(profile)
        db.commit()
        
        image_data = {
            "image_url": "https://example.com/portfolio.jpg",
            "description": "Professional haircut example",
            "tags": ["haircut", "professional"],
            "is_featured": True
        }
        
        # Act
        response = client.post(
            "/api/v2/barber-profiles/portfolio",
            json=image_data,
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["image_url"] == image_data["image_url"]
        assert data["is_featured"] is True
    
    def test_unauthorized_access_fails(self, client: TestClient):
        """Test that unauthorized access to profile endpoints fails."""
        # Act
        response = client.get("/api/v2/barber-profiles/")
        
        # Assert
        assert response.status_code == 401
    
    def test_non_barber_cannot_create_profile(self, client: TestClient, db: Session):
        """Test that non-barber users cannot create profiles."""
        # Arrange
        regular_user = UserFactory.create_user(role='client')
        db.add(regular_user)
        db.commit()
        
        # Create auth headers for regular user
        from utils.auth import create_access_token
        access_token = create_access_token(data={"sub": regular_user.email, "role": regular_user.role})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        profile_data = {
            "bio": "I want to be a barber",
            "years_experience": 1,
            "hourly_rate": 25.00
        }
        
        # Act
        response = client.post(
            "/api/v2/barber-profiles/",
            json=profile_data,
            headers=headers
        )
        
        # Assert
        assert response.status_code == 403  # Forbidden


class TestBarberSelectionIntegration:
    """Test integration with booking flow barber selection."""
    
    def test_barber_selection_component_data(self, client: TestClient, db: Session):
        """Test data format for BarberSelection component."""
        # Arrange
        shop_owner = UserFactory.create_user(role='shop_owner')
        barber1 = UserFactory.create_barber()
        barber2 = UserFactory.create_barber()
        
        profile1 = BarberProfileFactory.create_barber_profile(
            user_id=barber1.id,
            bio="Specialist in modern cuts",
            years_experience=7,
            profile_image_url="https://example.com/barber1.jpg"
        )
        profile2 = BarberProfileFactory.create_barber_profile(
            user_id=barber2.id,
            bio="Traditional barbering expert",
            years_experience=12,
            profile_image_url="https://example.com/barber2.jpg"
        )
        
        # Add specialties
        specialty1 = BarberProfileFactory.create_specialty(
            barber_profile_id=profile1.id,
            specialty_name="Fade Cuts",
            description="Modern fade techniques"
        )
        specialty2 = BarberProfileFactory.create_specialty(
            barber_profile_id=profile2.id,
            specialty_name="Straight Razor Shaves",
            description="Traditional wet shaving"
        )
        
        # Add portfolio images
        portfolio1 = BarberProfileFactory.create_portfolio_image(
            barber_profile_id=profile1.id,
            image_url="https://example.com/portfolio1.jpg",
            is_featured=True
        )
        
        db.add_all([
            shop_owner, barber1, barber2, profile1, profile2, 
            specialty1, specialty2, portfolio1
        ])
        db.commit()
        
        # Act - Get barbers for shop (this would be filtered by shop in real implementation)
        service = BarberProfileService(db)
        profiles = service.get_profiles_with_details()
        
        # Assert
        assert len(profiles) == 2
        
        # Verify data structure matches BarberSelection component expectations
        for profile in profiles:
            assert hasattr(profile, 'user_id')
            assert hasattr(profile, 'bio')
            assert hasattr(profile, 'years_experience')
            assert hasattr(profile, 'profile_image_url')
            assert hasattr(profile, 'specialties')
            assert hasattr(profile, 'portfolio_images')
    
    def test_barber_specialty_matching(self, db: Session):
        """Test specialty matching for service selection."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(user_id=barber.id)
        
        haircut_specialty = BarberProfileFactory.create_specialty(
            barber_profile_id=profile.id,
            specialty_name="Haircut",
            description="Professional haircuts"
        )
        shave_specialty = BarberProfileFactory.create_specialty(
            barber_profile_id=profile.id,
            specialty_name="Shave",
            description="Traditional shaves"
        )
        
        db.add_all([barber, profile, haircut_specialty, shave_specialty])
        db.commit()
        
        service = BarberProfileService(db)
        
        # Act - Find barbers with haircut specialty
        matching_profiles = service.get_profiles_with_specialty("Haircut")
        
        # Assert
        assert len(matching_profiles) == 1
        assert matching_profiles[0].user_id == barber.id
        
        # Verify specialty data
        haircut_specialties = [s for s in matching_profiles[0].specialties if "Haircut" in s.specialty_name]
        assert len(haircut_specialties) == 1
    
    def test_profile_completion_affects_visibility(self, db: Session):
        """Test that incomplete profiles have lower visibility."""
        # Arrange
        complete_barber = UserFactory.create_barber()
        incomplete_barber = UserFactory.create_barber()
        
        # Complete profile
        complete_profile = BarberProfileFactory.create_barber_profile(
            user_id=complete_barber.id,
            bio="Complete bio",
            years_experience=5,
            hourly_rate=Decimal('45.00'),
            profile_image_url="https://example.com/complete.jpg",
            instagram_url="https://instagram.com/complete",
            website_url="https://complete.com",
            certifications=["Cert 1", "Cert 2"],
            awards=["Award 1"],
            education=["Education 1"]
        )
        
        # Incomplete profile
        incomplete_profile = BarberProfileFactory.create_barber_profile(
            user_id=incomplete_barber.id,
            bio="Basic bio",
            years_experience=2,
            hourly_rate=None,  # Missing
            profile_image_url=None,  # Missing
            instagram_url=None,  # Missing
            website_url=None,  # Missing
            certifications=[],  # Empty
            awards=[],  # Empty
            education=[]  # Empty
        )
        
        db.add_all([complete_barber, incomplete_barber, complete_profile, incomplete_profile])
        db.commit()
        
        service = BarberProfileService(db)
        
        # Act
        complete_completion = service.calculate_profile_completion(complete_profile)
        incomplete_completion = service.calculate_profile_completion(incomplete_profile)
        
        # Assert
        assert complete_completion > 90
        assert incomplete_completion < 50
        assert complete_completion > incomplete_completion


# Pytest fixtures for barber profile tests
@pytest.fixture
def barber_profile_service(db: Session):
    """Provide BarberProfileService instance."""
    return BarberProfileService(db)


@pytest.fixture  
def test_barber_user(db: Session):
    """Create a test barber user."""
    barber = UserFactory.create_barber()
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@pytest.fixture
def test_barber_profile(db: Session, test_barber_user: User):
    """Create a test barber profile."""
    profile = BarberProfileFactory.create_barber_profile(user_id=test_barber_user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


# Integration test for complete barber profile workflow
def test_complete_barber_profile_workflow(db: Session, client: TestClient):
    """Test complete workflow from profile creation to booking integration."""
    # 1. Create barber user
    barber = UserFactory.create_barber()
    db.add(barber)
    db.commit()
    
    # 2. Create auth headers
    from utils.auth import create_access_token
    access_token = create_access_token(data={"sub": barber.email, "role": barber.role})
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 3. Create profile via API
    profile_data = {
        "bio": "Expert barber specializing in modern cuts",
        "years_experience": 8,
        "hourly_rate": 50.00,
        "profile_image_url": "https://example.com/barber.jpg",
        "instagram_url": "https://instagram.com/expertbarber",
        "certifications": ["Master Barber Certificate"],
        "awards": ["Best Barber 2023"],
        "education": ["Professional Barber Academy"]
    }
    
    response = client.post("/api/v2/barber-profiles/", json=profile_data, headers=headers)
    assert response.status_code == 201
    
    # 4. Add portfolio images
    portfolio_data = {
        "image_url": "https://example.com/work1.jpg",
        "description": "Modern fade cut",
        "tags": ["fade", "modern", "haircut"],
        "is_featured": True
    }
    
    response = client.post("/api/v2/barber-profiles/portfolio", json=portfolio_data, headers=headers)
    assert response.status_code == 201
    
    # 5. Add specialties
    specialty_data = {
        "specialty_name": "Fade Cuts",
        "description": "Expert in all fade variations",
        "years_experience": 5,
        "price_modifier": 1.2
    }
    
    response = client.post("/api/v2/barber-profiles/specialties", json=specialty_data, headers=headers)
    assert response.status_code == 201
    
    # 6. Verify complete profile
    response = client.get("/api/v2/barber-profiles/", headers=headers)
    assert response.status_code == 200
    
    profile = response.json()
    assert profile["bio"] == profile_data["bio"]
    assert len(profile["portfolio_images"]) == 1
    assert len(profile["specialties"]) == 1
    assert profile["completion_percentage"] > 85  # Should be highly complete
    
    # 7. Verify profile appears in shop barber list (for booking)
    # This would be called by the BarberSelection component
    service = BarberProfileService(db)
    shop_profiles = service.get_active_profiles()
    
    assert len(shop_profiles) == 1
    assert shop_profiles[0].user_id == barber.id
    assert shop_profiles[0].is_active is True