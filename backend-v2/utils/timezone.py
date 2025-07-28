"""Timezone utilities for the booking system."""

import pytz
from datetime import datetime
from typing import List, Optional


def validate_timezone(timezone_str: str) -> bool:
    """
    Validate if a timezone string is valid.
    
    Args:
        timezone_str: The timezone string to validate (e.g., 'America/New_York')
        
    Returns:
        bool: True if valid, False otherwise
    """
    try:
        pytz.timezone(timezone_str)
        return True
    except pytz.exceptions.UnknownTimeZoneError:
        return False


def get_common_timezones() -> List[str]:
    """
    Get a list of common timezones for user selection.
    
    Returns:
        List of timezone strings
    """
    common_timezones = [
        # US Timezones
        'America/New_York',      # Eastern Time
        'America/Chicago',       # Central Time
        'America/Denver',        # Mountain Time
        'America/Phoenix',       # Arizona (no DST)
        'America/Los_Angeles',   # Pacific Time
        'America/Anchorage',     # Alaska Time
        'Pacific/Honolulu',      # Hawaii Time
        
        # Canada
        'America/Toronto',       # Eastern Time
        'America/Vancouver',     # Pacific Time
        'America/Halifax',       # Atlantic Time
        
        # Europe
        'Europe/London',         # GMT/BST
        'Europe/Paris',          # Central European Time
        'Europe/Berlin',         # Central European Time
        'Europe/Rome',           # Central European Time
        'Europe/Madrid',         # Central European Time
        'Europe/Amsterdam',      # Central European Time
        'Europe/Stockholm',      # Central European Time
        'Europe/Athens',         # Eastern European Time
        
        # Asia
        'Asia/Tokyo',            # Japan Standard Time
        'Asia/Shanghai',         # China Standard Time
        'Asia/Hong_Kong',        # Hong Kong Time
        'Asia/Singapore',        # Singapore Time
        'Asia/Dubai',            # Gulf Standard Time
        'Asia/Kolkata',          # India Standard Time
        'Asia/Seoul',            # Korea Standard Time
        
        # Australia/Pacific
        'Australia/Sydney',      # Australian Eastern Time
        'Australia/Melbourne',   # Australian Eastern Time
        'Australia/Perth',       # Australian Western Time
        'Pacific/Auckland',      # New Zealand Time
        
        # Others
        'UTC',                   # Coordinated Universal Time
        'Africa/Cairo',          # Eastern European Time
        'Africa/Johannesburg',   # South Africa Standard Time
        'America/Sao_Paulo',     # Brasilia Time
        'America/Mexico_City',   # Central Time (Mexico)
        'America/Buenos_Aires',  # Argentina Time
    ]
    
    return common_timezones


def convert_timezone(dt: datetime, from_tz: str, to_tz: str) -> datetime:
    """
    Convert a datetime from one timezone to another.
    
    Args:
        dt: The datetime to convert
        from_tz: The source timezone string
        to_tz: The target timezone string
        
    Returns:
        datetime: The converted datetime in the target timezone
        
    Raises:
        pytz.exceptions.UnknownTimeZoneError: If timezone strings are invalid
    """
    # Get timezone objects
    from_timezone = pytz.timezone(from_tz)
    to_timezone = pytz.timezone(to_tz)
    
    # If the datetime is naive, localize it to the source timezone
    if dt.tzinfo is None:
        dt = from_timezone.localize(dt)
    else:
        # If it already has timezone info, convert to source timezone
        dt = dt.astimezone(from_timezone)
    
    # Convert to target timezone
    return dt.astimezone(to_timezone)


def get_timezone_offset(timezone_str: str, dt: Optional[datetime] = None) -> str:
    """
    Get the UTC offset for a timezone at a specific datetime.
    
    Args:
        timezone_str: The timezone string
        dt: The datetime to check (defaults to now)
        
    Returns:
        str: The UTC offset (e.g., '+05:30', '-08:00')
    """
    if dt is None:
        dt = datetime.now()
    
    tz = pytz.timezone(timezone_str)
    
    # Localize the datetime to the timezone
    if dt.tzinfo is None:
        localized_dt = tz.localize(dt)
    else:
        localized_dt = dt.astimezone(tz)
    
    # Get the offset
    offset = localized_dt.strftime('%z')
    
    # Format the offset nicely (e.g., '+0530' -> '+05:30')
    if offset:
        return f"{offset[:3]}:{offset[3:]}"
    return "+00:00"


def get_timezone_display_name(timezone_str: str) -> str:
    """
    Get a user-friendly display name for a timezone.
    
    Args:
        timezone_str: The timezone string
        
    Returns:
        str: Display name (e.g., 'America/New_York (EST/EDT)')
    """
    try:
        tz = pytz.timezone(timezone_str)
        # Get both standard and daylight time abbreviations
        now = datetime.now()
        
        # Get current abbreviation
        current_abbr = tz.localize(now).strftime('%Z')
        
        # For display, show the timezone with current abbreviation
        return f"{timezone_str} ({current_abbr})"
    except:
        return timezone_str


def get_business_hours_in_user_timezone(
    business_start: datetime,
    business_end: datetime,
    business_tz: str,
    user_tz: str
) -> tuple[datetime, datetime]:
    """
    Convert business hours from business timezone to user timezone.
    
    Args:
        business_start: Business start time in business timezone
        business_end: Business end time in business timezone
        business_tz: Business timezone string
        user_tz: User timezone string
        
    Returns:
        tuple: (start_time_in_user_tz, end_time_in_user_tz)
    """
    # Convert both times to user timezone
    user_start = convert_timezone(business_start, business_tz, user_tz)
    user_end = convert_timezone(business_end, business_tz, user_tz)
    
    return user_start, user_end


def get_user_timezone(user) -> str:
    """Get user's timezone, defaulting to UTC if not set."""
    return getattr(user, 'timezone', 'UTC') or 'UTC'


def convert_to_timezone(dt: datetime, target_tz: str) -> datetime:
    """Convert datetime to target timezone."""
    if dt.tzinfo is None:
        # Assume UTC if no timezone info
        dt = pytz.UTC.localize(dt)
    
    target_timezone = pytz.timezone(target_tz)
    return dt.astimezone(target_timezone)


def format_datetime_for_timezone(dt: datetime, timezone_str: str = "UTC") -> str:
    """
    Format a datetime for a specific timezone.
    
    Args:
        dt: The datetime to format
        timezone_str: The timezone string (default: UTC)
        
    Returns:
        Formatted datetime string
    """
    try:
        tz = pytz.timezone(timezone_str)
        if dt.tzinfo is None:
            dt = pytz.UTC.localize(dt)
        localized_dt = dt.astimezone(tz)
        return localized_dt.strftime('%Y-%m-%d %H:%M:%S %Z')
    except Exception:
        return dt.strftime('%Y-%m-%d %H:%M:%S UTC')

def format_datetime_for_google(dt: datetime, timezone_str: str) -> str:
    """Format datetime for Google Calendar API (RFC3339)."""
    if dt.tzinfo is None:
        # Localize to specified timezone
        tz = pytz.timezone(timezone_str)
        dt = tz.localize(dt)
    
    # Convert to ISO format with timezone
    return dt.isoformat()


def parse_google_datetime(dt_str: str) -> datetime:
    """Parse Google Calendar datetime string to datetime object."""
    if dt_str.endswith('Z'):
        # UTC time
        dt_str = dt_str[:-1] + '+00:00'
    
    return datetime.fromisoformat(dt_str)


def convert_to_user_timezone(dt: datetime, user_timezone: str) -> datetime:
    """Convert a datetime to user's timezone for display."""
    return convert_to_timezone(dt, user_timezone)


def get_business_timezone() -> str:
    """Get the business timezone - defaults to UTC."""
    # In production, this could come from business settings
    from config import settings
    return getattr(settings, 'business_timezone', 'UTC')