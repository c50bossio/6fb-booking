"""
Comprehensive test suite for Barber Profile System

This test suite covers all aspects of the barber profile enhancement:
- CRUD operations for barber profiles
- Image upload functionality  
- Authentication and authorization
- Service layer business logic
- Integration with user management
- Error handling and validation
"""

import pytest
import asyncio
import tempfile
import json
from io import BytesIO
from PIL import Image
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from httpx import AsyncClient
from fastapi import UploadFile
from sqlalchemy.orm import Session

# Import app components
from main import app
import models
import schemas
from services.barber_profile_service import barber_profile_service
from utils.auth import create_access_token


@pytest.fixture(scope="function")
def test_barber(db: Session) -> models.User:
    """Create a test barber user"""
    from utils.auth import get_password_hash
    barber = models.User(
        email="barber@example.com",
        name="Test Barber",
        hashed_password=get_password_hash("barberpass123"),
        role="barber",
        is_active=True
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@pytest.fixture(scope="function")
def test_shop_owner(db: Session) -> models.User:
    """Create a test shop owner user"""
    from utils.auth import get_password_hash
    owner = models.User(
        email="owner@example.com",
        name="Shop Owner",
        hashed_password=get_password_hash("ownerpass123"),
        role="shop_owner",
        is_active=True
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


@pytest.fixture(scope="function")
def barber_auth_headers(test_barber: models.User) -> dict:
    """Get authentication headers for barber user"""
    access_token = create_access_token(
        data={"sub": test_barber.email, "role": test_barber.role}
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(scope="function")
def owner_auth_headers(test_shop_owner: models.User) -> dict:
    """Get authentication headers for shop owner"""
    access_token = create_access_token(
        data={"sub": test_shop_owner.email, "role": test_shop_owner.role}
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(scope="function")
def sample_profile_data() -> dict:
    """Sample barber profile data for testing"""
    return {
        "bio": "Experienced barber with 10 years in the industry",
        "years_experience": 10,
        "instagram_handle": "testbarber",
        "website_url": "https://www.testbarber.com",
        "specialties": ["beard trimming", "hair styling", "fades"],
        "certifications": ["State Barber License", "Advanced Cutting Certification"],
        "hourly_rate": 75.00,
        "is_active": True
    }


@pytest.fixture(scope="function")
def test_image():
    """Create a test image for upload tests"""
    # Create a simple test image
    img = Image.new('RGB', (200, 200), color='red')
    img_bytes = BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    # Create UploadFile object
    return UploadFile(
        filename="test_profile.jpg",
        file=img_bytes,
        content_type="image/jpeg"
    )


class TestBarberProfileAPI:
    """Test suite for Barber Profile API endpoints"""
    
    @pytest.mark.asyncio
    async def test_create_barber_profile_success(
        self, async_client: AsyncClient, barber_auth_headers: dict, sample_profile_data: dict
    ):
        """Test successful barber profile creation"""
        response = await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["bio"] == sample_profile_data["bio"]
        assert data["years_experience"] == sample_profile_data["years_experience"]
        assert data["instagram_handle"] == sample_profile_data["instagram_handle"]
        assert data["specialties"] == sample_profile_data["specialties"]
        assert data["hourly_rate"] == sample_profile_data["hourly_rate"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_create_profile_removes_instagram_at_symbol(
        self, async_client: AsyncClient, barber_auth_headers: dict, sample_profile_data: dict
    ):
        """Test that @ symbol is automatically removed from Instagram handle"""
        sample_profile_data["instagram_handle"] = "@testbarber"
        
        response = await async_client.post(
            "/barbers/profiles", 
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["instagram_handle"] == "testbarber"  # @ should be removed

    @pytest.mark.asyncio
    async def test_create_profile_unauthorized(
        self, async_client: AsyncClient, sample_profile_data: dict
    ):
        """Test profile creation without authentication"""
        response = await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data
        )
        
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_profile_duplicate_fails(
        self, async_client: AsyncClient, barber_auth_headers: dict, 
        sample_profile_data: dict, db: Session, test_barber: models.User
    ):
        """Test that creating duplicate profile fails"""
        # Create first profile
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Attempt to create second profile should fail
        response = await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_barber_profile_success(
        self, async_client: AsyncClient, barber_auth_headers: dict, 
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test successful retrieval of barber profile"""
        # First create a profile
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Then retrieve it
        response = await async_client.get(
            f"/barbers/{test_barber.id}/profile",
            headers=barber_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["bio"] == sample_profile_data["bio"]
        assert data["user_name"] == test_barber.name
        assert data["user_email"] == test_barber.email

    @pytest.mark.asyncio
    async def test_get_nonexistent_profile(
        self, async_client: AsyncClient, barber_auth_headers: dict, test_barber: models.User
    ):
        """Test getting a profile that doesn't exist"""
        response = await async_client.get(
            f"/barbers/{test_barber.id}/profile",
            headers=barber_auth_headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_update_barber_profile_success(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test successful profile update"""
        # Create profile first
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Update profile
        update_data = {
            "bio": "Updated bio with new information",
            "years_experience": 12,
            "hourly_rate": 85.00
        }
        
        response = await async_client.put(
            f"/barbers/{test_barber.id}/profile",
            json=update_data,
            headers=barber_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["bio"] == update_data["bio"]
        assert data["years_experience"] == update_data["years_experience"]
        assert data["hourly_rate"] == update_data["hourly_rate"]

    @pytest.mark.asyncio
    async def test_update_profile_unauthorized_user(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User, test_user: models.User, auth_headers: dict
    ):
        """Test that users cannot update other users' profiles"""
        # Create profile as barber
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Try to update as different user
        update_data = {"bio": "Unauthorized update attempt"}
        
        response = await async_client.put(
            f"/barbers/{test_barber.id}/profile",
            json=update_data,
            headers=auth_headers  # Different user's headers
        )
        
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_update_any_profile(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User, admin_auth_headers: dict
    ):
        """Test that admin users can update any profile"""
        # Create profile as barber
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Update as admin
        update_data = {"bio": "Admin updated this profile"}
        
        response = await async_client.put(
            f"/barbers/{test_barber.id}/profile",
            json=update_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["bio"] == update_data["bio"]

    @pytest.mark.asyncio
    async def test_delete_barber_profile_success(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test successful profile deletion (soft delete)"""
        # Create profile first
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Delete profile
        response = await async_client.delete(
            f"/barbers/{test_barber.id}/profile",
            headers=barber_auth_headers
        )
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

    @pytest.mark.asyncio
    async def test_list_barber_profiles_success(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict
    ):
        """Test listing barber profiles with pagination"""
        # Create a profile first
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # List profiles
        response = await async_client.get(
            "/barbers/profiles",
            headers=barber_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "profiles" in data
        assert "total" in data
        assert len(data["profiles"]) > 0

    @pytest.mark.asyncio
    async def test_list_profiles_with_filters(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict
    ):
        """Test listing profiles with various filters"""
        # Create a profile
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Test search filter
        response = await async_client.get(
            "/barbers/profiles?search=experienced",
            headers=barber_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["profiles"]) > 0

    @pytest.mark.asyncio
    async def test_get_profile_stats_admin_only(
        self, async_client: AsyncClient, admin_auth_headers: dict, barber_auth_headers: dict
    ):
        """Test profile statistics endpoint (admin only)"""
        # Test admin access
        response = await async_client.get(
            "/barbers/profiles/stats",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "active" in data
        assert "inactive" in data
        
        # Test non-admin access
        response = await async_client.get(
            "/barbers/profiles/stats",
            headers=barber_auth_headers
        )
        
        assert response.status_code == 403


class TestBarberProfileImageUpload:
    """Test suite for image upload functionality"""
    
    @pytest.mark.asyncio
    async def test_upload_profile_image_success(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test successful image upload"""
        # Create profile first
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Create test image
        img = Image.new('RGB', (200, 200), color='red')
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {"image": ("test.jpg", img_bytes, "image/jpeg")}
        
        with patch('services.barber_profile_service.BarberProfileService._process_and_save_image') as mock_save:
            mock_save.return_value = "/uploads/test_image.jpg"
            
            response = await async_client.post(
                f"/barbers/{test_barber.id}/profile/image",
                files=files,
                headers=barber_auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "uploaded successfully" in data["message"]

    @pytest.mark.asyncio
    async def test_upload_invalid_file_type(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test upload with invalid file type"""
        # Create profile first
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Create text file instead of image
        text_content = BytesIO(b"This is not an image")
        files = {"image": ("test.txt", text_content, "text/plain")}
        
        response = await async_client.post(
            f"/barbers/{test_barber.id}/profile/image",
            files=files,
            headers=barber_auth_headers
        )
        
        assert response.status_code == 400
        assert "Invalid image type" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_oversized_image(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test upload with oversized image"""
        # Create profile first
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Create large fake file
        large_content = BytesIO(b"0" * (6 * 1024 * 1024))  # 6MB
        files = {"image": ("large.jpg", large_content, "image/jpeg")}
        
        response = await async_client.post(
            f"/barbers/{test_barber.id}/profile/image",
            files=files,
            headers=barber_auth_headers
        )
        
        assert response.status_code == 400
        assert "too large" in response.json()["detail"]


class TestBarberProfileService:
    """Test suite for BarberProfileService business logic"""
    
    def test_create_profile_success(
        self, db: Session, test_barber: models.User, sample_profile_data: dict
    ):
        """Test service layer profile creation"""
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        
        profile = barber_profile_service.create_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=profile_schema
        )
        
        assert profile.user_id == test_barber.id
        assert profile.bio == sample_profile_data["bio"]
        assert profile.years_experience == sample_profile_data["years_experience"]
        assert profile.id is not None

    def test_create_profile_non_barber_user_fails(
        self, db: Session, test_user: models.User, sample_profile_data: dict
    ):
        """Test that non-barber users cannot create profiles"""
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        
        with pytest.raises(Exception) as exc_info:
            barber_profile_service.create_profile(
                db=db,
                user_id=test_user.id,
                profile_data=profile_schema
            )
        
        assert "barber role" in str(exc_info.value)

    def test_get_profile_by_user_id(
        self, db: Session, test_barber: models.User, sample_profile_data: dict
    ):
        """Test retrieving profile by user ID"""
        # Create profile first
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        created_profile = barber_profile_service.create_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=profile_schema
        )
        
        # Retrieve profile
        retrieved_profile = barber_profile_service.get_profile_by_user_id(
            db=db,
            user_id=test_barber.id
        )
        
        assert retrieved_profile is not None
        assert retrieved_profile.id == created_profile.id
        assert retrieved_profile.bio == sample_profile_data["bio"]

    def test_update_profile_success(
        self, db: Session, test_barber: models.User, sample_profile_data: dict
    ):
        """Test service layer profile update"""
        # Create profile first
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        profile = barber_profile_service.create_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=profile_schema
        )
        
        # Update profile
        update_data = schemas.BarberProfileUpdate(
            bio="Updated bio text",
            hourly_rate=100.0
        )
        
        updated_profile = barber_profile_service.update_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=update_data,
            current_user=test_barber
        )
        
        assert updated_profile.bio == "Updated bio text"
        assert updated_profile.hourly_rate == 100.0

    def test_delete_profile_soft_delete(
        self, db: Session, test_barber: models.User, sample_profile_data: dict
    ):
        """Test service layer profile deletion (soft delete)"""
        # Create profile first
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        profile = barber_profile_service.create_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=profile_schema
        )
        
        # Delete profile
        success = barber_profile_service.delete_profile(
            db=db,
            user_id=test_barber.id,
            current_user=test_barber
        )
        
        assert success is True
        
        # Verify soft delete
        db.refresh(profile)
        assert profile.is_active is False

    def test_list_profiles_with_pagination(
        self, db: Session, test_barber: models.User, sample_profile_data: dict
    ):
        """Test service layer profile listing with pagination"""
        # Create a profile
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        barber_profile_service.create_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=profile_schema
        )
        
        # List profiles
        profiles, total = barber_profile_service.list_profiles(
            db=db,
            skip=0,
            limit=10
        )
        
        assert total > 0
        assert len(profiles) > 0
        assert profiles[0].bio == sample_profile_data["bio"]

    def test_profile_stats_calculation(
        self, db: Session, test_barber: models.User, sample_profile_data: dict
    ):
        """Test profile statistics calculation"""
        # Create active profile
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        profile = barber_profile_service.create_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=profile_schema
        )
        
        # Get stats
        stats = barber_profile_service.get_profile_stats(db)
        
        assert stats["total"] > 0
        assert stats["active"] > 0
        assert stats["complete"] > 0  # Profile has bio, experience, and specialties

    def test_instagram_handle_cleaning(
        self, db: Session, test_barber: models.User, sample_profile_data: dict
    ):
        """Test that Instagram handles are cleaned (@ symbol removed)"""
        sample_profile_data["instagram_handle"] = "@testhandle"
        profile_schema = schemas.BarberProfileCreate(**sample_profile_data)
        
        profile = barber_profile_service.create_profile(
            db=db,
            user_id=test_barber.id,
            profile_data=profile_schema
        )
        
        assert profile.instagram_handle == "testhandle"  # @ should be removed


class TestBarberProfileValidation:
    """Test suite for profile data validation"""
    
    def test_bio_length_validation(self):
        """Test bio field length limits"""
        # Test valid bio
        valid_data = {"bio": "Short bio"}
        schema = schemas.BarberProfileCreate(**valid_data)
        assert schema.bio == "Short bio"
        
        # Test bio too long
        long_bio = "x" * 2001  # Over the 2000 char limit
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(bio=long_bio)

    def test_years_experience_validation(self):
        """Test years of experience validation"""
        # Valid experience
        valid_data = {"years_experience": 10}
        schema = schemas.BarberProfileCreate(**valid_data)
        assert schema.years_experience == 10
        
        # Invalid negative experience
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(years_experience=-1)
        
        # Invalid excessive experience
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(years_experience=51)

    def test_instagram_handle_validation(self):
        """Test Instagram handle validation"""
        # Valid handle
        valid_data = {"instagram_handle": "testbarber"}
        schema = schemas.BarberProfileCreate(**valid_data)
        assert schema.instagram_handle == "testbarber"
        
        # Valid handle with @ (should be cleaned)
        valid_data = {"instagram_handle": "@testbarber"}
        schema = schemas.BarberProfileCreate(**valid_data)
        assert schema.instagram_handle == "testbarber"
        
        # Invalid characters
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(instagram_handle="test@barber")

    def test_website_url_validation(self):
        """Test website URL validation"""
        # Valid URLs
        valid_urls = [
            "https://www.example.com",
            "http://example.com",
            "https://subdomain.example.com/path"
        ]
        
        for url in valid_urls:
            schema = schemas.BarberProfileCreate(website_url=url)
            assert schema.website_url == url
        
        # Invalid URL
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(website_url="not-a-url")

    def test_specialties_validation(self):
        """Test specialties list validation"""
        # Valid specialties
        valid_specialties = ["beard trimming", "hair styling"]
        schema = schemas.BarberProfileCreate(specialties=valid_specialties)
        assert schema.specialties == valid_specialties
        
        # Too many specialties
        too_many = ["specialty"] * 21
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(specialties=too_many)
        
        # Duplicate specialties
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(specialties=["same", "same"])

    def test_hourly_rate_validation(self):
        """Test hourly rate validation"""
        # Valid rate
        schema = schemas.BarberProfileCreate(hourly_rate=75.50)
        assert schema.hourly_rate == 75.50
        
        # Invalid negative rate
        with pytest.raises(Exception):
            schemas.BarberProfileCreate(hourly_rate=-10.0)


class TestBarberProfileIntegration:
    """Integration tests for complete profile workflows"""
    
    @pytest.mark.asyncio
    async def test_complete_profile_lifecycle(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test complete profile lifecycle: create, read, update, delete"""
        
        # 1. Create profile
        create_response = await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        assert create_response.status_code == 200
        profile_id = create_response.json()["id"]
        
        # 2. Read profile
        read_response = await async_client.get(
            f"/barbers/{test_barber.id}/profile",
            headers=barber_auth_headers
        )
        assert read_response.status_code == 200
        assert read_response.json()["id"] == profile_id
        
        # 3. Update profile
        update_data = {"bio": "Updated biography"}
        update_response = await async_client.put(
            f"/barbers/{test_barber.id}/profile",
            json=update_data,
            headers=barber_auth_headers
        )
        assert update_response.status_code == 200
        assert update_response.json()["bio"] == "Updated biography"
        
        # 4. Delete profile
        delete_response = await async_client.delete(
            f"/barbers/{test_barber.id}/profile",
            headers=barber_auth_headers
        )
        assert delete_response.status_code == 200
        
        # 5. Verify deletion (profile should still exist but be inactive)
        final_response = await async_client.get(
            f"/barbers/{test_barber.id}/profile",
            headers=barber_auth_headers
        )
        assert final_response.status_code == 404  # Should not be found since it's inactive

    @pytest.mark.asyncio
    async def test_admin_management_workflow(
        self, async_client: AsyncClient, barber_auth_headers: dict, admin_auth_headers: dict,
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test admin user managing barber profiles"""
        
        # Admin creates profile for barber
        response = await async_client.post(
            f"/barbers/profiles?barber_id={test_barber.id}",
            json=sample_profile_data,
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        
        # Admin can view all profiles
        list_response = await async_client.get(
            "/barbers/profiles",
            headers=admin_auth_headers
        )
        assert list_response.status_code == 200
        
        # Admin can get stats
        stats_response = await async_client.get(
            "/barbers/profiles/stats",
            headers=admin_auth_headers
        )
        assert stats_response.status_code == 200


class TestBarberProfilePermissions:
    """Test suite for authorization and permissions"""
    
    @pytest.mark.asyncio
    async def test_client_role_cannot_create_profile(
        self, async_client: AsyncClient, auth_headers: dict, sample_profile_data: dict
    ):
        """Test that client role users cannot create barber profiles"""
        response = await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=auth_headers  # Regular user (client role)
        )
        
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_shop_owner_can_create_profiles(
        self, async_client: AsyncClient, owner_auth_headers: dict, 
        sample_profile_data: dict, test_barber: models.User
    ):
        """Test that shop owners can create profiles for their barbers"""
        response = await async_client.post(
            f"/barbers/profiles?barber_id={test_barber.id}",
            json=sample_profile_data,
            headers=owner_auth_headers
        )
        
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_cross_user_access_denied(
        self, async_client: AsyncClient, barber_auth_headers: dict,
        sample_profile_data: dict, test_user: models.User, auth_headers: dict
    ):
        """Test that users cannot access other users' profiles"""
        # Create profile as barber
        await async_client.post(
            "/barbers/profiles",
            json=sample_profile_data,
            headers=barber_auth_headers
        )
        
        # Try to access as different user
        response = await async_client.get(
            f"/barbers/{test_user.id}/profile",  # Wrong user ID
            headers=auth_headers
        )
        
        assert response.status_code == 403


# Utility functions for test data
def create_sample_barber_profile(db: Session, user: models.User) -> models.BarberProfile:
    """Helper function to create a barber profile for testing"""
    profile = models.BarberProfile(
        user_id=user.id,
        bio="Test barber with great skills",
        years_experience=5,
        instagram_handle="testbarber",
        specialties=["haircuts", "beard trim"],
        hourly_rate=50.0,
        is_active=True
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


if __name__ == "__main__":
    pytest.main([__file__, "-v"])