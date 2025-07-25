"""
Comprehensive timezone service for the booking system.
Handles timezone conversions, validations, and caching.
"""

import pytz
import logging
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
import models
from utils.timezone import validate_timezone, get_common_timezones
import json

logger = logging.getLogger(__name__)

class TimezoneService:
    """Centralized timezone service for all timezone operations."""
    
    def __init__(self):
        self._timezone_cache: Dict[str, Dict[str, Any]] = {}
        self._last_cache_update = None
        self.cache_ttl = timedelta(hours=1)  # Cache timezone info for 1 hour
    
    def get_user_timezone(self, user: models.User) -> str:
        """Get user's preferred timezone with fallback logic."""
        if user and hasattr(user, 'timezone_preference') and user.timezone_preference:
            if validate_timezone(user.timezone_preference):
                return user.timezone_preference
        
        # Fallback to legacy timezone field
        if user and hasattr(user, 'timezone') and user.timezone:
            if validate_timezone(user.timezone):
                return user.timezone
        
        # Final fallback to UTC
        return 'UTC'
    
    def get_business_timezone(self, db: Session, location_id: Optional[int] = None) -> str:
        """Get business timezone for a specific location or default."""
        
        # Try to get location-specific timezone
        if location_id:
            try:
                location = db.query(models.BarbershopLocation).filter(
                    models.BarbershopLocation.id == location_id
                ).first()
                if location and hasattr(location, 'location_timezone') and location.location_timezone:
                    if validate_timezone(location.location_timezone):
                        return location.location_timezone
            except Exception as e:
                logger.warning(f"Could not get location timezone for location {location_id}: {e}")
        
        # Fallback to booking settings
        try:
            settings = db.query(models.BookingSettings).filter(
                models.BookingSettings.business_id == 1
            ).first()
            if settings and hasattr(settings, 'business_timezone') and settings.business_timezone:
                if validate_timezone(settings.business_timezone):
                    return settings.business_timezone
        except Exception as e:
            logger.warning(f"Could not get business timezone from settings: {e}")
        
        # Final fallback
        return 'America/New_York'
    
    def convert_datetime(
        self, 
        dt: datetime, 
        from_tz: str, 
        to_tz: str,
        log_conversion: bool = False,
        db: Optional[Session] = None,
        user_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        conversion_type: str = 'general'
    ) -> datetime:
        """
        Convert datetime between timezones with optional logging.
        
        Args:
            dt: Datetime to convert
            from_tz: Source timezone string
            to_tz: Target timezone string
            log_conversion: Whether to log this conversion
            db: Database session for logging
            user_id: User ID for logging
            appointment_id: Appointment ID for logging
            conversion_type: Type of conversion for logging
        
        Returns:
            Converted datetime in target timezone
        """
        try:
            # Validate timezones
            source_tz = pytz.timezone(from_tz)
            target_tz = pytz.timezone(to_tz)
            
            # Handle naive datetime
            if dt.tzinfo is None:
                dt_aware = source_tz.localize(dt)
            else:
                dt_aware = dt.astimezone(source_tz)
            
            # Convert to target timezone
            converted_dt = dt_aware.astimezone(target_tz)
            
            # Log conversion if requested and database available
            if log_conversion and db:
                self._log_timezone_conversion(
                    db=db,
                    user_id=user_id,
                    appointment_id=appointment_id,
                    source_timezone=from_tz,
                    target_timezone=to_tz,
                    source_datetime=dt,
                    target_datetime=converted_dt,
                    conversion_type=conversion_type
                )
            
            return converted_dt
            
        except Exception as e:
            logger.error(f"Timezone conversion failed: {from_tz} -> {to_tz}: {e}")
            # Return original datetime if conversion fails
            return dt
    
    def convert_to_utc(
        self, 
        dt: datetime, 
        from_tz: str,
        log_conversion: bool = False,
        **log_kwargs
    ) -> datetime:
        """Convert datetime to UTC for database storage."""
        return self.convert_datetime(
            dt=dt,
            from_tz=from_tz,
            to_tz='UTC',
            log_conversion=log_conversion,
            conversion_type='to_utc',
            **log_kwargs
        )
    
    def convert_from_utc(
        self, 
        dt: datetime, 
        to_tz: str,
        log_conversion: bool = False,
        **log_kwargs
    ) -> datetime:
        """Convert datetime from UTC to target timezone for display."""
        return self.convert_datetime(
            dt=dt,
            from_tz='UTC',
            to_tz=to_tz,
            log_conversion=log_conversion,
            conversion_type='from_utc',
            **log_kwargs
        )
    
    def get_timezone_offset(self, timezone_str: str, dt: Optional[datetime] = None) -> str:
        """Get UTC offset for timezone at specific datetime."""
        try:
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
            
            # Format as +HH:MM or -HH:MM
            if offset:
                return f"{offset[:3]}:{offset[3:]}"
            return "+00:00"
            
        except Exception as e:
            logger.error(f"Failed to get timezone offset for {timezone_str}: {e}")
            return "+00:00"
    
    def get_timezone_info(self, timezone_str: str) -> Dict[str, Any]:
        """Get comprehensive timezone information."""
        
        # Check cache first
        if timezone_str in self._timezone_cache:
            cached_info = self._timezone_cache[timezone_str]
            if (datetime.now() - cached_info['cached_at']) < self.cache_ttl:
                return cached_info
        
        try:
            tz = pytz.timezone(timezone_str)
            now = datetime.now(tz)
            
            # Get current offset
            current_offset = self.get_timezone_offset(timezone_str, now)
            
            # Check if DST is currently active
            is_dst = bool(now.dst())
            
            # Get standard time offset (estimate)
            jan_dt = tz.localize(datetime(now.year, 1, 15))
            jul_dt = tz.localize(datetime(now.year, 7, 15))
            std_offset = min(jan_dt.strftime('%z'), jul_dt.strftime('%z'))
            std_offset = f"{std_offset[:3]}:{std_offset[3:]}" if std_offset else "+00:00"
            
            # Create display name
            display_name = timezone_str.replace('_', ' ').replace('/', ' - ')
            display_name = f"{display_name} ({current_offset})"
            
            # Determine region and country
            parts = timezone_str.split('/')
            region = parts[0] if len(parts) > 0 else 'Unknown'
            country = None
            if region in ['America', 'US']:
                country = 'US'
            elif region == 'Europe':
                country = 'EU'
            elif region == 'Asia':
                country = 'AS'
            elif region == 'Australia':
                country = 'AU'
            elif region == 'Africa':
                country = 'AF'
            
            info = {
                'timezone_name': timezone_str,
                'display_name': display_name,
                'current_offset': current_offset,
                'standard_offset': std_offset,
                'is_dst_active': is_dst,
                'region': region,
                'country': country,
                'is_common': timezone_str in get_common_timezones(),
                'abbreviation': now.strftime('%Z'),
                'cached_at': datetime.now()
            }
            
            # Cache the info
            self._timezone_cache[timezone_str] = info
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get timezone info for {timezone_str}: {e}")
            return {
                'timezone_name': timezone_str,
                'display_name': timezone_str,
                'current_offset': '+00:00',
                'standard_offset': '+00:00',
                'is_dst_active': False,
                'region': 'Unknown',
                'country': None,
                'is_common': False,
                'abbreviation': '',
                'cached_at': datetime.now()
            }
    
    def update_user_timezone(
        self, 
        db: Session, 
        user_id: int, 
        timezone_str: str,
        auto_detected: bool = False
    ) -> bool:
        """Update user's timezone preference."""
        
        # Validate timezone
        if not validate_timezone(timezone_str):
            logger.warning(f"Invalid timezone {timezone_str} for user {user_id}")
            return False
        
        try:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                logger.warning(f"User {user_id} not found")
                return False
            
            # Update timezone preference
            if hasattr(user, 'timezone_preference'):
                user.timezone_preference = timezone_str
            else:
                # Fallback to legacy field
                user.timezone = timezone_str
            
            # Update timezone metadata
            if hasattr(user, 'timezone_last_updated'):
                user.timezone_last_updated = datetime.utcnow()
            
            if hasattr(user, 'auto_detect_timezone') and auto_detected:
                user.auto_detect_timezone = True
            
            db.commit()
            logger.info(f"Updated timezone for user {user_id} to {timezone_str}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update timezone for user {user_id}: {e}")
            db.rollback()
            return False
    
    def get_business_hours_in_timezone(
        self, 
        db: Session,
        target_timezone: str,
        location_id: Optional[int] = None,
        date_obj: Optional[date] = None
    ) -> Tuple[Optional[datetime], Optional[datetime]]:
        """Get business hours converted to target timezone for a specific date."""
        
        try:
            # Get booking settings
            settings = db.query(models.BookingSettings).filter(
                models.BookingSettings.business_id == 1
            ).first()
            
            if not settings:
                return None, None
            
            # Get business timezone
            business_tz = self.get_business_timezone(db, location_id)
            
            # Use today if no date provided
            if date_obj is None:
                date_obj = date.today()
            
            # Create business start and end times for the specific date
            business_start = datetime.combine(date_obj, settings.business_start_time)
            business_end = datetime.combine(date_obj, settings.business_end_time)
            
            # Convert to target timezone
            start_converted = self.convert_datetime(
                dt=business_start,
                from_tz=business_tz,
                to_tz=target_timezone
            )
            
            end_converted = self.convert_datetime(
                dt=business_end,
                from_tz=business_tz,
                to_tz=target_timezone
            )
            
            return start_converted, end_converted
            
        except Exception as e:
            logger.error(f"Failed to get business hours in timezone {target_timezone}: {e}")
            return None, None
    
    def is_timezone_allowed(self, db: Session, timezone_str: str) -> bool:
        """Check if timezone is allowed by business settings."""
        
        try:
            settings = db.query(models.BookingSettings).filter(
                models.BookingSettings.business_id == 1
            ).first()
            
            # If no restrictions configured, allow all valid timezones
            if not settings or not hasattr(settings, 'allowed_timezones') or not settings.allowed_timezones:
                return validate_timezone(timezone_str)
            
            # Check if timezone is in allowed list
            allowed_timezones = settings.allowed_timezones
            if isinstance(allowed_timezones, str):
                allowed_timezones = json.loads(allowed_timezones)
            
            return timezone_str in allowed_timezones
            
        except Exception as e:
            logger.error(f"Failed to check if timezone {timezone_str} is allowed: {e}")
            return validate_timezone(timezone_str)
    
    def sync_timezone_cache(self, db: Session) -> bool:
        """Sync timezone information to database cache."""
        
        try:
            common_timezones = get_common_timezones()
            
            for tz_name in common_timezones:
                info = self.get_timezone_info(tz_name)
                
                # Check if timezone exists in cache table
                existing = db.query(models.TimezoneCache).filter(
                    models.TimezoneCache.timezone_name == tz_name
                ).first()
                
                if existing:
                    # Update existing record
                    existing.display_name = info['display_name']
                    existing.utc_offset = info['current_offset']
                    existing.dst_offset = info['standard_offset']
                    existing.is_dst_active = info['is_dst_active']
                    existing.is_common = info['is_common']
                    existing.region = info['region']
                    existing.country = info['country']
                    existing.last_updated = datetime.utcnow()
                else:
                    # Create new record
                    new_tz = models.TimezoneCache(
                        timezone_name=tz_name,
                        display_name=info['display_name'],
                        utc_offset=info['current_offset'],
                        dst_offset=info['standard_offset'],
                        is_dst_active=info['is_dst_active'],
                        is_common=info['is_common'],
                        region=info['region'],
                        country=info['country'],
                        last_updated=datetime.utcnow(),
                        created_at=datetime.utcnow()
                    )
                    db.add(new_tz)
            
            db.commit()
            logger.info("Timezone cache synchronized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync timezone cache: {e}")
            db.rollback()
            return False
    
    def _log_timezone_conversion(
        self,
        db: Session,
        source_timezone: str,
        target_timezone: str,
        source_datetime: datetime,
        target_datetime: datetime,
        conversion_type: str,
        user_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """Log timezone conversion for debugging."""
        
        try:
            log_entry = models.TimezoneConversionLog(
                user_id=user_id,
                appointment_id=appointment_id,
                source_timezone=source_timezone,
                target_timezone=target_timezone,
                source_datetime=source_datetime.replace(tzinfo=None),
                target_datetime=target_datetime.replace(tzinfo=None),
                conversion_type=conversion_type,
                context=context,
                created_at=datetime.utcnow()
            )
            
            db.add(log_entry)
            # Don't commit here - let the caller handle the transaction
            
        except Exception as e:
            logger.warning(f"Failed to log timezone conversion: {e}")


# Global timezone service instance
timezone_service = TimezoneService()


# Convenience functions for backward compatibility
def get_user_timezone(user: models.User) -> str:
    """Get user's timezone."""
    return timezone_service.get_user_timezone(user)


def get_business_timezone(db: Session, location_id: Optional[int] = None) -> str:
    """Get business timezone."""
    return timezone_service.get_business_timezone(db, location_id)


def convert_to_utc(dt: datetime, from_tz: str) -> datetime:
    """Convert datetime to UTC."""
    return timezone_service.convert_to_utc(dt, from_tz)


def convert_from_utc(dt: datetime, to_tz: str) -> datetime:
    """Convert datetime from UTC."""
    return timezone_service.convert_from_utc(dt, to_tz)


def update_user_timezone(db: Session, user_id: int, timezone_str: str) -> bool:
    """Update user timezone."""
    return timezone_service.update_user_timezone(db, user_id, timezone_str)