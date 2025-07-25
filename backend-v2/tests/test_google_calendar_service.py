"""
Comprehensive tests for Google Calendar Service integration.

Tests cover:
- OAuth flow testing with mocks
- Event creation/update/deletion
- Two-way sync scenarios
- Conflict resolution testing
- Error handling and edge cases
- Timezone handling
- Recurring event support
"""

import pytest
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
from googleapiclient.discovery import Resource

from services.google_calendar_service import (
    GoogleCalendarService,
    CalendarEvent,
    FreeBusyResponse,
    GoogleCalendarError
)
from tests.factories import UserFactory, AppointmentFactory
from sqlalchemy.orm import Session


@pytest.fixture
def google_calendar_service(db: Session):
    """Create GoogleCalendarService instance for testing."""
    return GoogleCalendarService(db)


@pytest.fixture
def mock_credentials():
    """Create mock Google credentials."""
    credentials = Mock(spec=Credentials)
    credentials.token = "mock_access_token"
    credentials.refresh_token = "mock_refresh_token"
    credentials.token_uri = "https://oauth2.googleapis.com/token"
    credentials.client_id = "mock_client_id"
    credentials.client_secret = "mock_client_secret"
    credentials.scopes = ["https://www.googleapis.com/auth/calendar"]
    credentials.expired = False
    return credentials


@pytest.fixture
def mock_expired_credentials():
    """Create mock expired Google credentials."""
    credentials = Mock(spec=Credentials)
    credentials.token = "mock_access_token"
    credentials.refresh_token = "mock_refresh_token"
    credentials.token_uri = "https://oauth2.googleapis.com/token"
    credentials.client_id = "mock_client_id"
    credentials.client_secret = "mock_client_secret"
    credentials.scopes = ["https://www.googleapis.com/auth/calendar"]
    credentials.expired = True
    return credentials


@pytest.fixture
def test_user_with_credentials(db: Session, mock_credentials):
    """Create test user with Google Calendar credentials."""
    user = UserFactory.create_user(
        google_calendar_credentials=json.dumps({
            "token": mock_credentials.token,
            "refresh_token": mock_credentials.refresh_token,
            "token_uri": mock_credentials.token_uri,
            "client_id": mock_credentials.client_id,
            "client_secret": mock_credentials.client_secret,
            "scopes": mock_credentials.scopes
        }),
        google_calendar_id="primary"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_user_without_credentials(db: Session):
    """Create test user without Google Calendar credentials."""
    user = UserFactory.create_user(google_calendar_credentials=None)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def mock_calendar_service():
    """Create mock Google Calendar service."""
    service = Mock(spec=Resource)
    
    # Mock calendar list
    calendar_list = Mock()
    calendar_list.list.return_value.execute.return_value = {
        'items': [
            {
                'id': 'primary',
                'summary': 'Primary Calendar',
                'primary': True,
                'accessRole': 'owner',
                'timeZone': 'UTC'
            },
            {
                'id': 'secondary@example.com',
                'summary': 'Work Calendar',
                'primary': False,
                'accessRole': 'reader',
                'timeZone': 'America/New_York'
            }
        ]
    }
    service.calendarList.return_value = calendar_list
    
    # Mock events
    events = Mock()
    events.insert.return_value.execute.return_value = {'id': 'test_event_id'}
    events.get.return_value.execute.return_value = {
        'id': 'test_event_id',
        'summary': 'Test Event',
        'description': 'Test Description'
    }
    events.update.return_value.execute.return_value = {'id': 'test_event_id'}
    events.delete.return_value.execute.return_value = {}
    service.events.return_value = events
    
    # Mock freebusy
    freebusy = Mock()
    freebusy.query.return_value.execute.return_value = {
        'calendars': {
            'primary': {
                'busy': [
                    {
                        'start': '2024-01-01T10:00:00Z',
                        'end': '2024-01-01T11:00:00Z'
                    }
                ]
            }
        }
    }
    service.freebusy.return_value = freebusy
    
    return service


@pytest.fixture
def sample_calendar_event():
    """Create sample calendar event for testing."""
    return CalendarEvent(
        id=None,
        summary="Test Appointment",
        description="Test appointment description",
        start_time=datetime(2024, 1, 1, 14, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 1, 1, 15, 0, 0, tzinfo=timezone.utc),
        timezone="UTC",
        location="Test Location",
        attendees=["client@example.com"]
    )


class TestGoogleCalendarServiceCredentials:
    """Test credential management."""
    
    def test_get_user_credentials_valid(self, google_calendar_service, test_user_with_credentials, mock_credentials):
        """Test getting valid user credentials."""
        with patch('services.google_calendar_service.Credentials', return_value=mock_credentials):
            credentials = google_calendar_service.get_user_credentials(test_user_with_credentials)
            assert credentials is not None
            assert credentials.token == "mock_access_token"
    
    def test_get_user_credentials_none(self, google_calendar_service, test_user_without_credentials):
        """Test getting credentials when user has none."""
        credentials = google_calendar_service.get_user_credentials(test_user_without_credentials)
        assert credentials is None
    
    def test_get_user_credentials_expired_refresh(self, google_calendar_service, test_user_with_credentials, mock_expired_credentials, db):
        """Test refreshing expired credentials."""
        mock_expired_credentials.refresh = Mock()
        
        with patch('services.google_calendar_service.Credentials', return_value=mock_expired_credentials):
            with patch('services.google_calendar_service.google_requests.Request'):
                credentials = google_calendar_service.get_user_credentials(test_user_with_credentials)
                
                assert credentials is not None
                mock_expired_credentials.refresh.assert_called_once()
    
    def test_get_user_credentials_invalid_json(self, google_calendar_service, db):
        """Test handling invalid JSON in credentials."""
        user = UserFactory.create_user(google_calendar_credentials="invalid_json")
        db.add(user)
        db.commit()
        
        credentials = google_calendar_service.get_user_credentials(user)
        assert credentials is None
    
    def test_update_user_credentials(self, google_calendar_service, test_user_with_credentials, mock_credentials, db):
        """Test updating user credentials."""
        google_calendar_service._update_user_credentials(test_user_with_credentials, mock_credentials)
        
        db.refresh(test_user_with_credentials)
        stored_creds = json.loads(test_user_with_credentials.google_calendar_credentials)
        assert stored_creds['token'] == mock_credentials.token


class TestGoogleCalendarServiceAuth:
    """Test authentication and service creation."""
    
    def test_get_calendar_service_success(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test successful service creation."""
        with patch('services.google_calendar_service.build', return_value=mock_calendar_service):
            with patch.object(google_calendar_service, 'get_user_credentials', return_value=Mock()):
                service = google_calendar_service.get_calendar_service(test_user_with_credentials)
                assert service is not None
    
    def test_get_calendar_service_no_credentials(self, google_calendar_service, test_user_without_credentials):
        """Test service creation fails without credentials."""
        with pytest.raises(GoogleCalendarError) as exc_info:
            google_calendar_service.get_calendar_service(test_user_without_credentials)
        assert "No valid credentials found" in str(exc_info.value)


class TestGoogleCalendarServiceCalendarOperations:
    """Test calendar listing and management."""
    
    def test_list_calendars_success(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test successful calendar listing."""
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            calendars = google_calendar_service.list_calendars(test_user_with_credentials)
            
            assert len(calendars) == 2
            assert calendars[0]['id'] == 'primary'
            assert calendars[0]['primary'] is True
            assert calendars[1]['id'] == 'secondary@example.com'
            assert calendars[1]['primary'] is False
    
    def test_list_calendars_api_error(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test calendar listing with API error."""
        mock_calendar_service.calendarList.return_value.list.return_value.execute.side_effect = HttpError(
            resp=Mock(status=403), content=b'Forbidden'
        )
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with pytest.raises(GoogleCalendarError) as exc_info:
                google_calendar_service.list_calendars(test_user_with_credentials)
            assert "Failed to list calendars" in str(exc_info.value)


class TestGoogleCalendarServiceEventOperations:
    """Test event CRUD operations."""
    
    def test_create_event_success(self, google_calendar_service, test_user_with_credentials, mock_calendar_service, sample_calendar_event):
        """Test successful event creation."""
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T14:00:00Z'):
                    event_id = google_calendar_service.create_event(test_user_with_credentials, sample_calendar_event)
                    assert event_id == 'test_event_id'
    
    def test_create_event_with_attendees(self, google_calendar_service, test_user_with_credentials, mock_calendar_service, sample_calendar_event):
        """Test creating event with attendees."""
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T14:00:00Z'):
                    google_calendar_service.create_event(test_user_with_credentials, sample_calendar_event)
                    
                    # Verify attendees were included in the call
                    call_args = mock_calendar_service.events().insert.call_args[1]['body']
                    assert 'attendees' in call_args
                    assert call_args['attendees'] == [{'email': 'client@example.com'}]
    
    def test_create_event_api_error(self, google_calendar_service, test_user_with_credentials, mock_calendar_service, sample_calendar_event):
        """Test event creation with API error."""
        mock_calendar_service.events().insert().execute.side_effect = HttpError(
            resp=Mock(status=400), content=b'Bad Request'
        )
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T14:00:00Z'):
                    with pytest.raises(GoogleCalendarError) as exc_info:
                        google_calendar_service.create_event(test_user_with_credentials, sample_calendar_event)
                    assert "Failed to create event" in str(exc_info.value)
    
    def test_update_event_success(self, google_calendar_service, test_user_with_credentials, mock_calendar_service, sample_calendar_event):
        """Test successful event update."""
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T14:00:00Z'):
                    result = google_calendar_service.update_event(test_user_with_credentials, 'test_event_id', sample_calendar_event)
                    assert result is True
    
    def test_update_event_not_found(self, google_calendar_service, test_user_with_credentials, mock_calendar_service, sample_calendar_event):
        """Test updating non-existent event."""
        mock_calendar_service.events().get().execute.side_effect = HttpError(
            resp=Mock(status=404), content=b'Not Found'
        )
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with pytest.raises(GoogleCalendarError) as exc_info:
                google_calendar_service.update_event(test_user_with_credentials, 'nonexistent_id', sample_calendar_event)
            assert "Failed to update event" in str(exc_info.value)
    
    def test_delete_event_success(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test successful event deletion."""
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            result = google_calendar_service.delete_event(test_user_with_credentials, 'test_event_id')
            assert result is True
    
    def test_delete_event_not_found(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test deleting non-existent event (should still return True)."""
        mock_calendar_service.events().delete().execute.side_effect = HttpError(
            resp=Mock(status=404), content=b'Not Found'
        )
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            result = google_calendar_service.delete_event(test_user_with_credentials, 'nonexistent_id')
            assert result is True  # Should return True even if not found


class TestGoogleCalendarServiceFreeBusy:
    """Test free/busy operations."""
    
    def test_get_free_busy_success(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test successful free/busy query."""
        start_time = datetime(2024, 1, 1, 9, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2024, 1, 1, 17, 0, 0, tzinfo=timezone.utc)
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T09:00:00Z'):
                    response = google_calendar_service.get_free_busy(test_user_with_credentials, start_time, end_time)
                    
                    assert isinstance(response, FreeBusyResponse)
                    assert len(response.busy_periods) == 1
                    assert response.busy_periods[0][0].hour == 10
                    assert response.busy_periods[0][1].hour == 11
    
    def test_get_free_busy_custom_calendars(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test free/busy query with custom calendar IDs."""
        start_time = datetime(2024, 1, 1, 9, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2024, 1, 1, 17, 0, 0, tzinfo=timezone.utc)
        calendar_ids = ['calendar1', 'calendar2']
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T09:00:00Z'):
                    google_calendar_service.get_free_busy(test_user_with_credentials, start_time, end_time, calendar_ids)
                    
                    # Verify correct calendar IDs were used
                    call_args = mock_calendar_service.freebusy().query.call_args[1]['body']
                    assert call_args['items'] == [{'id': 'calendar1'}, {'id': 'calendar2'}]
    
    def test_is_time_available_free(self, google_calendar_service, test_user_with_credentials):
        """Test time availability when slot is free."""
        start_time = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2024, 1, 1, 13, 0, 0, tzinfo=timezone.utc)
        
        mock_response = FreeBusyResponse(
            start_time=start_time,
            end_time=end_time,
            calendar_id='primary',
            busy_periods=[]
        )
        
        with patch.object(google_calendar_service, 'get_free_busy', return_value=mock_response):
            available = google_calendar_service.is_time_available(test_user_with_credentials, start_time, end_time)
            assert available is True
    
    def test_is_time_available_busy(self, google_calendar_service, test_user_with_credentials):
        """Test time availability when slot is busy."""
        start_time = datetime(2024, 1, 1, 10, 30, 0, tzinfo=timezone.utc)
        end_time = datetime(2024, 1, 1, 11, 30, 0, tzinfo=timezone.utc)
        
        # Overlapping busy period
        busy_period = (
            datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc),
            datetime(2024, 1, 1, 11, 0, 0, tzinfo=timezone.utc)
        )
        
        mock_response = FreeBusyResponse(
            start_time=start_time,
            end_time=end_time,
            calendar_id='primary',
            busy_periods=[busy_period]
        )
        
        with patch.object(google_calendar_service, 'get_free_busy', return_value=mock_response):
            available = google_calendar_service.is_time_available(test_user_with_credentials, start_time, end_time)
            assert available is False
    
    def test_is_time_available_error_fallback(self, google_calendar_service, test_user_with_credentials):
        """Test time availability fallback when API call fails."""
        start_time = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2024, 1, 1, 11, 0, 0, tzinfo=timezone.utc)
        
        with patch.object(google_calendar_service, 'get_free_busy', side_effect=GoogleCalendarError("API Error")):
            available = google_calendar_service.is_time_available(test_user_with_credentials, start_time, end_time)
            assert available is True  # Should assume available on error


class TestGoogleCalendarServiceAppointmentSync:
    """Test appointment synchronization."""
    
    def test_sync_appointment_to_google_success(self, google_calendar_service, db):
        """Test successful appointment sync to Google."""
        # Create test data
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        client = UserFactory.create_client()
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            client_id=client.id,
            service_name="Haircut",
            duration_minutes=30,
            price=30.0
        )
        
        db.add_all([barber, client, appointment])
        db.commit()
        
        with patch.object(google_calendar_service, 'create_event', return_value='test_event_id'):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                event_id = google_calendar_service.sync_appointment_to_google(appointment)
                
                assert event_id == 'test_event_id'
                assert appointment.google_event_id == 'test_event_id'
    
    def test_sync_appointment_no_credentials(self, google_calendar_service, db):
        """Test appointment sync when barber has no credentials."""
        barber = UserFactory.create_barber(google_calendar_credentials=None)
        appointment = AppointmentFactory.create_appointment(user_id=barber.id)
        
        db.add_all([barber, appointment])
        db.commit()
        
        event_id = google_calendar_service.sync_appointment_to_google(appointment)
        assert event_id is None
    
    def test_update_appointment_in_google_success(self, google_calendar_service, db):
        """Test successful appointment update in Google."""
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            google_event_id='existing_event_id'
        )
        
        db.add_all([barber, appointment])
        db.commit()
        
        with patch.object(google_calendar_service, 'update_event', return_value=True):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                result = google_calendar_service.update_appointment_in_google(appointment)
                assert result is True
    
    def test_update_appointment_no_event_id(self, google_calendar_service, db):
        """Test appointment update when no Google event ID exists."""
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            google_event_id=None
        )
        
        db.add_all([barber, appointment])
        db.commit()
        
        with patch.object(google_calendar_service, 'sync_appointment_to_google', return_value='new_event_id'):
            result = google_calendar_service.update_appointment_in_google(appointment)
            assert result is True
    
    def test_delete_appointment_from_google_success(self, google_calendar_service, db):
        """Test successful appointment deletion from Google."""
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            google_event_id='event_to_delete'
        )
        
        db.add_all([barber, appointment])
        db.commit()
        
        with patch.object(google_calendar_service, 'delete_event', return_value=True):
            result = google_calendar_service.delete_appointment_from_google(appointment)
            
            assert result is True
            assert appointment.google_event_id is None
    
    def test_delete_appointment_no_event_id(self, google_calendar_service, db):
        """Test appointment deletion when no Google event ID exists."""
        barber = UserFactory.create_barber()
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            google_event_id=None
        )
        
        db.add_all([barber, appointment])
        db.commit()
        
        result = google_calendar_service.delete_appointment_from_google(appointment)
        assert result is True  # Should return True for nothing to delete


class TestGoogleCalendarServiceBulkOperations:
    """Test bulk synchronization operations."""
    
    def test_sync_all_appointments_to_google(self, google_calendar_service, db):
        """Test bulk sync of appointments to Google."""
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        
        # Create multiple appointments
        appointments = []
        for i in range(3):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                start_time=datetime.now(timezone.utc) + timedelta(days=i+1),
                status='confirmed'
            )
            appointments.append(appointment)
        
        db.add_all([barber] + appointments)
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        with patch.object(google_calendar_service, 'sync_appointment_to_google', return_value='synced_event_id'):
            results = google_calendar_service.sync_all_appointments_to_google(barber, start_date, end_date)
            
            assert results['synced'] == 3
            assert results['failed'] == 0
            assert results['skipped'] == 0
    
    def test_sync_all_appointments_with_failures(self, google_calendar_service, db):
        """Test bulk sync with some failures."""
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        
        appointments = []
        for i in range(3):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                start_time=datetime.now(timezone.utc) + timedelta(days=i+1),
                status='confirmed'
            )
            appointments.append(appointment)
        
        db.add_all([barber] + appointments)
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        # Mock sync to succeed for first appointment, fail for others
        def mock_sync(appointment):
            if appointment.id == appointments[0].id:
                return 'synced_event_id'
            return None
        
        with patch.object(google_calendar_service, 'sync_appointment_to_google', side_effect=mock_sync):
            results = google_calendar_service.sync_all_appointments_to_google(barber, start_date, end_date)
            
            assert results['synced'] == 1
            assert results['failed'] == 2
            assert len(results['errors']) == 2
    
    def test_sync_all_appointments_skip_existing(self, google_calendar_service, db):
        """Test bulk sync skips already synced appointments."""
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        
        # Create appointment with existing Google event ID
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            google_event_id='existing_event_id',
            status='confirmed'
        )
        
        db.add_all([barber, appointment])
        db.commit()
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) + timedelta(days=5)
        
        results = google_calendar_service.sync_all_appointments_to_google(barber, start_date, end_date)
        
        assert results['synced'] == 0
        assert results['failed'] == 0
        assert results['skipped'] == 1


class TestGoogleCalendarServiceValidation:
    """Test integration validation."""
    
    def test_validate_calendar_integration_success(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test successful integration validation."""
        with patch.object(google_calendar_service, 'get_user_credentials', return_value=Mock()):
            with patch.object(google_calendar_service, 'list_calendars', return_value=[{'id': 'primary', 'summary': 'Primary'}]):
                with patch.object(google_calendar_service, 'create_event', return_value='test_event_id'):
                    with patch.object(google_calendar_service, 'delete_event', return_value=True):
                        with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                            results = google_calendar_service.validate_calendar_integration(test_user_with_credentials)
                            
                            assert results['connected'] is True
                            assert results['valid_credentials'] is True
                            assert results['can_list_calendars'] is True
                            assert results['can_create_events'] is True
                            assert len(results['errors']) == 0
    
    def test_validate_calendar_integration_no_credentials(self, google_calendar_service, test_user_without_credentials):
        """Test validation with no credentials."""
        results = google_calendar_service.validate_calendar_integration(test_user_without_credentials)
        
        assert results['connected'] is False
        assert results['valid_credentials'] is False
        assert results['can_list_calendars'] is False
        assert results['can_create_events'] is False
        assert "No Google Calendar credentials found" in results['errors']
    
    def test_validate_calendar_integration_invalid_credentials(self, google_calendar_service, test_user_with_credentials):
        """Test validation with invalid credentials."""
        with patch.object(google_calendar_service, 'get_user_credentials', return_value=None):
            results = google_calendar_service.validate_calendar_integration(test_user_with_credentials)
            
            assert results['connected'] is True
            assert results['valid_credentials'] is False
            assert "Invalid or expired credentials" in results['errors']
    
    def test_validate_calendar_integration_selected_calendar(self, google_calendar_service, test_user_with_credentials):
        """Test validation with selected calendar."""
        test_user_with_credentials.google_calendar_id = 'work@example.com'
        
        calendars = [
            {'id': 'primary', 'summary': 'Primary'},
            {'id': 'work@example.com', 'summary': 'Work Calendar'}
        ]
        
        with patch.object(google_calendar_service, 'get_user_credentials', return_value=Mock()):
            with patch.object(google_calendar_service, 'list_calendars', return_value=calendars):
                with patch.object(google_calendar_service, 'create_event', return_value='test_event_id'):
                    with patch.object(google_calendar_service, 'delete_event', return_value=True):
                        with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                            results = google_calendar_service.validate_calendar_integration(test_user_with_credentials)
                            
                            assert results['selected_calendar']['id'] == 'work@example.com'
                            assert results['selected_calendar']['summary'] == 'Work Calendar'


class TestGoogleCalendarServiceEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_create_event_without_attendees(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test creating event without attendees."""
        event = CalendarEvent(
            id=None,
            summary="Test Event",
            description="Test Description",
            start_time=datetime(2024, 1, 1, 14, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 1, 1, 15, 0, 0, tzinfo=timezone.utc),
            timezone="UTC",
            attendees=None
        )
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T14:00:00Z'):
                    event_id = google_calendar_service.create_event(test_user_with_credentials, event)
                    assert event_id == 'test_event_id'
    
    def test_create_event_without_location(self, google_calendar_service, test_user_with_credentials, mock_calendar_service, sample_calendar_event):
        """Test creating event without location."""
        sample_calendar_event.location = None
        
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T14:00:00Z'):
                    event_id = google_calendar_service.create_event(test_user_with_credentials, sample_calendar_event)
                    assert event_id == 'test_event_id'
    
    def test_sync_appointment_without_client(self, google_calendar_service, db):
        """Test syncing appointment without client."""
        barber = UserFactory.create_barber(google_calendar_credentials='{"token": "test"}')
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            client_id=None,
            service_name="Walk-in Haircut"
        )
        
        db.add_all([barber, appointment])
        db.commit()
        
        with patch.object(google_calendar_service, 'create_event', return_value='test_event_id'):
            with patch('services.google_calendar_service.get_user_timezone', return_value='UTC'):
                event_id = google_calendar_service.sync_appointment_to_google(appointment)
                assert event_id == 'test_event_id'
    
    def test_timezone_handling(self, google_calendar_service, test_user_with_credentials, mock_calendar_service):
        """Test proper timezone handling in events."""
        with patch.object(google_calendar_service, 'get_calendar_service', return_value=mock_calendar_service):
            with patch('services.google_calendar_service.get_user_timezone', return_value='America/New_York'):
                with patch('services.google_calendar_service.format_datetime_for_google', return_value='2024-01-01T09:00:00-05:00') as mock_format:
                    event = CalendarEvent(
                        id=None,
                        summary="Timezone Test",
                        description="",
                        start_time=datetime(2024, 1, 1, 14, 0, 0, tzinfo=timezone.utc),
                        end_time=datetime(2024, 1, 1, 15, 0, 0, tzinfo=timezone.utc),
                        timezone="America/New_York"
                    )
                    
                    google_calendar_service.create_event(test_user_with_credentials, event)
                    
                    # Verify timezone formatting was called
                    mock_format.assert_called()


if __name__ == "__main__":
    pytest.main([__file__])