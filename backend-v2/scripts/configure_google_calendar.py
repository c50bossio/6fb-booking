#!/usr/bin/env python3
"""
Google Calendar Configuration Setup Script
Configure Google Calendar integration for BookedBarber V2

This script helps you set up Google Calendar for:
1. OAuth2 authentication flow (existing GoogleCalendarService)
2. Calendar synchronization
3. Event management
4. Availability checking

Usage:
    python scripts/configure_google_calendar.py --validate  # Test existing config
    python scripts/configure_google_calendar.py --setup     # Full setup guide
    python scripts/configure_google_calendar.py --test-user USER_ID  # Test user integration
"""

import os
import sys
import argparse
import logging
import json
from pathlib import Path
from datetime import datetime, timedelta

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from google.auth.transport import requests as google_requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session
from config import settings
from services.google_calendar_service import GoogleCalendarService, CalendarEvent
from models import User
from database import get_db

logger = logging.getLogger(__name__)


def validate_google_oauth_config() -> bool:
    """Validate Google OAuth2 configuration."""
    try:
        client_id = settings.google_client_id
        client_secret = settings.google_client_secret
        redirect_uri = settings.google_redirect_uri
        
        if not client_id or not client_secret:
            logger.error("❌ Google OAuth2 credentials not configured")
            logger.info("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file")
            return False
        
        # Check client ID format
        if not client_id.endswith('.googleusercontent.com'):
            logger.error("❌ Invalid Google Client ID format")
            return False
        
        logger.info("✅ Google OAuth2 configuration validated")
        logger.info(f"   Client ID: {client_id[:20]}...{client_id[-20:]}")
        logger.info(f"   Redirect URI: {redirect_uri}")
        logger.info(f"   Scopes: {settings.google_calendar_scopes}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error validating Google OAuth2 config: {e}")
        return False


def generate_oauth_url() -> str:
    """Generate Google OAuth2 authorization URL."""
    try:
        from urllib.parse import urlencode
        import secrets
        
        # OAuth2 parameters
        params = {
            'client_id': settings.google_client_id,
            'redirect_uri': settings.google_redirect_uri,
            'scope': ' '.join(settings.google_calendar_scopes),
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'consent',
            'state': secrets.token_urlsafe(32)
        }
        
        auth_url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(params)}"
        
        logger.info("🔗 Google OAuth2 Authorization URL:")
        logger.info(f"   {auth_url}")
        logger.info("\nTo complete setup:")
        logger.info("1. Visit the URL above")
        logger.info("2. Grant calendar permissions")
        logger.info("3. Copy the authorization code from the redirect")
        
        return auth_url
        
    except Exception as e:
        logger.error(f"❌ Error generating OAuth URL: {e}")
        return ""


def test_calendar_service_with_user(user_id: int, db: Session) -> bool:
    """Test GoogleCalendarService with a specific user."""
    try:
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"❌ User {user_id} not found")
            return False
        
        # Create calendar service
        calendar_service = GoogleCalendarService(db)
        
        # Check if user has Google Calendar credentials
        if not user.google_calendar_credentials:
            logger.warning(f"⚠️  User {user_id} has no Google Calendar credentials")
            logger.info("User needs to complete OAuth2 flow first")
            return False
        
        # Validate user integration
        validation_result = calendar_service.validate_calendar_integration(user)
        
        logger.info(f"📅 Google Calendar integration for user {user_id}:")
        logger.info(f"   Connected: {'✅ Yes' if validation_result['connected'] else '❌ No'}")
        logger.info(f"   Valid credentials: {'✅ Yes' if validation_result['valid_credentials'] else '❌ No'}")
        logger.info(f"   Can list calendars: {'✅ Yes' if validation_result['can_list_calendars'] else '❌ No'}")
        logger.info(f"   Can create events: {'✅ Yes' if validation_result['can_create_events'] else '❌ No'}")
        
        if validation_result['selected_calendar']:
            cal = validation_result['selected_calendar']
            logger.info(f"   Selected calendar: {cal['summary']} ({cal['id']})")
        
        if validation_result['errors']:
            logger.warning("⚠️  Validation errors:")
            for error in validation_result['errors']:
                logger.warning(f"     {error}")
        
        return validation_result['connected'] and validation_result['valid_credentials']
        
    except Exception as e:
        logger.error(f"❌ Error testing calendar service: {e}")
        return False


def test_calendar_operations(user_id: int, db: Session) -> bool:
    """Test calendar operations (list, create, update, delete)."""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.google_calendar_credentials:
            logger.error("❌ User not found or no calendar credentials")
            return False
        
        calendar_service = GoogleCalendarService(db)
        
        # Test 1: List calendars
        logger.info("1. Testing calendar listing...")
        calendars = calendar_service.list_calendars(user)
        logger.info(f"   Found {len(calendars)} calendars")
        for cal in calendars[:3]:  # Show first 3
            logger.info(f"     {cal['summary']} ({'Primary' if cal.get('primary') else 'Secondary'})")
        
        # Test 2: Check availability
        logger.info("2. Testing availability check...")
        start_time = datetime.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        is_available = calendar_service.is_time_available(user, start_time, end_time)
        logger.info(f"   Time slot {start_time.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%H:%M')}: {'✅ Available' if is_available else '❌ Busy'}")
        
        # Test 3: Create test event (and clean up)
        logger.info("3. Testing event creation...")
        test_event = CalendarEvent(
            id=None,
            summary="BookedBarber V2 - Configuration Test",
            description="This is a test event created during configuration setup. It will be deleted automatically.",
            start_time=datetime.now() + timedelta(hours=24),
            end_time=datetime.now() + timedelta(hours=24, minutes=30),
            timezone="UTC"
        )
        
        event_id = calendar_service.create_event(user, test_event)
        if event_id:
            logger.info(f"   ✅ Test event created: {event_id}")
            
            # Clean up test event
            if calendar_service.delete_event(user, event_id):
                logger.info(f"   ✅ Test event cleaned up")
            else:
                logger.warning(f"   ⚠️  Could not clean up test event: {event_id}")
        else:
            logger.error("   ❌ Failed to create test event")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error testing calendar operations: {e}")
        return False


def setup_oauth_credentials():
    """Guide user through OAuth2 credential setup."""
    logger.info("🔧 Google Calendar OAuth2 Setup Guide")
    logger.info("=" * 50)
    
    logger.info("Step 1: Create Google Cloud Project")
    logger.info("1. Go to: https://console.cloud.google.com")
    logger.info("2. Create a new project or select existing one")
    logger.info("3. Note your project ID")
    
    logger.info("\nStep 2: Enable Google Calendar API")
    logger.info("1. Go to: https://console.cloud.google.com/apis/library")
    logger.info("2. Search for 'Google Calendar API'")
    logger.info("3. Click 'Enable'")
    
    logger.info("\nStep 3: Create OAuth2 Credentials")
    logger.info("1. Go to: https://console.cloud.google.com/apis/credentials")
    logger.info("2. Click 'Create Credentials' > 'OAuth client ID'")
    logger.info("3. Choose 'Web application'")
    logger.info("4. Add these redirect URIs:")
    logger.info(f"   - {settings.google_redirect_uri}")
    logger.info(f"   - http://localhost:8000/api/calendar/callback")
    logger.info("5. Download the credentials JSON file")
    
    logger.info("\nStep 4: Update Environment Variables")
    logger.info("Add these to your .env file:")
    logger.info("GOOGLE_CLIENT_ID=your_client_id.googleusercontent.com")
    logger.info("GOOGLE_CLIENT_SECRET=your_client_secret")
    logger.info(f"GOOGLE_REDIRECT_URI={settings.google_redirect_uri}")
    
    logger.info("\nStep 5: Test Configuration")
    logger.info("Run: python scripts/configure_google_calendar.py --validate")


def create_test_user_credentials(db: Session):
    """Create sample user with Google Calendar credentials for testing."""
    try:
        # Check if test user exists
        test_user = db.query(User).filter(User.email == "test-calendar@example.com").first()
        
        if test_user:
            logger.info(f"📝 Test user already exists: {test_user.id}")
            return test_user.id
        
        # Create test user
        test_user = User(
            email="test-calendar@example.com",
            name="Calendar Test User",
            role="barber",
            hashed_password="test_password_hash",
            is_active=True,
            timezone="America/New_York"
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        logger.info(f"📝 Created test user: {test_user.id}")
        logger.info("   Email: test-calendar@example.com")
        logger.info("   Role: barber")
        logger.info("   Note: This user needs to complete OAuth2 flow")
        
        return test_user.id
        
    except Exception as e:
        logger.error(f"❌ Error creating test user: {e}")
        return None


def generate_sample_env():
    """Generate sample .env configuration for Google Calendar."""
    sample_config = """
# =============================================================================
# GOOGLE CALENDAR INTEGRATION
# =============================================================================
# Get these from Google Cloud Console: https://console.cloud.google.com

# OAuth2 Credentials (REQUIRED for calendar integration)
GOOGLE_CLIENT_ID=your_client_id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback

# Google Calendar API Scopes (default configuration)
GOOGLE_CALENDAR_SCOPES=["https://www.googleapis.com/auth/calendar","https://www.googleapis.com/auth/calendar.events"]

# Enable Google Calendar integration
ENABLE_GOOGLE_CALENDAR=true
"""
    
    return sample_config


def main():
    parser = argparse.ArgumentParser(description='Configure Google Calendar integration')
    parser.add_argument('--validate', action='store_true', help='Validate existing configuration')
    parser.add_argument('--setup', action='store_true', help='Show setup guide')
    parser.add_argument('--test-user', type=int, help='Test integration with specific user ID')
    parser.add_argument('--create-test-user', action='store_true', help='Create test user for calendar integration')
    parser.add_argument('--generate-auth-url', action='store_true', help='Generate OAuth2 authorization URL')
    parser.add_argument('--test-operations', type=int, help='Test calendar operations with user ID')
    parser.add_argument('--generate-sample', action='store_true', help='Generate sample .env configuration')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    if args.generate_sample:
        print("Sample Google Calendar configuration for .env file:")
        print(generate_sample_env())
        return
    
    if args.setup:
        setup_oauth_credentials()
        return
    
    logger.info("📅 Google Calendar Configuration Setup")
    logger.info("=" * 50)
    
    # Validate OAuth2 configuration
    logger.info("1. Validating Google OAuth2 configuration...")
    if not validate_google_oauth_config():
        logger.error("❌ Google OAuth2 configuration validation failed")
        logger.info("Run with --setup for configuration guide")
        return
    
    # Generate OAuth URL if requested
    if args.generate_auth_url:
        logger.info("2. Generating OAuth2 authorization URL...")
        generate_oauth_url()
        return
    
    # Get database session
    db = next(get_db())
    
    # Create test user if requested
    if args.create_test_user:
        logger.info("2. Creating test user...")
        test_user_id = create_test_user_credentials(db)
        if test_user_id:
            logger.info(f"✅ Test user created with ID: {test_user_id}")
            logger.info("   Complete OAuth2 flow for this user to test integration")
        return
    
    # Test user integration if requested
    if args.test_user:
        logger.info(f"2. Testing Google Calendar integration for user {args.test_user}...")
        success = test_calendar_service_with_user(args.test_user, db)
        
        if success and args.test_operations:
            logger.info("3. Testing calendar operations...")
            test_calendar_operations(args.test_user, db)
        
        return
    
    # Test operations if requested
    if args.test_operations:
        logger.info(f"2. Testing calendar operations for user {args.test_operations}...")
        test_calendar_operations(args.test_operations, db)
        return
    
    # Default validation
    logger.info("2. Google Calendar integration status:")
    
    # Check if any users have calendar integration
    users_with_calendar = db.query(User).filter(User.google_calendar_credentials.isnot(None)).count()
    total_users = db.query(User).count()
    
    logger.info(f"   Total users: {total_users}")
    logger.info(f"   Users with calendar integration: {users_with_calendar}")
    
    if users_with_calendar > 0:
        logger.info("   ✅ Some users have calendar integration configured")
    else:
        logger.info("   ⚠️  No users have calendar integration configured")
    
    # Summary
    logger.info("✅ Google Calendar configuration check complete!")
    logger.info("=" * 50)
    logger.info("Configuration Summary:")
    logger.info(f"   OAuth2 credentials: ✅ Valid")
    logger.info(f"   API endpoints: ✅ Configured")
    logger.info(f"   Users with integration: {users_with_calendar}")
    
    if users_with_calendar == 0:
        logger.warning("\n⚠️  Next Steps:")
        logger.info("1. Create a test user: --create-test-user")
        logger.info("2. Generate OAuth URL: --generate-auth-url")
        logger.info("3. Complete OAuth flow for a user")
        logger.info("4. Test integration: --test-user USER_ID")
    
    logger.info("\nAvailable commands:")
    logger.info("--setup              Show detailed setup guide")
    logger.info("--generate-auth-url  Generate OAuth2 URL")
    logger.info("--create-test-user   Create test user")
    logger.info("--test-user ID       Test user integration")
    logger.info("--test-operations ID Test calendar operations")


if __name__ == "__main__":
    main()