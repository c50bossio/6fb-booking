"""
Meta event deduplication service for BookedBarber V2
Handles deduplication between Meta Pixel (client-side) and Conversions API (server-side)
to prevent double counting of conversion events
"""

import os
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Set, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import User
from models.integration import Integration, IntegrationType
from services.redis_service import RedisConnectionManager

# Configure logging
logger = logging.getLogger(__name__)

class MetaDeduplicationService:
    """Service for managing event deduplication between Meta Pixel and Conversions API"""
    
    def __init__(self):
        self.redis_manager = RedisConnectionManager()
        try:
            self.redis_client = self.redis_manager.get_client()
        except Exception:
            self.redis_client = None
        self.deduplication_enabled = os.getenv("META_ENABLE_DEDUPLICATION", "true").lower() == "true"
        self.deduplication_window_hours = int(os.getenv("META_DEDUPLICATION_WINDOW_HOURS", "24"))
        self.event_id_prefix = os.getenv("META_EVENT_ID_PREFIX", "bookedbarber_")
        self.debug_mode = os.getenv("META_CONVERSIONS_API_DEBUG", "false").lower() == "true"
        
        # Cache keys
        self.event_cache_prefix = "meta:dedup:event:"
        self.user_events_prefix = "meta:dedup:user:"
        self.stats_cache_prefix = "meta:dedup:stats:"
        
    def _get_event_cache_key(self, event_id: str) -> str:
        """Get Redis cache key for event"""
        return f"{self.event_cache_prefix}{event_id}"
    
    def _get_user_events_cache_key(self, user_id: int) -> str:
        """Get Redis cache key for user events"""
        return f"{self.user_events_prefix}{user_id}"
    
    def _get_stats_cache_key(self, user_id: int, date: str) -> str:
        """Get Redis cache key for deduplication stats"""
        return f"{self.stats_cache_prefix}{user_id}:{date}"
    
    def _generate_event_hash(
        self,
        event_name: str,
        user_email: str = None,
        user_phone: str = None,
        timestamp: datetime = None,
        custom_data: Dict = None
    ) -> str:
        """Generate a hash for event deduplication based on key identifiers"""
        # Create a consistent hash based on event characteristics
        hash_components = [
            event_name,
            user_email.lower().strip() if user_email else "",
            "".join(filter(str.isdigit, user_phone)) if user_phone else "",
            timestamp.strftime("%Y%m%d%H") if timestamp else "",  # Hour-level precision
        ]
        
        # Add custom data that helps identify unique events
        if custom_data:
            # Include key identifiers like appointment_id, transaction_id, etc.
            identifier_fields = [
                "appointment_id", "transaction_id", "order_id", "booking_id",
                "payment_id", "lead_id", "user_id"
            ]
            for field in identifier_fields:
                if field in custom_data and custom_data[field]:
                    hash_components.append(str(custom_data[field]))
        
        # Create hash
        hash_string = "|".join(hash_components)
        return hashlib.sha256(hash_string.encode()).hexdigest()[:16]  # Use first 16 chars
    
    def register_event(
        self,
        event_id: str,
        event_name: str,
        source: str,  # "pixel" or "conversions_api"
        user_id: int,
        user_data: Dict = None,
        custom_data: Dict = None,
        timestamp: datetime = None
    ) -> Dict[str, any]:
        """
        Register an event for deduplication tracking
        Returns information about whether this is a duplicate
        """
        if not self.deduplication_enabled:
            return {
                "is_duplicate": False,
                "original_source": None,
                "registered": True,
                "deduplication_disabled": True
            }
        
        if not self.redis_client:
            logger.warning("Redis not available for deduplication, allowing event")
            return {
                "is_duplicate": False,
                "original_source": None,
                "registered": True,
                "redis_unavailable": True
            }
        
        timestamp = timestamp or datetime.now(timezone.utc)
        
        try:
            # Generate event hash for content-based deduplication
            event_hash = self._generate_event_hash(
                event_name=event_name,
                user_email=user_data.get("email") if user_data else None,
                user_phone=user_data.get("phone") if user_data else None,
                timestamp=timestamp,
                custom_data=custom_data
            )
            
            # Check both event ID and event hash for duplicates
            event_cache_key = self._get_event_cache_key(event_id)
            hash_cache_key = self._get_event_cache_key(f"hash_{event_hash}")
            
            # Pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Check if event ID already exists
            pipe.get(event_cache_key)
            # Check if event hash already exists
            pipe.get(hash_cache_key)
            
            results = pipe.execute()
            existing_event_data = results[0]
            existing_hash_data = results[1]
            
            is_duplicate = False
            original_source = None
            duplicate_reason = None
            
            # Check for duplicates
            if existing_event_data:
                existing_data = json.loads(existing_event_data)
                is_duplicate = True
                original_source = existing_data.get("source")
                duplicate_reason = "event_id"
            elif existing_hash_data:
                existing_data = json.loads(existing_hash_data)
                is_duplicate = True
                original_source = existing_data.get("source")
                duplicate_reason = "content_hash"
            
            if is_duplicate:
                # Update stats for duplicate
                self._update_deduplication_stats(
                    user_id=user_id,
                    event_name=event_name,
                    source=source,
                    is_duplicate=True,
                    original_source=original_source,
                    timestamp=timestamp
                )
                
                if self.debug_mode:
                    logger.info(f"Duplicate event detected: {event_id} ({duplicate_reason}), original source: {original_source}")
                
                return {
                    "is_duplicate": True,
                    "original_source": original_source,
                    "duplicate_reason": duplicate_reason,
                    "registered": False
                }
            
            # Register new event
            event_data = {
                "event_id": event_id,
                "event_name": event_name,
                "source": source,
                "user_id": user_id,
                "timestamp": timestamp.isoformat(),
                "event_hash": event_hash
            }
            
            # Store with expiration (24 hours + buffer)
            expiration_seconds = (self.deduplication_window_hours + 1) * 3600
            
            # Store both event ID and hash
            pipe = self.redis_client.pipeline()
            pipe.setex(event_cache_key, expiration_seconds, json.dumps(event_data))
            pipe.setex(hash_cache_key, expiration_seconds, json.dumps(event_data))
            
            # Add to user's event list
            user_events_key = self._get_user_events_cache_key(user_id)
            pipe.lpush(user_events_key, event_id)
            pipe.ltrim(user_events_key, 0, 999)  # Keep last 1000 events
            pipe.expire(user_events_key, expiration_seconds)
            
            pipe.execute()
            
            # Update stats for new event
            self._update_deduplication_stats(
                user_id=user_id,
                event_name=event_name,
                source=source,
                is_duplicate=False,
                timestamp=timestamp
            )
            
            if self.debug_mode:
                logger.info(f"New event registered: {event_id} from {source}")
            
            return {
                "is_duplicate": False,
                "original_source": None,
                "registered": True,
                "event_hash": event_hash
            }
            
        except Exception as e:
            logger.error(f"Error in event deduplication: {str(e)}")
            # On error, allow the event to prevent blocking conversions
            return {
                "is_duplicate": False,
                "original_source": None,
                "registered": True,
                "error": str(e)
            }
    
    def _update_deduplication_stats(
        self,
        user_id: int,
        event_name: str,
        source: str,
        is_duplicate: bool,
        original_source: str = None,
        timestamp: datetime = None
    ):
        """Update deduplication statistics"""
        if not self.redis_client:
            return
        
        timestamp = timestamp or datetime.now(timezone.utc)
        date_key = timestamp.strftime("%Y-%m-%d")
        
        try:
            stats_key = self._get_stats_cache_key(user_id, date_key)
            
            # Get current stats
            current_stats = self.redis_client.get(stats_key)
            if current_stats:
                stats = json.loads(current_stats)
            else:
                stats = {
                    "total_events": 0,
                    "duplicates": 0,
                    "by_source": {},
                    "by_event_name": {},
                    "duplicate_sources": {}
                }
            
            # Update stats
            stats["total_events"] += 1
            
            if is_duplicate:
                stats["duplicates"] += 1
                
                # Track duplicate by original source
                if original_source:
                    if original_source not in stats["duplicate_sources"]:
                        stats["duplicate_sources"][original_source] = 0
                    stats["duplicate_sources"][original_source] += 1
            
            # Track by source
            if source not in stats["by_source"]:
                stats["by_source"][source] = {"total": 0, "duplicates": 0}
            stats["by_source"][source]["total"] += 1
            if is_duplicate:
                stats["by_source"][source]["duplicates"] += 1
            
            # Track by event name
            if event_name not in stats["by_event_name"]:
                stats["by_event_name"][event_name] = {"total": 0, "duplicates": 0}
            stats["by_event_name"][event_name]["total"] += 1
            if is_duplicate:
                stats["by_event_name"][event_name]["duplicates"] += 1
            
            # Store updated stats (expire after 30 days)
            self.redis_client.setex(stats_key, 30 * 24 * 3600, json.dumps(stats))
            
        except Exception as e:
            logger.error(f"Error updating deduplication stats: {str(e)}")
    
    def get_deduplication_stats(
        self,
        user_id: int,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> Dict[str, any]:
        """Get deduplication statistics for a user"""
        if not self.redis_client:
            return {"error": "Redis not available"}
        
        end_date = end_date or datetime.now(timezone.utc)
        start_date = start_date or (end_date - timedelta(days=7))
        
        try:
            aggregated_stats = {
                "total_events": 0,
                "duplicates": 0,
                "deduplication_rate": 0.0,
                "by_source": {},
                "by_event_name": {},
                "duplicate_sources": {},
                "daily_stats": {}
            }
            
            # Iterate through date range
            current_date = start_date.date()
            end_date_obj = end_date.date()
            
            while current_date <= end_date_obj:
                date_key = current_date.strftime("%Y-%m-%d")
                stats_key = self._get_stats_cache_key(user_id, date_key)
                
                daily_stats = self.redis_client.get(stats_key)
                if daily_stats:
                    daily_data = json.loads(daily_stats)
                    aggregated_stats["daily_stats"][date_key] = daily_data
                    
                    # Aggregate totals
                    aggregated_stats["total_events"] += daily_data.get("total_events", 0)
                    aggregated_stats["duplicates"] += daily_data.get("duplicates", 0)
                    
                    # Aggregate by source
                    for source, source_stats in daily_data.get("by_source", {}).items():
                        if source not in aggregated_stats["by_source"]:
                            aggregated_stats["by_source"][source] = {"total": 0, "duplicates": 0}
                        aggregated_stats["by_source"][source]["total"] += source_stats.get("total", 0)
                        aggregated_stats["by_source"][source]["duplicates"] += source_stats.get("duplicates", 0)
                    
                    # Aggregate by event name
                    for event_name, event_stats in daily_data.get("by_event_name", {}).items():
                        if event_name not in aggregated_stats["by_event_name"]:
                            aggregated_stats["by_event_name"][event_name] = {"total": 0, "duplicates": 0}
                        aggregated_stats["by_event_name"][event_name]["total"] += event_stats.get("total", 0)
                        aggregated_stats["by_event_name"][event_name]["duplicates"] += event_stats.get("duplicates", 0)
                    
                    # Aggregate duplicate sources
                    for dup_source, count in daily_data.get("duplicate_sources", {}).items():
                        if dup_source not in aggregated_stats["duplicate_sources"]:
                            aggregated_stats["duplicate_sources"][dup_source] = 0
                        aggregated_stats["duplicate_sources"][dup_source] += count
                
                current_date += timedelta(days=1)
            
            # Calculate deduplication rate
            if aggregated_stats["total_events"] > 0:
                aggregated_stats["deduplication_rate"] = (
                    aggregated_stats["duplicates"] / aggregated_stats["total_events"]
                ) * 100
            
            return aggregated_stats
            
        except Exception as e:
            logger.error(f"Error getting deduplication stats: {str(e)}")
            return {"error": str(e)}
    
    def get_user_recent_events(
        self,
        user_id: int,
        limit: int = 50
    ) -> List[Dict[str, any]]:
        """Get recent events for a user"""
        if not self.redis_client:
            return []
        
        try:
            user_events_key = self._get_user_events_cache_key(user_id)
            event_ids = self.redis_client.lrange(user_events_key, 0, limit - 1)
            
            events = []
            for event_id in event_ids:
                event_cache_key = self._get_event_cache_key(event_id.decode() if isinstance(event_id, bytes) else event_id)
                event_data = self.redis_client.get(event_cache_key)
                if event_data:
                    events.append(json.loads(event_data))
            
            return events
            
        except Exception as e:
            logger.error(f"Error getting user recent events: {str(e)}")
            return []
    
    def cleanup_expired_events(self, user_id: int = None):
        """Clean up expired event data (normally handled by Redis TTL)"""
        if not self.redis_client:
            return
        
        try:
            # This is normally handled by Redis TTL, but can be called manually
            # for cleanup or testing purposes
            
            if user_id:
                # Clean specific user
                user_events_key = self._get_user_events_cache_key(user_id)
                self.redis_client.delete(user_events_key)
            else:
                # Clean all deduplication data (use with caution)
                pattern = f"{self.event_cache_prefix}*"
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                
                pattern = f"{self.user_events_prefix}*"
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            
            logger.info(f"Cleaned up expired events for user: {user_id or 'all'}")
            
        except Exception as e:
            logger.error(f"Error cleaning up expired events: {str(e)}")
    
    def is_enabled(self) -> bool:
        """Check if deduplication is enabled"""
        return self.deduplication_enabled and self.redis_client is not None
    
    def get_config(self) -> Dict[str, any]:
        """Get current deduplication configuration"""
        return {
            "enabled": self.deduplication_enabled,
            "redis_available": self.redis_client is not None,
            "window_hours": self.deduplication_window_hours,
            "event_id_prefix": self.event_id_prefix,
            "debug_mode": self.debug_mode
        }

# Singleton instance
meta_deduplication_service = MetaDeduplicationService()