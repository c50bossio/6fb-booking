"""
Application startup cache management and warming.
Handles cache initialization, data warming, and graceful shutdown.
"""

import logging
from typing import Dict, Any
from datetime import datetime

from config import settings
from services.redis_cache import cache_service

logger = logging.getLogger(__name__)

# Global cache service instance
_cache_service = None

async def startup_cache_init() -> Dict[str, Any]:
    """
    Initialize cache system and warm up common data.
    Returns cache initialization results.
    """
    global _cache_service
    
    results = {
        "cache_enabled": settings.enable_caching,
        "redis_connected": False,
        "cache_warmed": False,
        "warnings": [],
        "errors": []
    }
    
    if not settings.enable_caching:
        logger.info("🔧 Caching disabled in configuration")
        return results
    
    try:
        # Initialize Redis cache service
        _cache_service = cache_service
        await _cache_service.initialize()
        
        # Test Redis connection
        health_stats = await _cache_service.get_stats()
        results["redis_connected"] = True
        logger.info("✅ Redis cache service initialized successfully")
        
        # Warm up cache if enabled
        if settings.cache_warmup_on_startup:
            warmup_results = await _warm_up_cache()
            results.update(warmup_results)
            results["cache_warmed"] = True
            logger.info("✅ Cache warmup completed successfully")
        
        return results
        
    except Exception as e:
        error_msg = f"Cache initialization failed: {str(e)}"
        logger.error(error_msg)
        results["errors"].append(error_msg)
        return results

async def _warm_up_cache() -> Dict[str, Any]:
    """
    Warm up cache with frequently accessed data.
    Returns warmup results.
    """
    warmup_results = {
        "services_cached": 0,
        "locations_cached": 0,
        "config_cached": 0,
        "warmup_time_ms": 0
    }
    
    start_time = datetime.utcnow()
    
    try:
        # Mock data for cache warming (replace with actual DB queries in production)
        
        # 1. Cache service list (frequently accessed)
        services_cache_key = "services:list:active"
        mock_services = [
            {"id": 1, "name": "Haircut", "duration": 30, "price": 25.00},
            {"id": 2, "name": "Beard Trim", "duration": 15, "price": 15.00},
            {"id": 3, "name": "Hair Wash", "duration": 10, "price": 10.00}
        ]
        await _cache_service.set(services_cache_key, mock_services, ttl=settings.cache_services_ttl)
        warmup_results["services_cached"] = len(mock_services)
        
        # 2. Cache location information
        locations_cache_key = "locations:list:active"
        mock_locations = [
            {"id": 1, "name": "Downtown Location", "address": "123 Main St", "active": True},
            {"id": 2, "name": "Uptown Location", "address": "456 Oak Ave", "active": True}
        ]
        await _cache_service.set(locations_cache_key, mock_locations, ttl=3600)
        warmup_results["locations_cached"] = len(mock_locations)
        
        # 3. Cache system configuration
        config_cache_key = "system:config:booking_rules"
        mock_config = {
            "min_lead_time_minutes": settings.booking_min_lead_time_minutes,
            "max_advance_days": settings.booking_max_advance_days,
            "same_day_cutoff": settings.booking_same_day_cutoff,
            "notification_hours": settings.appointment_reminder_hours
        }
        await _cache_service.set(config_cache_key, mock_config, ttl=7200)  # 2 hours
        warmup_results["config_cached"] = 1
        
        # Calculate warmup time
        end_time = datetime.utcnow()
        warmup_time = (end_time - start_time).total_seconds() * 1000
        warmup_results["warmup_time_ms"] = int(warmup_time)
        
        logger.info(f"🔥 Cache warmed up: {warmup_results['services_cached']} services, "
                   f"{warmup_results['locations_cached']} locations, "
                   f"{warmup_results['config_cached']} configs in {warmup_time:.1f}ms")
        
        return warmup_results
        
    except Exception as e:
        logger.error(f"Cache warmup failed: {e}")
        return warmup_results

async def get_cache_service():
    """Get the initialized cache service instance."""
    global _cache_service
    
    if _cache_service is None:
        if settings.enable_caching:
            logger.warning("Cache service not initialized, initializing now...")
            await startup_cache_init()
        else:
            logger.info("Caching disabled, returning None")
            return None
    
    return _cache_service

async def invalidate_cache_for_event(event_type: str, event_data: Dict[str, Any] = None):
    """
    Invalidate relevant cache entries based on system events.
    
    Args:
        event_type: Type of event (e.g., 'appointment_created', 'user_updated')
        event_data: Additional event data for targeted invalidation
    """
    global _cache_service
    
    if not _cache_service or not settings.enable_caching:
        return
    
    try:
        if event_type in settings.cache_invalidation_events:
            logger.info(f"🗑️ Processing cache invalidation for event: {event_type}")
            
            if event_type.startswith("appointment_"):
                # Invalidate appointment-related caches
                user_id = event_data.get("user_id") if event_data else None
                if user_id:
                    await _cache_service.delete(f"user:{user_id}:appointments")
                await _cache_service.clear_pattern("appointments:*")
                logger.info("🗑️ Cleared appointment caches")
            
            elif event_type.startswith("user_"):
                # Invalidate user-related caches
                user_id = event_data.get("user_id") if event_data else None
                if user_id:
                    await _cache_service.delete(f"user:{user_id}:profile")
                    await _cache_service.delete(f"user:{user_id}:preferences")
                logger.info(f"🗑️ Cleared user caches for user {user_id}")
            
            elif event_type.startswith("service_"):
                # Invalidate service-related caches
                await _cache_service.clear_pattern("services:*")
                logger.info("🗑️ Cleared service caches")
        
    except Exception as e:
        logger.error(f"Cache invalidation failed for event {event_type}: {e}")

async def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics and health information."""
    global _cache_service
    
    if not _cache_service or not settings.enable_caching:
        return {"cache_enabled": False}
    
    try:
        stats = await _cache_service.get_cache_stats()
        stats["cache_enabled"] = True
        stats["settings"] = {
            "default_ttl": settings.cache_default_ttl,
            "warmup_enabled": settings.cache_warmup_on_startup,
            "max_memory_mb": settings.cache_max_memory_mb
        }
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {"cache_enabled": True, "error": str(e)}

async def shutdown_cache():
    """Gracefully shutdown cache connections."""
    global _cache_service
    
    if _cache_service:
        try:
            # Try to close Redis connections if the method exists
            if hasattr(_cache_service, 'close'):
                await _cache_service.close()
            elif hasattr(_cache_service, 'redis') and _cache_service.redis:
                await _cache_service.redis.close()
            logger.info("✅ Cache service shutdown completed")
        except Exception as e:
            logger.error(f"Cache shutdown error: {e}")
        finally:
            _cache_service = None
    else:
        logger.info("ℹ️ No cache service to shutdown")

# Health check function for monitoring
async def cache_health_check() -> Dict[str, Any]:
    """Perform cache health check for monitoring."""
    global _cache_service
    
    health = {
        "status": "healthy",
        "cache_enabled": settings.enable_caching,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if not settings.enable_caching:
        health["message"] = "Caching disabled in configuration"
        return health
    
    if not _cache_service:
        health["status"] = "unhealthy"
        health["message"] = "Cache service not initialized"
        return health
    
    try:
        # Test cache connectivity
        test_key = f"health_check:{datetime.utcnow().timestamp()}"
        await _cache_service.set(test_key, "ok", ttl=10)
        result = await _cache_service.get(test_key)
        await _cache_service.delete(test_key)
        
        if result == "ok":
            health["message"] = "Cache is responding normally"
        else:
            health["status"] = "degraded"
            health["message"] = "Cache test failed"
            
    except Exception as e:
        health["status"] = "unhealthy"
        health["message"] = f"Cache health check failed: {str(e)}"
    
    return health