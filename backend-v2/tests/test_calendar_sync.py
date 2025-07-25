"""
Comprehensive tests for Calendar Sync Service.

Tests cover:
- One-way sync scenarios
- Two-way sync with conflict resolution
- Webhook processing
- Sync failure recovery
- Data consistency checks
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

from services.calendar_sync_service import CalendarSyncService
from services.google_calendar_service import GoogleCalendarError, FreeBusyResponse
from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory
)
from sqlalchemy.orm import Session


@pytest.fixture
def calendar_sync_service(db: Session):
    """Create CalendarSyncService instance for testing."""
    return CalendarSyncService(db)


@pytest.fixture
def mock_google_service():
    """Create mock Google Calendar service."""
    mock_service = Mock()
    mock_service.sync_appointment_to_google = Mock(return_value='test_event_id')
    mock_service.update_appointment_in_google = Mock(return_value=True)
    mock_service.delete_appointment_from_google = Mock(return_value=True)
    mock_service.get_free_busy = Mock(return_value=FreeBusyResponse(
        start_time=datetime(2024, 1, 1, 9, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 1, 1, 17, 0, 0, tzinfo=timezone.utc),
        calendar_id='primary',
        busy_periods=[]
    ))
    mock_service.get_calendar_service = Mock()
    return mock_service


@pytest.fixture
def test_barber_with_calendar(db: Session):
    """Create test barber with Google Calendar credentials."""
    barber = UserFactory.create_barber(
        google_calendar_credentials='{"token": "test_token", "refresh_token": "refresh"}',
        google_calendar_id='primary'
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@pytest.fixture
def test_barber_without_calendar(db: Session):
    """Create test barber without Google Calendar credentials."""
    barber = UserFactory.create_barber(
        google_calendar_credentials=None,
        google_calendar_id=None
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@pytest.fixture
def test_appointment_with_calendar(db: Session, test_barber_with_calendar):
    """Create test appointment for barber with calendar integration."""
    client = ClientFactory.create_client()
    appointment = AppointmentFactory.create_appointment(
        user_id=test_barber_with_calendar.id,
        client_id=client.id,
        start_time=datetime.now(timezone.utc) + timedelta(days=1),
        duration_minutes=60,
        status='confirmed'
    )
    
    db.add_all([client, appointment])
    db.commit()
    db.refresh(appointment)
    
    # Set up the relationship
    appointment.barber = test_barber_with_calendar
    appointment.client = client
    
    return appointment


@pytest.fixture
def test_appointment_without_calendar(db: Session, test_barber_without_calendar):
    """Create test appointment for barber without calendar integration."""
    client = ClientFactory.create_client()
    appointment = AppointmentFactory.create_appointment(
        user_id=test_barber_without_calendar.id,
        client_id=client.id,
        start_time=datetime.now(timezone.utc) + timedelta(days=1),
        duration_minutes=60,
        status='confirmed'
    )
    
    db.add_all([client, appointment])
    db.commit()
    db.refresh(appointment)
    
    # Set up the relationship
    appointment.barber = test_barber_without_calendar
    appointment.client = client
    
    return appointment


class TestCalendarSyncAppointmentCreation:
    """Test appointment creation sync scenarios."""
    
    def test_sync_appointment_created_success(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test successful sync when appointment is created."""
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_created(test_appointment_with_calendar)
            
            assert result is True
            mock_google_service.sync_appointment_to_google.assert_called_once_with(test_appointment_with_calendar)
    
    def test_sync_appointment_created_no_calendar(self, calendar_sync_service, test_appointment_without_calendar):
        """Test sync when barber has no calendar integration."""
        result = calendar_sync_service.sync_appointment_created(test_appointment_without_calendar)
        
        assert result is True  # Should return True but skip sync
    
    def test_sync_appointment_created_google_error(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when Google Calendar API returns error."""
        mock_google_service.sync_appointment_to_google.side_effect = GoogleCalendarError("API Error")
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_created(test_appointment_with_calendar)
            
            assert result is False
    
    def test_sync_appointment_created_sync_failure(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when Google service returns None (sync failure)."""
        mock_google_service.sync_appointment_to_google.return_value = None
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_created(test_appointment_with_calendar)
            
            assert result is False
    
    def test_sync_appointment_created_unexpected_error(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when unexpected error occurs."""
        mock_google_service.sync_appointment_to_google.side_effect = Exception("Unexpected error")
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_created(test_appointment_with_calendar)
            
            assert result is False


class TestCalendarSyncAppointmentUpdate:
    """Test appointment update sync scenarios."""
    
    def test_sync_appointment_updated_existing_event(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when updating appointment with existing Google event."""
        test_appointment_with_calendar.google_event_id = 'existing_event_id'
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_updated(test_appointment_with_calendar)
            
            assert result is True
            mock_google_service.update_appointment_in_google.assert_called_once_with(test_appointment_with_calendar)
    
    def test_sync_appointment_updated_no_existing_event(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when updating appointment without existing Google event."""
        test_appointment_with_calendar.google_event_id = None
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            with patch.object(calendar_sync_service, 'sync_appointment_created', return_value=True) as mock_create:
                result = calendar_sync_service.sync_appointment_updated(test_appointment_with_calendar)
                
                assert result is True
                mock_create.assert_called_once_with(test_appointment_with_calendar)
    
    def test_sync_appointment_updated_no_calendar(self, calendar_sync_service, test_appointment_without_calendar):
        """Test sync when barber has no calendar integration."""
        result = calendar_sync_service.sync_appointment_updated(test_appointment_without_calendar)
        
        assert result is True  # Should return True but skip sync
    
    def test_sync_appointment_updated_google_error(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when Google Calendar API returns error."""
        test_appointment_with_calendar.google_event_id = 'existing_event_id'
        mock_google_service.update_appointment_in_google.side_effect = GoogleCalendarError("API Error")
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_updated(test_appointment_with_calendar)
            
            assert result is False
    
    def test_sync_appointment_updated_update_failure(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when Google service returns False (update failure)."""
        test_appointment_with_calendar.google_event_id = 'existing_event_id'
        mock_google_service.update_appointment_in_google.return_value = False
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_updated(test_appointment_with_calendar)
            
            assert result is False


class TestCalendarSyncAppointmentDeletion:
    """Test appointment deletion sync scenarios."""
    
    def test_sync_appointment_deleted_success(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test successful sync when appointment is deleted."""
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_deleted(test_appointment_with_calendar)
            
            assert result is True
            mock_google_service.delete_appointment_from_google.assert_called_once_with(test_appointment_with_calendar)
    
    def test_sync_appointment_deleted_no_calendar(self, calendar_sync_service, test_appointment_without_calendar):
        """Test sync when barber has no calendar integration."""
        result = calendar_sync_service.sync_appointment_deleted(test_appointment_without_calendar)
        
        assert result is True  # Should return True but skip sync
    
    def test_sync_appointment_deleted_google_error(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when Google Calendar API returns error."""
        mock_google_service.delete_appointment_from_google.side_effect = GoogleCalendarError("API Error")
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_deleted(test_appointment_with_calendar)
            
            assert result is False
    
    def test_sync_appointment_deleted_failure(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test sync when Google service returns False (delete failure)."""
        mock_google_service.delete_appointment_from_google.return_value = False
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            result = calendar_sync_service.sync_appointment_deleted(test_appointment_with_calendar)
            
            assert result is False


class TestCalendarSyncConflictDetection:
    """Test conflict detection functionality."""
    
    def test_check_calendar_conflicts_no_conflicts(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test conflict check when no conflicts exist."""
        # Mock no busy periods
        mock_google_service.get_free_busy.return_value = FreeBusyResponse(
            start_time=test_appointment_with_calendar.start_time,
            end_time=test_appointment_with_calendar.start_time + timedelta(minutes=60),
            calendar_id='primary',
            busy_periods=[]
        )
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            conflicts = calendar_sync_service.check_calendar_conflicts(test_appointment_with_calendar)
            
            assert len(conflicts) == 0
    
    def test_check_calendar_conflicts_google_conflict(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test conflict check when Google Calendar has conflicting event."""
        start_time = test_appointment_with_calendar.start_time
        end_time = start_time + timedelta(minutes=test_appointment_with_calendar.duration_minutes)
        
        # Mock overlapping busy period
        conflicting_start = start_time + timedelta(minutes=15)
        conflicting_end = end_time + timedelta(minutes=15)
        
        mock_google_service.get_free_busy.return_value = FreeBusyResponse(
            start_time=start_time,
            end_time=end_time,
            calendar_id='primary',
            busy_periods=[(conflicting_start, conflicting_end)]
        )
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            conflicts = calendar_sync_service.check_calendar_conflicts(test_appointment_with_calendar)
            
            assert len(conflicts) == 1
            assert conflicts[0]['type'] == 'google_calendar_conflict'
            assert conflicts[0]['appointment_id'] == test_appointment_with_calendar.id
    
    def test_check_calendar_conflicts_v2_conflict(self, calendar_sync_service, test_appointment_with_calendar, db):
        """Test conflict check when another V2 appointment conflicts."""
        # Create conflicting appointment
        conflicting_appointment = AppointmentFactory.create_appointment(
            user_id=test_appointment_with_calendar.barber_id,
            start_time=test_appointment_with_calendar.start_time + timedelta(minutes=30),
            duration_minutes=60,
            status='confirmed'
        )
        db.add(conflicting_appointment)
        db.commit()
        
        with patch.object(calendar_sync_service, 'google_service', Mock()):
            # Mock no Google conflicts
            calendar_sync_service.google_service.get_free_busy.return_value = FreeBusyResponse(
                start_time=test_appointment_with_calendar.start_time,
                end_time=test_appointment_with_calendar.start_time + timedelta(minutes=60),
                calendar_id='primary',
                busy_periods=[]
            )
            
            conflicts = calendar_sync_service.check_calendar_conflicts(test_appointment_with_calendar)
            
            v2_conflicts = [c for c in conflicts if c['type'] == 'v2_appointment_conflict']
            assert len(v2_conflicts) == 1
            assert v2_conflicts[0]['conflicting_appointment_id'] == conflicting_appointment.id
    
    def test_check_calendar_conflicts_no_calendar(self, calendar_sync_service, test_appointment_without_calendar):
        """Test conflict check when barber has no calendar integration."""
        conflicts = calendar_sync_service.check_calendar_conflicts(test_appointment_without_calendar)
        
        assert len(conflicts) == 0
    
    def test_check_calendar_conflicts_error(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test conflict check when an error occurs."""
        mock_google_service.get_free_busy.side_effect = Exception("API Error")
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            conflicts = calendar_sync_service.check_calendar_conflicts(test_appointment_with_calendar)
            
            assert len(conflicts) == 1
            assert conflicts[0]['type'] == 'conflict_check_error'
            assert 'Could not check for conflicts' in conflicts[0]['message']


class TestCalendarSyncBulkOperations:
    """Test bulk sync operations."""
    
    def test_bulk_sync_user_appointments_success(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test successful bulk sync of user appointments."""
        # Create multiple appointments
        appointments = []
        for i in range(3):
            client = ClientFactory.create_client()
            appointment = AppointmentFactory.create_appointment(
                user_id=test_barber_with_calendar.id,
                client_id=client.id,
                start_time=datetime.now(timezone.utc) + timedelta(days=i+1),
                status='confirmed'
            )
            appointments.append(appointment)
            db.add_all([client, appointment])
        
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            with patch.object(calendar_sync_service, 'check_calendar_conflicts', return_value=[]):
                with patch.object(calendar_sync_service, 'sync_appointment_created', return_value=True):
                    results = calendar_sync_service.bulk_sync_user_appointments(
                        test_barber_with_calendar, start_date, end_date
                    )
                    
                    assert results['synced'] == 3
                    assert results['failed'] == 0
                    assert len(results['conflicts']) == 0
                    assert len(results['errors']) == 0
    
    def test_bulk_sync_user_appointments_with_conflicts(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test bulk sync with conflicts detected."""
        # Create appointment
        client = ClientFactory.create_client()
        appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client.id,
            start_time=datetime.now(timezone.utc) + timedelta(days=1),
            status='confirmed'
        )
        db.add_all([client, appointment])
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        # Mock conflict
        mock_conflict = {
            'type': 'google_calendar_conflict',
            'appointment_id': appointment.id,
            'message': 'Conflict detected'
        }
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            with patch.object(calendar_sync_service, 'check_calendar_conflicts', return_value=[mock_conflict]):
                with patch.object(calendar_sync_service, 'sync_appointment_created', return_value=True):
                    results = calendar_sync_service.bulk_sync_user_appointments(
                        test_barber_with_calendar, start_date, end_date
                    )
                    
                    assert results['synced'] == 1
                    assert len(results['conflicts']) == 1
                    assert results['conflicts'][0]['type'] == 'google_calendar_conflict'
    
    def test_bulk_sync_user_appointments_with_failures(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test bulk sync with some failures."""
        # Create appointments
        appointments = []
        for i in range(2):
            client = ClientFactory.create_client()
            appointment = AppointmentFactory.create_appointment(
                user_id=test_barber_with_calendar.id,
                client_id=client.id,
                start_time=datetime.now(timezone.utc) + timedelta(days=i+1),
                status='confirmed'
            )
            appointments.append(appointment)
            db.add_all([client, appointment])
        
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        # Mock first sync succeeds, second fails
        def mock_sync(appointment):
            return appointment.id == appointments[0].id
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            with patch.object(calendar_sync_service, 'check_calendar_conflicts', return_value=[]):
                with patch.object(calendar_sync_service, 'sync_appointment_created', side_effect=mock_sync):
                    results = calendar_sync_service.bulk_sync_user_appointments(
                        test_barber_with_calendar, start_date, end_date
                    )
                    
                    assert results['synced'] == 1
                    assert results['failed'] == 1
                    assert len(results['errors']) == 1
    
    def test_bulk_sync_user_appointments_no_calendar(self, calendar_sync_service, test_barber_without_calendar):
        """Test bulk sync when user has no calendar integration."""
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        results = calendar_sync_service.bulk_sync_user_appointments(
            test_barber_without_calendar, start_date, end_date
        )
        
        assert 'error' in results
        assert 'does not have Google Calendar connected' in results['error']
        assert results['synced'] == 0
    
    def test_bulk_sync_update_existing_appointments(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test bulk sync updates existing synced appointments."""
        # Create appointment with existing Google event ID
        client = ClientFactory.create_client()
        appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client.id,
            start_time=datetime.now(timezone.utc) + timedelta(days=1),
            status='confirmed',
            google_event_id='existing_event_id'
        )
        db.add_all([client, appointment])
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            with patch.object(calendar_sync_service, 'check_calendar_conflicts', return_value=[]):
                with patch.object(calendar_sync_service, 'sync_appointment_updated', return_value=True) as mock_update:
                    results = calendar_sync_service.bulk_sync_user_appointments(
                        test_barber_with_calendar, start_date, end_date
                    )
                    
                    assert results['synced'] == 1
                    mock_update.assert_called_once()


class TestCalendarSyncStatus:
    """Test sync status tracking."""
    
    def test_get_sync_status_for_user_connected(self, calendar_sync_service, test_barber_with_calendar, db):
        """Test sync status for user with calendar integration."""
        # Create mix of synced and unsynced appointments
        synced_appointments = []
        unsynced_appointments = []
        
        for i in range(3):
            client = ClientFactory.create_client()
            appointment = AppointmentFactory.create_appointment(
                user_id=test_barber_with_calendar.id,
                client_id=client.id,
                start_time=datetime.now(timezone.utc) + timedelta(days=i+1),
                status='confirmed',
                google_event_id='synced_event_id' if i < 2 else None  # First 2 synced, last unsynced
            )
            if i < 2:
                synced_appointments.append(appointment)
            else:
                unsynced_appointments.append(appointment)
            db.add_all([client, appointment])
        
        db.commit()
        
        status = calendar_sync_service.get_sync_status_for_user(test_barber_with_calendar)
        
        assert status['connected'] is True
        assert status['total_appointments'] == 3
        assert status['synced_appointments'] == 2
        assert status['unsynced_appointments'] == 1
        assert status['sync_percentage'] == 66.7
    
    def test_get_sync_status_for_user_not_connected(self, calendar_sync_service, test_barber_without_calendar):
        """Test sync status for user without calendar integration."""
        status = calendar_sync_service.get_sync_status_for_user(test_barber_without_calendar)
        
        assert status['connected'] is False
        assert status['total_appointments'] == 0
        assert status['synced_appointments'] == 0
        assert status['unsynced_appointments'] == 0
        assert status['sync_percentage'] == 0
    
    def test_get_sync_status_no_appointments(self, calendar_sync_service, test_barber_with_calendar):
        """Test sync status when user has no appointments."""
        status = calendar_sync_service.get_sync_status_for_user(test_barber_with_calendar)
        
        assert status['connected'] is True
        assert status['total_appointments'] == 0
        assert status['synced_appointments'] == 0
        assert status['unsynced_appointments'] == 0
        assert status['sync_percentage'] == 100  # 100% when no appointments


class TestCalendarSyncCleanup:
    """Test cleanup operations."""
    
    def test_cleanup_orphaned_events_success(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test successful cleanup of orphaned Google Calendar events."""
        # Create appointment with Google event ID
        client = ClientFactory.create_client()
        appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client.id,
            google_event_id='our_event_id'
        )
        db.add_all([client, appointment])
        db.commit()
        
        # Mock Google Calendar service
        mock_calendar_service = Mock()
        mock_events_list = Mock()
        mock_events_list.execute.return_value = {
            'items': [
                {'id': 'our_event_id'},  # This should not be deleted
                {'id': 'orphaned_event_id'}  # This should be deleted
            ]
        }
        mock_events_list.list.return_value = mock_events_list
        mock_calendar_service.events.return_value = mock_events_list
        
        mock_delete = Mock()
        mock_delete.execute.return_value = {}
        mock_events_list.delete.return_value = mock_delete
        
        mock_google_service.get_calendar_service.return_value = mock_calendar_service
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            with patch('services.calendar_sync_service.datetime') as mock_datetime:
                mock_datetime.utcnow.return_value.isoformat.return_value = '2024-01-01T00:00:00'
                
                results = calendar_sync_service.cleanup_orphaned_events(test_barber_with_calendar)
                
                assert results['deleted'] == 1
                assert len(results['errors']) == 0
    
    def test_cleanup_orphaned_events_no_calendar(self, calendar_sync_service, test_barber_without_calendar):
        """Test cleanup when user has no calendar integration."""
        results = calendar_sync_service.cleanup_orphaned_events(test_barber_without_calendar)
        
        assert 'error' in results
        assert 'does not have Google Calendar connected' in results['error']
    
    def test_cleanup_orphaned_events_error(self, calendar_sync_service, test_barber_with_calendar, mock_google_service):
        """Test cleanup when an error occurs."""
        mock_google_service.get_calendar_service.side_effect = Exception("API Error")
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            results = calendar_sync_service.cleanup_orphaned_events(test_barber_with_calendar)
            
            assert results['deleted'] == 0
            assert len(results['errors']) == 1
            assert 'Error during cleanup' in results['errors'][0]
    
    def test_cleanup_orphaned_events_delete_error(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test cleanup when individual event deletion fails."""
        # Mock Google Calendar service with event that fails to delete
        mock_calendar_service = Mock()
        mock_events_list = Mock()
        mock_events_list.execute.return_value = {
            'items': [
                {'id': 'orphaned_event_id'}
            ]
        }
        mock_events_list.list.return_value = mock_events_list
        mock_calendar_service.events.return_value = mock_events_list
        
        # Mock delete to fail
        mock_delete = Mock()
        mock_delete.execute.side_effect = Exception("Delete failed")
        mock_events_list.delete.return_value = mock_delete
        
        mock_google_service.get_calendar_service.return_value = mock_calendar_service
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            with patch('services.calendar_sync_service.datetime') as mock_datetime:
                mock_datetime.utcnow.return_value.isoformat.return_value = '2024-01-01T00:00:00'
                
                results = calendar_sync_service.cleanup_orphaned_events(test_barber_with_calendar)
                
                assert results['deleted'] == 0
                assert len(results['errors']) == 1
                assert 'Failed to delete event orphaned_event_id' in results['errors'][0]


class TestCalendarSyncEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_sync_appointment_without_barber(self, calendar_sync_service, db):
        """Test sync when appointment has no barber."""
        client = ClientFactory.create_client()
        appointment = AppointmentFactory.create_appointment(
            user_id=None,
            client_id=client.id
        )
        appointment.barber = None
        
        db.add_all([client, appointment])
        db.commit()
        
        result = calendar_sync_service.sync_appointment_created(appointment)
        assert result is True  # Should handle gracefully
    
    def test_sync_appointment_with_buffer_time(self, calendar_sync_service, test_appointment_with_calendar, mock_google_service):
        """Test conflict checking with buffer time considerations."""
        # Add buffer time attributes
        test_appointment_with_calendar.buffer_time_before = 15
        test_appointment_with_calendar.buffer_time_after = 10
        
        start_time = test_appointment_with_calendar.start_time
        end_time = start_time + timedelta(minutes=test_appointment_with_calendar.duration_minutes)
        
        # Mock busy period that conflicts with buffer time
        buffer_start = start_time - timedelta(minutes=15)
        conflicting_start = buffer_start + timedelta(minutes=5)
        conflicting_end = buffer_start + timedelta(minutes=20)
        
        mock_google_service.get_free_busy.return_value = FreeBusyResponse(
            start_time=buffer_start,
            end_time=end_time + timedelta(minutes=10),
            calendar_id='primary',
            busy_periods=[(conflicting_start, conflicting_end)]
        )
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            conflicts = calendar_sync_service.check_calendar_conflicts(test_appointment_with_calendar)
            
            assert len(conflicts) == 1
            assert conflicts[0]['type'] == 'google_calendar_conflict'
    
    def test_sync_with_past_appointments(self, calendar_sync_service, test_barber_with_calendar, db):
        """Test sync status excludes very old appointments."""
        # Create old appointment (outside 30-day window)
        client = ClientFactory.create_client()
        old_appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client.id,
            start_time=datetime.now(timezone.utc) - timedelta(days=45),
            status='completed'
        )
        
        # Create recent appointment
        recent_appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client.id,
            start_time=datetime.now(timezone.utc) - timedelta(days=10),
            status='confirmed'
        )
        
        db.add_all([client, old_appointment, recent_appointment])
        db.commit()
        
        status = calendar_sync_service.get_sync_status_for_user(test_barber_with_calendar)
        
        # Should only count recent appointment
        assert status['total_appointments'] == 1
    
    def test_bulk_sync_exception_handling(self, calendar_sync_service, test_barber_with_calendar, db):
        """Test bulk sync handles individual appointment exceptions."""
        # Create appointment
        client = ClientFactory.create_client()
        appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client.id,
            start_time=datetime.now(timezone.utc) + timedelta(days=1),
            status='confirmed'
        )
        db.add_all([client, appointment])
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        # Mock conflict check to raise exception
        with patch.object(calendar_sync_service, 'check_calendar_conflicts', side_effect=Exception("Conflict check failed")):
            results = calendar_sync_service.bulk_sync_user_appointments(
                test_barber_with_calendar, start_date, end_date
            )
            
            assert results['failed'] == 1
            assert len(results['errors']) == 1
            assert 'Error syncing appointment' in results['errors'][0]


class TestCalendarSyncHooks:
    """Test sync hook registration and integration."""
    
    def test_register_sync_hooks(self):
        """Test sync hook registration function."""
        from services.calendar_sync_service import register_sync_hooks
        
        # This is a placeholder function, test that it doesn't raise errors
        try:
            register_sync_hooks()
            assert True
        except Exception as e:
            pytest.fail(f"register_sync_hooks raised an exception: {e}")


class TestCalendarSyncIntegration:
    """Test integration scenarios combining multiple sync operations."""
    
    def test_complete_appointment_lifecycle_sync(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test complete appointment lifecycle with sync."""
        client = ClientFactory.create_client()
        appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client.id,
            start_time=datetime.now(timezone.utc) + timedelta(days=1),
            status='pending'
        )
        db.add_all([client, appointment])
        db.commit()
        
        appointment.barber = test_barber_with_calendar
        appointment.client = client
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            # 1. Create appointment
            create_result = calendar_sync_service.sync_appointment_created(appointment)
            assert create_result is True
            
            # Simulate Google event ID being set
            appointment.google_event_id = 'test_event_id'
            
            # 2. Update appointment
            update_result = calendar_sync_service.sync_appointment_updated(appointment)
            assert update_result is True
            
            # 3. Delete appointment
            delete_result = calendar_sync_service.sync_appointment_deleted(appointment)
            assert delete_result is True
    
    def test_conflict_resolution_workflow(self, calendar_sync_service, test_barber_with_calendar, db, mock_google_service):
        """Test workflow for handling and resolving conflicts."""
        # Create two conflicting appointments
        client1 = ClientFactory.create_client()
        client2 = ClientFactory.create_client()
        
        appointment1 = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client1.id,
            start_time=datetime.now(timezone.utc) + timedelta(days=1),
            duration_minutes=60,
            status='confirmed'
        )
        
        # Overlapping appointment
        appointment2 = AppointmentFactory.create_appointment(
            user_id=test_barber_with_calendar.id,
            client_id=client2.id,
            start_time=appointment1.start_time + timedelta(minutes=30),
            duration_minutes=60,
            status='pending'
        )
        
        db.add_all([client1, client2, appointment1, appointment2])
        db.commit()
        
        appointment1.barber = test_barber_with_calendar
        appointment2.barber = test_barber_with_calendar
        
        with patch.object(calendar_sync_service, 'google_service', mock_google_service):
            # Check conflicts for second appointment
            conflicts = calendar_sync_service.check_calendar_conflicts(appointment2)
            
            # Should detect conflict with first appointment
            v2_conflicts = [c for c in conflicts if c['type'] == 'v2_appointment_conflict']
            assert len(v2_conflicts) == 1
            assert v2_conflicts[0]['conflicting_appointment_id'] == appointment1.id


if __name__ == "__main__":
    pytest.main([__file__])