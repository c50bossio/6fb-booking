"""
Integration Tests for Barber Profile System

This test suite covers end-to-end integration testing:
- Full workflow from frontend to database
- Cross-system integration testing
- Performance under load
- Real-world usage scenarios
- Error handling across system boundaries
"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
from unittest.mock import Mock, patch
from httpx import AsyncClient
from sqlalchemy.orm import Session

# Import app components
from main import app
import models
import schemas
from services.barber_profile_service import barber_profile_service
from utils.auth import create_access_token


class TestBarberProfileEndToEndIntegration:
    """End-to-end integration tests"""
    
    @pytest.mark.asyncio
    async def test_complete_barber_onboarding_flow(
        self, async_client: AsyncClient, db: Session
    ):
        """Test complete barber onboarding: user creation → profile setup → activation"""
        
        # 1. Create barber user (simulating registration)
        from utils.auth import get_password_hash
        barber_user = models.User(
            email="newbarber@example.com",
            name="New Barber",
            hashed_password=get_password_hash("newpass123"),
            role="barber",
            is_active=True
        )
        db.add(barber_user)
        db.commit()
        db.refresh(barber_user)
        
        # 2. Authenticate user
        auth_token = create_access_token(
            data={"sub": barber_user.email, "role": barber_user.role}
        )
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # 3. Create initial profile
        profile_data = {
            "bio": "Passionate barber starting my journey",
            "years_experience": 2,
            "specialties": ["basic cuts", "beard trim"],
            "hourly_rate": 40.0
        }
        
        create_response = await async_client.post(
            "/barbers/profiles",
            json=profile_data,
            headers=headers
        )
        
        assert create_response.status_code == 200
        profile = create_response.json()
        
        # 4. Update profile with more details
        update_data = {
            "bio": "Experienced barber with passion for modern styles",
            "years_experience": 3,
            "instagram_handle": "newbarbercuts",
            "website_url": "https://newbarber.com",
            "certifications": ["State License", "Safety Certification"]
        }
        
        update_response = await async_client.put(
            f"/barbers/{barber_user.id}/profile",
            json=update_data,
            headers=headers
        )
        
        assert update_response.status_code == 200
        updated_profile = update_response.json()
        
        # 5. Verify all data was persisted correctly
        final_response = await async_client.get(
            f"/barbers/{barber_user.id}/profile",
            headers=headers
        )
        
        assert final_response.status_code == 200
        final_profile = final_response.json()
        
        assert final_profile["bio"] == update_data["bio"]
        assert final_profile["years_experience"] == update_data["years_experience"]
        assert final_profile["instagram_handle"] == update_data["instagram_handle"]
        assert final_profile["certifications"] == update_data["certifications"]
        assert final_profile["user_name"] == barber_user.name
        assert final_profile["user_email"] == barber_user.email

    @pytest.mark.asyncio
    async def test_multi_user_profile_management(
        self, async_client: AsyncClient, db: Session
    ):
        """Test managing multiple barber profiles simultaneously"""
        
        # Create multiple barber users
        barbers = []
        for i in range(3):
            from utils.auth import get_password_hash
            barber = models.User(
                email=f"barber{i}@example.com",
                name=f"Barber {i}",
                hashed_password=get_password_hash("pass123"),
                role="barber",
                is_active=True
            )
            db.add(barber)
            barbers.append(barber)
        
        db.commit()
        for barber in barbers:
            db.refresh(barber)
        
        # Create profiles for all barbers
        profiles = []
        for i, barber in enumerate(barbers):
            auth_token = create_access_token(
                data={"sub": barber.email, "role": barber.role}
            )
            headers = {"Authorization": f"Bearer {auth_token}"}
            
            profile_data = {
                "bio": f"Barber {i} biography",
                "years_experience": i + 5,
                "specialties": [f"specialty_{i}", f"skill_{i}"],
                "hourly_rate": 50.0 + (i * 10)
            }
            
            response = await async_client.post(
                "/barbers/profiles",
                json=profile_data,
                headers=headers
            )
            
            assert response.status_code == 200
            profiles.append(response.json())
        
        # Verify all profiles were created with unique data
        assert len(profiles) == 3
        for i, profile in enumerate(profiles):
            assert profile["bio"] == f"Barber {i} biography"
            assert profile["years_experience"] == i + 5
            assert profile["hourly_rate"] == 50.0 + (i * 10)

    @pytest.mark.asyncio
    async def test_admin_bulk_operations(
        self, async_client: AsyncClient, db: Session
    ):
        """Test admin performing bulk operations on barber profiles"""
        
        # Create admin user
        from utils.auth import get_password_hash
        admin_user = models.User(
            email="admin@example.com",
            name="Admin User",
            hashed_password=get_password_hash("adminpass"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        admin_token = create_access_token(
            data={"sub": admin_user.email, "role": admin_user.role}
        )
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create multiple barber users
        barber_ids = []
        for i in range(5):
            barber = models.User(
                email=f"bulkbarber{i}@example.com",
                name=f"Bulk Barber {i}",
                hashed_password=get_password_hash("pass123"),
                role="barber",
                is_active=True
            )
            db.add(barber)
            barber_ids.append(barber)
        
        db.commit()
        for barber in barber_ids:
            db.refresh(barber)
        
        # Admin creates profiles for all barbers
        created_profiles = []
        for i, barber in enumerate(barber_ids):
            profile_data = {
                "bio": f"Admin created profile {i}",
                "years_experience": i + 1,
                "specialties": ["admin_assigned"],
                "hourly_rate": 60.0
            }
            
            response = await async_client.post(
                f"/barbers/profiles?barber_id={barber.id}",
                json=profile_data,
                headers=admin_headers
            )
            
            assert response.status_code == 200
            created_profiles.append(response.json())
        
        # Admin retrieves all profiles
        list_response = await async_client.get(
            "/barbers/profiles?limit=10",
            headers=admin_headers
        )
        
        assert list_response.status_code == 200
        all_profiles = list_response.json()
        assert len(all_profiles["profiles"]) >= 5
        
        # Admin gets statistics
        stats_response = await async_client.get(
            "/barbers/profiles/stats",
            headers=admin_headers
        )
        
        assert stats_response.status_code == 200
        stats = stats_response.json()
        assert stats["total"] >= 5
        assert stats["active"] >= 5

    @pytest.mark.asyncio
    async def test_profile_search_and_filtering_integration(
        self, async_client: AsyncClient, db: Session
    ):
        """Test comprehensive search and filtering functionality"""
        
        # Create admin for access to listing endpoint
        from utils.auth import get_password_hash
        admin_user = models.User(
            email="searchadmin@example.com",
            name="Search Admin",
            hashed_password=get_password_hash("adminpass"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        admin_token = create_access_token(
            data={"sub": admin_user.email, "role": admin_user.role}
        )
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create diverse barber profiles for testing
        test_profiles = [
            {
                "name": "Expert Barber",
                "email": "expert@example.com",
                "profile": {
                    "bio": "Master barber with classical training",
                    "years_experience": 15,
                    "specialties": ["classical cuts", "straight razor", "beard styling"],
                    "hourly_rate": 100.0
                }
            },
            {
                "name": "Modern Stylist", 
                "email": "modern@example.com",
                "profile": {
                    "bio": "Contemporary hair artist specializing in modern trends",
                    "years_experience": 8,
                    "specialties": ["modern cuts", "color", "styling"],
                    "hourly_rate": 75.0
                }
            },
            {
                "name": "Budget Friendly",
                "email": "budget@example.com", 
                "profile": {
                    "bio": "Affordable quality cuts for everyone",
                    "years_experience": 3,
                    "specialties": ["basic cuts", "trims"],
                    "hourly_rate": 35.0
                }
            }
        ]
        
        # Create users and profiles
        created_users = []
        for profile_data in test_profiles:
            user = models.User(
                email=profile_data["email"],
                name=profile_data["name"],
                hashed_password=get_password_hash("pass123"),
                role="barber",
                is_active=True
            )
            db.add(user)
            created_users.append(user)
        
        db.commit()
        for user in created_users:
            db.refresh(user)
        
        # Create profiles
        for i, user in enumerate(created_users):
            response = await async_client.post(
                f"/barbers/profiles?barber_id={user.id}",
                json=test_profiles[i]["profile"],
                headers=admin_headers
            )
            assert response.status_code == 200
        
        # Test various search scenarios
        
        # 1. Search by bio content
        search_response = await async_client.get(
            "/barbers/profiles?search=master",
            headers=admin_headers
        )
        assert search_response.status_code == 200
        results = search_response.json()
        assert len(results["profiles"]) >= 1
        assert any("master" in p.get("bio", "").lower() for p in results["profiles"])
        
        # 2. Filter by experience level
        exp_response = await async_client.get(
            "/barbers/profiles?min_experience=10",
            headers=admin_headers
        )
        assert exp_response.status_code == 200
        exp_results = exp_response.json()
        assert all(p.get("years_experience", 0) >= 10 for p in exp_results["profiles"])
        
        # 3. Filter by price range
        price_response = await async_client.get(
            "/barbers/profiles?max_hourly_rate=50",
            headers=admin_headers
        )
        assert price_response.status_code == 200
        price_results = price_response.json()
        assert all(p.get("hourly_rate", 0) <= 50 for p in price_results["profiles"])
        
        # 4. Filter by specialty
        specialty_response = await async_client.get(
            "/barbers/profiles?specialties=modern cuts",
            headers=admin_headers
        )
        assert specialty_response.status_code == 200
        specialty_results = specialty_response.json()
        # Should find the modern stylist

    @pytest.mark.asyncio
    async def test_concurrent_profile_operations(
        self, async_client: AsyncClient, db: Session
    ):
        """Test system behavior under concurrent operations"""
        
        # Create test barber
        from utils.auth import get_password_hash
        barber_user = models.User(
            email="concurrent@example.com",
            name="Concurrent Test Barber",
            hashed_password=get_password_hash("pass123"),
            role="barber",
            is_active=True
        )
        db.add(barber_user)
        db.commit()
        db.refresh(barber_user)
        
        auth_token = create_access_token(
            data={"sub": barber_user.email, "role": barber_user.role}
        )
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create initial profile
        initial_data = {
            "bio": "Initial bio",
            "years_experience": 5,
            "hourly_rate": 50.0
        }
        
        create_response = await async_client.post(
            "/barbers/profiles",
            json=initial_data,
            headers=headers
        )
        assert create_response.status_code == 200
        
        # Simulate concurrent updates
        async def update_profile(update_data: dict, expected_status: int = 200):
            response = await async_client.put(
                f"/barbers/{barber_user.id}/profile",
                json=update_data,
                headers=headers
            )
            return response.status_code == expected_status
        
        # Run multiple concurrent updates
        update_tasks = [
            update_profile({"bio": "Updated bio 1", "hourly_rate": 60.0}),
            update_profile({"years_experience": 6}),
            update_profile({"specialties": ["cut", "style"]}),
        ]
        
        results = await asyncio.gather(*update_tasks, return_exceptions=True)
        
        # At least some updates should succeed
        success_count = sum(1 for result in results if result is True)
        assert success_count > 0, "At least one concurrent update should succeed"
        
        # Verify final state is consistent
        final_response = await async_client.get(
            f"/barbers/{barber_user.id}/profile",
            headers=headers
        )
        assert final_response.status_code == 200

    @pytest.mark.asyncio
    async def test_error_handling_across_system_layers(
        self, async_client: AsyncClient, db: Session
    ):
        """Test error handling propagation through all system layers"""
        
        # Create test barber
        from utils.auth import get_password_hash
        barber_user = models.User(
            email="errortest@example.com",
            name="Error Test Barber",
            hashed_password=get_password_hash("pass123"),
            role="barber",
            is_active=True
        )
        db.add(barber_user)
        db.commit()
        db.refresh(barber_user)
        
        auth_token = create_access_token(
            data={"sub": barber_user.email, "role": barber_user.role}
        )
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test validation errors
        invalid_data = {
            "bio": "x" * 2001,  # Too long
            "years_experience": -1,  # Invalid
            "hourly_rate": -50.0,  # Invalid
            "instagram_handle": "invalid@handle",  # Invalid characters
            "website_url": "not-a-url"  # Invalid URL
        }
        
        response = await async_client.post(
            "/barbers/profiles",
            json=invalid_data,
            headers=headers
        )
        
        assert response.status_code == 422  # Validation error
        error_detail = response.json()["detail"]
        assert isinstance(error_detail, list)
        assert len(error_detail) > 0  # Should have validation errors
        
        # Test authorization errors
        other_user_token = create_access_token(
            data={"sub": "other@example.com", "role": "user"}
        )
        other_headers = {"Authorization": f"Bearer {other_user_token}"}
        
        unauthorized_response = await async_client.post(
            "/barbers/profiles",
            json={"bio": "Should not work"},
            headers=other_headers
        )
        
        assert unauthorized_response.status_code in [401, 403]
        
        # Test not found errors
        nonexistent_response = await async_client.get(
            "/barbers/99999/profile",
            headers=headers
        )
        
        assert nonexistent_response.status_code == 404

    @pytest.mark.asyncio
    async def test_performance_under_load(
        self, async_client: AsyncClient, db: Session
    ):
        """Test system performance under simulated load"""
        
        # Create admin for bulk operations
        from utils.auth import get_password_hash
        admin_user = models.User(
            email="loadtest@example.com",
            name="Load Test Admin",
            hashed_password=get_password_hash("adminpass"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        admin_token = create_access_token(
            data={"sub": admin_user.email, "role": admin_user.role}
        )
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create multiple barbers for load testing
        barber_ids = []
        for i in range(10):  # Reduced for test performance
            barber = models.User(
                email=f"loadbarber{i}@example.com",
                name=f"Load Barber {i}",
                hashed_password=get_password_hash("pass123"),
                role="barber",
                is_active=True
            )
            db.add(barber)
            barber_ids.append(barber)
        
        db.commit()
        for barber in barber_ids:
            db.refresh(barber)
        
        # Measure profile creation time
        start_time = time.time()
        
        create_tasks = []
        for i, barber in enumerate(barber_ids):
            profile_data = {
                "bio": f"Load test profile {i}",
                "years_experience": i + 1,
                "specialties": [f"skill_{i}"],
                "hourly_rate": 50.0 + i
            }
            
            task = async_client.post(
                f"/barbers/profiles?barber_id={barber.id}",
                json=profile_data,
                headers=admin_headers
            )
            create_tasks.append(task)
        
        responses = await asyncio.gather(*create_tasks)
        creation_time = time.time() - start_time
        
        # Verify all creations succeeded
        assert all(r.status_code == 200 for r in responses)
        
        # Measure list operation time
        list_start = time.time()
        list_response = await async_client.get(
            "/barbers/profiles?limit=50",
            headers=admin_headers
        )
        list_time = time.time() - list_start
        
        assert list_response.status_code == 200
        
        # Performance assertions (adjust thresholds as needed)
        assert creation_time < 10.0, f"Profile creation took too long: {creation_time}s"
        assert list_time < 2.0, f"Profile listing took too long: {list_time}s"
        
        # Verify data integrity after load test
        profiles = list_response.json()
        assert len(profiles["profiles"]) >= 10
        assert profiles["total"] >= 10


class TestBarberProfileDataConsistency:
    """Test data consistency across system operations"""
    
    @pytest.mark.asyncio
    async def test_profile_user_relationship_consistency(
        self, async_client: AsyncClient, db: Session
    ):
        """Test that profile-user relationships remain consistent"""
        
        # Create barber user
        from utils.auth import get_password_hash
        barber_user = models.User(
            email="consistency@example.com",
            name="Consistency Test",
            hashed_password=get_password_hash("pass123"),
            role="barber",
            is_active=True
        )
        db.add(barber_user)
        db.commit()
        db.refresh(barber_user)
        
        auth_token = create_access_token(
            data={"sub": barber_user.email, "role": barber_user.role}
        )
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create profile
        profile_data = {
            "bio": "Consistency test profile",
            "years_experience": 5
        }
        
        create_response = await async_client.post(
            "/barbers/profiles",
            json=profile_data,
            headers=headers
        )
        assert create_response.status_code == 200
        
        # Get profile with user data
        profile_response = await async_client.get(
            f"/barbers/{barber_user.id}/profile",
            headers=headers
        )
        assert profile_response.status_code == 200
        
        profile_data = profile_response.json()
        
        # Verify user data is correctly included
        assert profile_data["user_name"] == barber_user.name
        assert profile_data["user_email"] == barber_user.email
        assert profile_data["user_id"] == barber_user.id
        
        # Update user data and verify profile relationship
        barber_user.name = "Updated Name"
        db.commit()
        
        updated_profile_response = await async_client.get(
            f"/barbers/{barber_user.id}/profile",
            headers=headers
        )
        assert updated_profile_response.status_code == 200
        
        updated_profile_data = updated_profile_response.json()
        assert updated_profile_data["user_name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_transaction_rollback_on_errors(
        self, async_client: AsyncClient, db: Session
    ):
        """Test that transactions are properly rolled back on errors"""
        
        # Create barber user
        from utils.auth import get_password_hash
        barber_user = models.User(
            email="rollback@example.com",
            name="Rollback Test",
            hashed_password=get_password_hash("pass123"),
            role="barber",
            is_active=True
        )
        db.add(barber_user)
        db.commit()
        db.refresh(barber_user)
        
        auth_token = create_access_token(
            data={"sub": barber_user.email, "role": barber_user.role}
        )
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create valid profile first
        valid_data = {
            "bio": "Valid profile",
            "years_experience": 5,
            "hourly_rate": 50.0
        }
        
        create_response = await async_client.post(
            "/barbers/profiles",
            json=valid_data,
            headers=headers
        )
        assert create_response.status_code == 200
        
        # Count profiles before error
        initial_count = db.query(models.BarberProfile).count()
        
        # Attempt operation that should fail (duplicate profile)
        duplicate_response = await async_client.post(
            "/barbers/profiles",
            json=valid_data,
            headers=headers
        )
        assert duplicate_response.status_code == 400
        
        # Verify count hasn't changed (transaction rolled back)
        final_count = db.query(models.BarberProfile).count()
        assert final_count == initial_count


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])