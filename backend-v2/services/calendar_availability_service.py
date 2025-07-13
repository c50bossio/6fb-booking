"""
Calendar Availability Service for BookedBarber V2

Integrates with external calendar providers (Google Calendar, etc.) to check
barber availability and prevent double-booking across different calendar systems.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from models import User
from models.integration import Integration, IntegrationType
from services.google_calendar_service import GoogleCalendarService
from utils.timezone import get_business_timezone, convert_to_timezone
import redis
import json
import os

logger = logging.getLogger(__name__)

class CalendarAvailabilityService:
    """Service for checking availability across external calendar providers"""
    
    def __init__(self):
        self.google_calendar_service = None  # Will be initialized when needed
        self.cache_enabled = os.getenv("REDIS_URL") is not None
        self.cache_ttl_seconds = 300  # 5 minutes cache
        
        # Initialize Redis cache if available
        self.redis_client = None
        if self.cache_enabled:
            try:
                from services.redis_service import RedisConnectionManager
                redis_manager = RedisConnectionManager()
                self.redis_client = redis_manager.get_client()
            except Exception as e:
                logger.warning(f"Redis not available for calendar caching: {e}")
                self.cache_enabled = False
    
    def _get_google_calendar_service(self, db: Session) -> GoogleCalendarService:
        """Get or create GoogleCalendarService instance with database session."""
        if self.google_calendar_service is None:
            self.google_calendar_service = GoogleCalendarService(db)
        return self.google_calendar_service
    
    def _get_cache_key(self, barber_id: int, start_time: datetime, end_time: datetime) -> str:
        """Generate cache key for calendar availability"""
        return f"calendar_availability:{barber_id}:{start_time.isoformat()}:{end_time.isoformat()}"
    
    async def check_barber_calendar_availability(
        self,
        db: Session,
        barber_id: int,
        start_time: datetime,
        duration_minutes: int
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Check if barber is available in external calendars
        
        Args:
            db: Database session
            barber_id: ID of the barber to check
            start_time: Start time of the appointment slot
            duration_minutes: Duration of the appointment in minutes
            
        Returns:
            Tuple of (is_available: bool, conflicts: List[dict])
        """
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Check cache first
        if self.cache_enabled and self.redis_client:
            cache_key = self._get_cache_key(barber_id, start_time, end_time)
            try:
                cached_result = self.redis_client.get(cache_key)
                if cached_result:
                    result = json.loads(cached_result)
                    logger.debug(f"Calendar availability cache hit for barber {barber_id}")
                    return result["is_available"], result["conflicts"]
            except Exception as e:
                logger.warning(f"Error reading from calendar cache: {e}")
        
        # Get barber's calendar integrations
        integrations = db.query(Integration).filter(
            Integration.user_id == barber_id,
            Integration.integration_type.in_([
                IntegrationType.GOOGLE_CALENDAR,
                IntegrationType.OUTLOOK_CALENDAR,
                IntegrationType.APPLE_CALENDAR
            ]),
            Integration.is_active == True
        ).all()
        
        if not integrations:
            # No calendar integrations, available by default
            return True, []
        
        all_conflicts = []
        is_available = True
        
        # Check each calendar integration
        for integration in integrations:
            try:
                conflicts = await self._check_integration_conflicts(
                    integration, start_time, end_time
                )
                all_conflicts.extend(conflicts)
                
                # If any calendar has conflicts, slot is not available
                if conflicts:
                    is_available = False
                    
            except Exception as e:
                logger.error(f"Error checking calendar integration {integration.id}: {e}")
                # On error, assume not available for safety
                is_available = False
                all_conflicts.append({
                    "provider": integration.integration_type.value,
                    "error": str(e),
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                })
        
        # Cache the result
        if self.cache_enabled and self.redis_client:
            cache_key = self._get_cache_key(barber_id, start_time, end_time)
            try:
                cache_data = {
                    "is_available": is_available,
                    "conflicts": all_conflicts
                }
                self.redis_client.setex(
                    cache_key, 
                    self.cache_ttl_seconds, 
                    json.dumps(cache_data, default=str)
                )
            except Exception as e:
                logger.warning(f"Error writing to calendar cache: {e}")
        
        return is_available, all_conflicts
    
    async def _check_integration_conflicts(
        self,
        integration: Integration,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Check conflicts for a specific calendar integration"""
        
        if integration.integration_type == IntegrationType.GOOGLE_CALENDAR:
            return await self._check_google_calendar_conflicts(
                integration, start_time, end_time
            )
        elif integration.integration_type == IntegrationType.OUTLOOK_CALENDAR:
            return await self._check_outlook_calendar_conflicts(
                integration, start_time, end_time
            )
        elif integration.integration_type == IntegrationType.APPLE_CALENDAR:
            return await self._check_apple_calendar_conflicts(
                integration, start_time, end_time
            )
        else:
            logger.warning(f"Unsupported calendar integration type: {integration.integration_type}")
            return []
    
    async def _check_google_calendar_conflicts(
        self,
        integration: Integration,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Check Google Calendar for conflicts"""
        try:
            # Get busy periods from Google Calendar
            google_service = self._get_google_calendar_service(db)
            busy_periods = await google_service.get_busy_periods(
                integration=integration,
                start_time=start_time,
                end_time=end_time
            )
            
            conflicts = []
            for period in busy_periods:
                # Check if this busy period overlaps with our time slot
                period_start = datetime.fromisoformat(period["start"].replace("Z", "+00:00"))
                period_end = datetime.fromisoformat(period["end"].replace("Z", "+00:00"))
                
                # Check for overlap
                if not (end_time <= period_start or start_time >= period_end):
                    conflicts.append({
                        "provider": "google_calendar",
                        "title": period.get("summary", "Busy"),
                        "start": period_start.isoformat(),
                        "end": period_end.isoformat(),
                        "event_id": period.get("id")
                    })
            
            return conflicts
            
        except Exception as e:
            logger.error(f"Error checking Google Calendar: {e}")
            raise
    
    async def _check_outlook_calendar_conflicts(
        self,
        integration: Integration,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Check Outlook Calendar for conflicts (placeholder for future implementation)"""
        # TODO: Implement Outlook Calendar integration
        logger.info("Outlook Calendar integration not yet implemented")
        return []
    
    async def _check_apple_calendar_conflicts(
        self,
        integration: Integration,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Check Apple Calendar for conflicts (placeholder for future implementation)"""
        # TODO: Implement Apple Calendar integration
        logger.info("Apple Calendar integration not yet implemented")
        return []
    
    async def get_calendar_conflicts_for_date_range(
        self,
        db: Session,
        barber_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Get all calendar conflicts for a date range
        
        Args:
            db: Database session
            barber_id: ID of the barber
            start_date: Start of the date range
            end_date: End of the date range
            
        Returns:
            List of conflict dictionaries
        """
        # Get barber's calendar integrations
        integrations = db.query(Integration).filter(
            Integration.user_id == barber_id,
            Integration.integration_type.in_([
                IntegrationType.GOOGLE_CALENDAR,
                IntegrationType.OUTLOOK_CALENDAR,
                IntegrationType.APPLE_CALENDAR
            ]),
            Integration.is_active == True
        ).all()
        
        if not integrations:
            return []
        
        all_conflicts = []
        
        # Check each calendar integration
        for integration in integrations:
            try:
                conflicts = await self._check_integration_conflicts(
                    integration, start_date, end_date
                )
                all_conflicts.extend(conflicts)
                
            except Exception as e:
                logger.error(f"Error getting calendar conflicts for integration {integration.id}: {e}")
        
        return all_conflicts
    
    async def sync_barber_calendar(
        self,
        db: Session,
        barber_id: int
    ) -> Dict[str, Any]:
        """
        Trigger a sync of barber's calendar data
        
        Args:
            db: Database session
            barber_id: ID of the barber
            
        Returns:
            Sync result summary
        """
        # Get barber's calendar integrations
        integrations = db.query(Integration).filter(
            Integration.user_id == barber_id,
            Integration.integration_type.in_([
                IntegrationType.GOOGLE_CALENDAR,
                IntegrationType.OUTLOOK_CALENDAR,
                IntegrationType.APPLE_CALENDAR
            ]),
            Integration.is_active == True
        ).all()
        
        sync_results = []
        
        for integration in integrations:
            try:
                if integration.integration_type == IntegrationType.GOOGLE_CALENDAR:
                    google_service = self._get_google_calendar_service(db)
                    result = await google_service.sync_calendar_data(integration)
                    sync_results.append({
                        "provider": "google_calendar",
                        "status": "success",
                        "events_synced": result.get("events_synced", 0),
                        "last_sync": datetime.utcnow().isoformat()
                    })
                else:
                    sync_results.append({
                        "provider": integration.integration_type.value,
                        "status": "not_implemented",
                        "message": f"{integration.integration_type.value} sync not yet implemented"
                    })
                    
            except Exception as e:
                logger.error(f"Error syncing calendar integration {integration.id}: {e}")
                sync_results.append({
                    "provider": integration.integration_type.value,
                    "status": "error",
                    "error": str(e)
                })
        
        # Clear cache for this barber after sync
        if self.cache_enabled and self.redis_client:
            try:
                cache_pattern = f"calendar_availability:{barber_id}:*"
                # Use Redis SCAN to find and delete cache keys
                for key in self.redis_client.scan_iter(match=cache_pattern):
                    self.redis_client.delete(key)
                logger.info(f"Cleared calendar cache for barber {barber_id}")
            except Exception as e:
                logger.warning(f"Error clearing calendar cache: {e}")
        
        return {
            "barber_id": barber_id,
            "sync_timestamp": datetime.utcnow().isoformat(),
            "integrations_synced": len(sync_results),
            "results": sync_results
        }
    
    def clear_cache_for_barber(self, barber_id: int):
        """Clear calendar availability cache for a specific barber"""
        if not self.cache_enabled or not self.redis_client:
            return
        
        try:
            cache_pattern = f"calendar_availability:{barber_id}:*"
            deleted_count = 0
            for key in self.redis_client.scan_iter(match=cache_pattern):
                self.redis_client.delete(key)
                deleted_count += 1
            
            if deleted_count > 0:
                logger.info(f"Cleared {deleted_count} calendar cache entries for barber {barber_id}")
                
        except Exception as e:
            logger.warning(f"Error clearing calendar cache for barber {barber_id}: {e}")
    
    async def validate_calendar_integrations(
        self,
        db: Session,
        barber_id: int
    ) -> Dict[str, Any]:
        """
        Validate all calendar integrations for a barber
        
        Args:
            db: Database session
            barber_id: ID of the barber
            
        Returns:
            Validation results
        """
        integrations = db.query(Integration).filter(
            Integration.user_id == barber_id,
            Integration.integration_type.in_([
                IntegrationType.GOOGLE_CALENDAR,
                IntegrationType.OUTLOOK_CALENDAR,
                IntegrationType.APPLE_CALENDAR
            ])
        ).all()
        
        validation_results = []
        
        for integration in integrations:
            try:
                if integration.integration_type == IntegrationType.GOOGLE_CALENDAR:
                    # Test Google Calendar connection
                    google_service = self._get_google_calendar_service(db)
                    is_valid = await google_service.validate_integration(integration)
                    validation_results.append({
                        "provider": "google_calendar",
                        "status": "valid" if is_valid else "invalid",
                        "is_active": integration.is_active,
                        "last_validated": datetime.utcnow().isoformat()
                    })
                else:
                    validation_results.append({
                        "provider": integration.integration_type.value,
                        "status": "not_implemented",
                        "is_active": integration.is_active,
                        "message": f"{integration.integration_type.value} validation not yet implemented"
                    })
                    
            except Exception as e:
                logger.error(f"Error validating calendar integration {integration.id}: {e}")
                validation_results.append({
                    "provider": integration.integration_type.value,
                    "status": "error",
                    "error": str(e),
                    "is_active": integration.is_active
                })
        
        return {
            "barber_id": barber_id,
            "validation_timestamp": datetime.utcnow().isoformat(),
            "total_integrations": len(integrations),
            "active_integrations": len([i for i in integrations if i.is_active]),
            "results": validation_results
        }


# Singleton instance
calendar_availability_service = CalendarAvailabilityService()