"""
Timezone utilities for booking tests and services.
Provides timezone-aware datetime functions for the booking system.
"""

from datetime import datetime, timezone as dt_timezone
from utils.timezone import get_business_timezone, convert_to_timezone
import pytz


def get_timezone_aware_now(tz: str = None) -> datetime:
    """
    Get current datetime with timezone awareness.
    
    Args:
        tz: Timezone string (defaults to business timezone)
    
    Returns:
        datetime: Current datetime with timezone info
    """
    if tz is None:
        tz = get_business_timezone()
    
    # Get current UTC time
    utc_now = datetime.now(dt_timezone.utc)
    
    # Convert to target timezone
    target_tz = pytz.timezone(tz)
    return utc_now.astimezone(target_tz)


def make_timezone_aware(dt: datetime, tz: str = None) -> datetime:
    """
    Make a naive datetime timezone-aware.
    
    Args:
        dt: Naive datetime object
        tz: Timezone string (defaults to business timezone)
    
    Returns:
        datetime: Timezone-aware datetime
    """
    if dt.tzinfo is not None:
        return dt  # Already timezone-aware
        
    if tz is None:
        tz = get_business_timezone()
    
    target_tz = pytz.timezone(tz)
    return target_tz.localize(dt)


def convert_to_utc(dt: datetime, source_tz: str = None) -> datetime:
    """
    Convert datetime to UTC.
    
    Args:
        dt: Datetime to convert
        source_tz: Source timezone (required if dt is naive)
    
    Returns:
        datetime: UTC datetime
    """
    if dt.tzinfo is None:
        if source_tz is None:
            source_tz = get_business_timezone()
        dt = make_timezone_aware(dt, source_tz)
    
    return dt.astimezone(dt_timezone.utc)


def get_business_datetime(dt: datetime = None) -> datetime:
    """
    Get datetime in business timezone.
    
    Args:
        dt: Datetime to convert (defaults to now)
    
    Returns:
        datetime: Datetime in business timezone
    """
    if dt is None:
        dt = datetime.now(dt_timezone.utc)
    
    business_tz = get_business_timezone()
    return convert_to_timezone(dt, business_tz)