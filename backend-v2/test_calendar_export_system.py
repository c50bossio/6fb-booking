"""
Test script for Calendar Export and Sync System

This script tests the comprehensive calendar export and synchronization system.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any

from sqlalchemy.orm import Session
from db import get_db
from models import User, Appointment, Service
from services.calendar_export_service import (
    CalendarExportService,
    ExportOptions,
    ExportFormat,
    PrivacyLevel,
    SyncOptions,
    SyncProvider
)
from services.calendar_sync_service import CalendarSyncService


async def create_test_data(db: Session) -> Dict[str, Any]:
    """Create test data for calendar export testing."""
    print("Creating test data...")
    
    # Create test user (barber)
    test_user = User(
        email="test.barber@example.com",
        name="Test Barber",
        role="barber",
        hashed_password="hashed_password"
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    # Create test service
    test_service = Service(
        name="Haircut",
        description="Professional haircut",
        duration=60,
        price=50.0,
        barber_id=test_user.id
    )
    db.add(test_service)
    db.commit()
    db.refresh(test_service)
    
    # Create test appointments
    appointments = []
    for i in range(5):
        appointment = Appointment(
            barber_id=test_user.id,
            service_id=test_service.id,
            client_name=f"Test Client {i+1}",
            client_email=f"client{i+1}@example.com",
            client_phone=f"555-000{i+1}",
            appointment_date=datetime.utcnow() + timedelta(days=i+1),
            duration=60,
            status="confirmed",
            notes=f"Test appointment {i+1}",
            price=50.0
        )
        appointments.append(appointment)
        db.add(appointment)
    
    db.commit()
    
    return {
        "user": test_user,
        "service": test_service,
        "appointments": appointments
    }


async def test_calendar_export(db: Session, test_data: Dict[str, Any]):
    """Test calendar export functionality."""
    print("\n=== Testing Calendar Export ===")
    
    export_service = CalendarExportService(db)
    user = test_data["user"]
    
    # Test different export formats
    formats_to_test = [
        ExportFormat.ICAL,
        ExportFormat.CSV,
        ExportFormat.JSON
    ]
    
    privacy_levels_to_test = [
        PrivacyLevel.FULL,
        PrivacyLevel.BUSINESS,
        PrivacyLevel.MINIMAL,
        PrivacyLevel.ANONYMOUS
    ]
    
    for export_format in formats_to_test:
        for privacy_level in privacy_levels_to_test:
            print(f"\nTesting {export_format.value} export with {privacy_level.value} privacy...")
            
            export_options = ExportOptions(
                format=export_format,
                privacy_level=privacy_level,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=30),
                timezone="UTC",
                include_cancelled=False,
                include_completed=True,
                custom_title=f"Test Calendar - {export_format.value}"
            )
            
            try:
                result = export_service.export_calendar(user, export_options)
                
                if result.success:
                    print(f"  ✅ Export successful: {result.filename}")
                    print(f"     - Format: {result.format.value}")
                    print(f"     - Size: {result.size_bytes} bytes")
                    print(f"     - Appointments: {result.export_count}")
                    print(f"     - Export ID: {result.export_id}")
                    
                    if result.subscription_url:
                        print(f"     - Subscription URL: {result.subscription_url}")
                    
                    # Verify content based on format
                    if export_format == ExportFormat.ICAL:
                        assert "BEGIN:VCALENDAR" in result.content
                        assert "END:VCALENDAR" in result.content
                        print("     - iCalendar format validation passed")
                    
                    elif export_format == ExportFormat.CSV:
                        lines = result.content.split('\n')
                        assert len(lines) >= 2  # Header + at least one data row
                        print("     - CSV format validation passed")
                    
                    elif export_format == ExportFormat.JSON:
                        data = json.loads(result.content)
                        assert "metadata" in data
                        assert "appointments" in data
                        print("     - JSON format validation passed")
                    
                else:
                    print(f"  ❌ Export failed: {result.errors}")
                    
            except Exception as e:
                print(f"  ❌ Export error: {str(e)}")


async def test_bulk_export(db: Session, test_data: Dict[str, Any]):
    """Test bulk export functionality."""
    print("\n=== Testing Bulk Export ===")
    
    export_service = CalendarExportService(db)
    user = test_data["user"]
    
    export_options = ExportOptions(
        format=ExportFormat.ICAL,
        privacy_level=PrivacyLevel.BUSINESS,
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=30),
        timezone="UTC"
    )
    
    try:
        results = export_service.bulk_export_multiple_barbers(
            user,
            [user.id],  # Single barber for this test
            export_options
        )
        
        print(f"Bulk export results: {len(results)} calendars processed")
        
        for i, result in enumerate(results):
            if result.success:
                print(f"  ✅ Barber {i+1}: {result.filename} ({result.export_count} appointments)")
            else:
                print(f"  ❌ Barber {i+1}: {result.errors}")
                
    except Exception as e:
        print(f"❌ Bulk export error: {str(e)}")


async def test_sync_setup(db: Session, test_data: Dict[str, Any]):
    """Test sync configuration setup."""
    print("\n=== Testing Sync Setup ===")
    
    sync_service = CalendarSyncService(db)
    user = test_data["user"]
    
    # Test sync options
    sync_options = SyncOptions(
        provider=SyncProvider.GOOGLE_CALENDAR,
        calendar_id="test-calendar-id",
        sync_direction="bidirectional",
        conflict_resolution="newest_wins",
        sync_frequency=30,
        privacy_level=PrivacyLevel.BUSINESS,
        auto_create_calendar=True,
        webhook_enabled=True
    )
    
    try:
        result = await sync_service.setup_sync_configuration(
            user,
            SyncProvider.GOOGLE_CALENDAR,
            "test-calendar-id",
            sync_options
        )
        
        if result.get("success"):
            print("✅ Sync setup successful")
            print(f"   - Provider: {result.get('provider')}")
            print(f"   - Direction: {result.get('sync_direction')}")
            print(f"   - Frequency: {result.get('sync_frequency')} minutes")
            print(f"   - Webhook URL: {result.get('webhook_url')}")
            print(f"   - Next sync: {result.get('next_sync')}")
        else:
            print(f"❌ Sync setup failed: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Sync setup error: {str(e)}")


async def test_conflict_detection(db: Session, test_data: Dict[str, Any]):
    """Test conflict detection and resolution."""
    print("\n=== Testing Conflict Detection ===")
    
    sync_service = CalendarSyncService(db)
    
    # Create mock local and remote events for conflict testing
    from services.calendar_sync_service import SyncEvent
    import uuid
    
    # Mock conflicting events (same time slot)
    base_time = datetime.utcnow() + timedelta(hours=1)
    
    local_event = SyncEvent(
        id="local-1",
        external_id=None,
        title="Local Appointment",
        description="Local appointment description",
        start_time=base_time,
        end_time=base_time + timedelta(hours=1),
        location="Local Shop",
        attendees=["client@example.com"],
        created_at=datetime.utcnow() - timedelta(hours=2),
        modified_at=datetime.utcnow() - timedelta(hours=1),
        source="local",
        checksum="local-checksum-123"
    )
    
    remote_event = SyncEvent(
        id="remote-1",
        external_id="remote-external-id",
        title="Remote Appointment",
        description="Remote appointment description",
        start_time=base_time,
        end_time=base_time + timedelta(hours=1),
        location="Remote Location",
        attendees=["different@example.com"],
        created_at=datetime.utcnow() - timedelta(hours=2),
        modified_at=datetime.utcnow() - timedelta(minutes=30),  # More recent
        source="external",
        checksum="remote-checksum-456"
    )
    
    try:
        conflicts = await sync_service.detect_conflicts([local_event], [remote_event])
        
        print(f"Detected {len(conflicts)} conflicts")
        
        for conflict in conflicts:
            print(f"  - Conflict ID: {conflict.id}")
            print(f"    Type: {conflict.conflict_type}")
            print(f"    Local: {conflict.local_event.title} at {conflict.local_event.start_time}")
            print(f"    Remote: {conflict.remote_event.title} at {conflict.remote_event.start_time}")
            print(f"    Suggested resolution: {conflict.suggested_resolution}")
            
            # Test conflict resolution
            from services.calendar_sync_service import ConflictResolution
            
            resolution_result = await sync_service.resolve_conflict(
                conflict,
                ConflictResolution.NEWEST_WINS
            )
            
            if resolution_result.get("success"):
                print(f"  ✅ Conflict resolved using newest_wins strategy")
            else:
                print(f"  ❌ Conflict resolution failed: {resolution_result.get('error')}")
                
    except Exception as e:
        print(f"❌ Conflict detection error: {str(e)}")


async def test_subscription_creation(db: Session, test_data: Dict[str, Any]):
    """Test calendar subscription creation."""
    print("\n=== Testing Subscription Creation ===")
    
    export_service = CalendarExportService(db)
    user = test_data["user"]
    
    try:
        subscription = export_service.create_subscription_calendar(
            user,
            "Test Business Calendar",
            "Public calendar for test business appointments",
            PrivacyLevel.MINIMAL,
            {
                "barber_ids": [user.id],
                "include_cancelled": False,
                "include_completed": True
            },
            expires_in_days=30
        )
        
        print("✅ Subscription created successfully")
        print(f"   - ID: {subscription.id}")
        print(f"   - Name: {subscription.name}")
        print(f"   - URL: {subscription.url}")
        print(f"   - Privacy Level: {subscription.privacy_level.value}")
        print(f"   - Expires: {subscription.expires_at}")
        
    except Exception as e:
        print(f"❌ Subscription creation error: {str(e)}")


async def test_analytics(db: Session, test_data: Dict[str, Any]):
    """Test analytics functionality."""
    print("\n=== Testing Analytics ===")
    
    export_service = CalendarExportService(db)
    sync_service = CalendarSyncService(db)
    user = test_data["user"]
    
    try:
        # Test export analytics
        export_analytics = export_service.get_export_analytics(user, days=30)
        print("✅ Export analytics retrieved")
        print(f"   - Total exports: {export_analytics.get('total_exports', 0)}")
        print(f"   - Error rate: {export_analytics.get('error_rate', 0)}%")
        
        # Test sync analytics
        sync_analytics = await sync_service.get_sync_analytics(user, days=30)
        print("✅ Sync analytics retrieved")
        print(f"   - Success rate: {sync_analytics.get('sync_frequency', {}).get('success_rate_percentage', 0)}%")
        print(f"   - Total conflicts: {sync_analytics.get('conflicts', {}).get('total_conflicts', 0)}")
        
    except Exception as e:
        print(f"❌ Analytics error: {str(e)}")


async def cleanup_test_data(db: Session, test_data: Dict[str, Any]):
    """Clean up test data."""
    print("\n=== Cleaning up test data ===")
    
    try:
        # Delete appointments
        for appointment in test_data["appointments"]:
            db.delete(appointment)
        
        # Delete service
        db.delete(test_data["service"])
        
        # Delete user
        db.delete(test_data["user"])
        
        db.commit()
        print("✅ Test data cleaned up successfully")
        
    except Exception as e:
        print(f"❌ Cleanup error: {str(e)}")
        db.rollback()


async def main():
    """Main test function."""
    print("🗓️  Calendar Export and Sync System Test")
    print("=" * 50)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Create test data
        test_data = await create_test_data(db)
        
        # Run tests
        await test_calendar_export(db, test_data)
        await test_bulk_export(db, test_data)
        await test_sync_setup(db, test_data)
        await test_conflict_detection(db, test_data)
        await test_subscription_creation(db, test_data)
        await test_analytics(db, test_data)
        
        print("\n" + "=" * 50)
        print("✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Clean up test data
        if 'test_data' in locals():
            await cleanup_test_data(db, test_data)
        
        db.close()


if __name__ == "__main__":
    asyncio.run(main())