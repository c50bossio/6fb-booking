"""
Cache Integration Example
Demonstrates how to integrate the Redis-based caching system with existing FastAPI application.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging
import time

# Import caching components
from middleware.cache_middleware import CacheMiddleware, CacheRule
from services.enhanced_cache_service import cache_service, cached, CacheLevel
from utils.query_cache import (
    global_query_cache, 
    cached_session, 
    cache_query,
    setup_cache_invalidation_listeners
)
from config.cache_config import get_cache_config
from config.database import get_db, SessionLocal

# Import your existing models (example)
# from models.user import User
# from models.appointment import Appointment

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="6FB Booking with Enhanced Caching", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize cache middleware
cache_config = get_cache_config()
cache_middleware = CacheMiddleware(
    app=app,
    enabled=True,
    default_ttl=3600,  # 1 hour default
    debug=cache_config.backend.value == "memory"  # Enable debug in development
)

# Add custom cache rules for your specific endpoints
cache_middleware.add_rule(CacheRule(
    path_pattern=r"/api/v1/appointments",
    methods={"GET"},
    ttl=300,  # 5 minutes
    tags={"appointments"},
    cache_level=CacheLevel.BOTH,
    vary_headers=["Authorization"]
))

cache_middleware.add_rule(CacheRule(
    path_pattern=r"/api/v1/users/\d+/profile",
    methods={"GET"},
    ttl=1800,  # 30 minutes
    tags={"user_profiles"},
    cache_level=CacheLevel.BOTH,
    skip_query_params={"timestamp", "refresh"}
))

# Add cache middleware to app
app.add_middleware(type(cache_middleware), **cache_middleware.__dict__)

# Setup automatic cache invalidation for database changes
setup_cache_invalidation_listeners(global_query_cache)

# Register cache management routes (for development/admin)
from api.v1.endpoints.cache_management import router as cache_router
app.include_router(cache_router, prefix="/api/v1/admin")


# Example: Cached service functions
class UserService:
    """Example service with caching"""
    
    @staticmethod
    @cached(ttl=1800, tags={"users"})  # Cache for 30 minutes
    def get_user_stats(user_id: int) -> Dict[str, Any]:
        """Get user statistics with caching"""
        # Simulate expensive computation
        time.sleep(0.1)  # Simulate database query
        
        return {
            "user_id": user_id,
            "total_appointments": 42,
            "total_spent": 1250.00,
            "last_visit": "2024-01-15",
            "favorite_services": ["Haircut", "Beard Trim"],
            "computed_at": time.time()
        }
    
    @staticmethod
    def get_user_appointments_cached(user_id: int, db: Session) -> List[Dict[str, Any]]:
        """Get user appointments with query caching"""
        
        # Use cached session for automatic query caching
        with cached_session(lambda: db) as (session, cached_query):
            # This query will be automatically cached
            query = session.query(User).filter(User.id == user_id)  # Example
            
            result = cached_query.execute_cached(
                query,
                ttl=600,  # 10 minutes
                tags={"user_appointments", f"user_{user_id}"}
            )
            
            return [{"id": r.id, "name": r.name} for r in result]  # Example transformation


class AppointmentService:
    """Example appointment service with caching"""
    
    @staticmethod
    @cache_query(ttl=300, tags={"appointments"})
    def get_today_appointments(db: Session) -> List[Dict[str, Any]]:
        """Get today's appointments with method-level caching"""
        # This method's results will be automatically cached
        today = time.strftime("%Y-%m-%d")
        
        # Simulate database query
        appointments = [
            {"id": 1, "time": "10:00", "client": "John Doe", "service": "Haircut"},
            {"id": 2, "time": "11:30", "client": "Jane Smith", "service": "Color"},
            {"id": 3, "time": "14:00", "client": "Bob Johnson", "service": "Beard Trim"}
        ]
        
        return appointments
    
    @staticmethod
    def invalidate_appointment_cache():
        """Invalidate appointment-related cache"""
        # Invalidate by tags
        cache_service.invalidate_by_tags({"appointments", "user_appointments"})
        
        # Invalidate HTTP response cache
        cache_middleware.invalidate_by_tags({"appointments"})


# Example API endpoints with caching
@app.get("/api/v1/users/{user_id}/stats")
async def get_user_stats(user_id: int):
    """Get user statistics (automatically cached via @cached decorator)"""
    try:
        stats = UserService.get_user_stats(user_id)
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Failed to get user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user statistics")


@app.get("/api/v1/users/{user_id}/appointments")
async def get_user_appointments(user_id: int, db: Session = Depends(get_db)):
    """Get user appointments (automatically cached via query caching)"""
    try:
        appointments = UserService.get_user_appointments_cached(user_id, db)
        return {"success": True, "data": appointments}
    except Exception as e:
        logger.error(f"Failed to get user appointments: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user appointments")


@app.get("/api/v1/appointments/today")
async def get_today_appointments(db: Session = Depends(get_db)):
    """Get today's appointments (cached via middleware + method caching)"""
    try:
        appointments = AppointmentService.get_today_appointments(db)
        return {"success": True, "data": appointments}
    except Exception as e:
        logger.error(f"Failed to get today's appointments: {e}")
        raise HTTPException(status_code=500, detail="Failed to get appointments")


@app.post("/api/v1/appointments")
async def create_appointment(appointment_data: Dict[str, Any], db: Session = Depends(get_db)):
    """Create new appointment and invalidate related cache"""
    try:
        # Create appointment logic here...
        new_appointment = {"id": 123, **appointment_data}
        
        # Invalidate related cache
        AppointmentService.invalidate_appointment_cache()
        
        return {"success": True, "data": new_appointment}
    except Exception as e:
        logger.error(f"Failed to create appointment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create appointment")


@app.delete("/api/v1/appointments/{appointment_id}")
async def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Delete appointment and invalidate cache"""
    try:
        # Delete appointment logic here...
        
        # Invalidate related cache
        AppointmentService.invalidate_appointment_cache()
        
        return {"success": True, "message": "Appointment deleted"}
    except Exception as e:
        logger.error(f"Failed to delete appointment: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete appointment")


# Manual cache operations example
@app.post("/api/v1/cache/warm")
async def warm_application_cache():
    """Manually warm application cache with common data"""
    try:
        # Warm user stats for recent users
        recent_user_ids = [1, 2, 3, 4, 5]  # Get from database
        
        warmed_count = 0
        for user_id in recent_user_ids:
            try:
                UserService.get_user_stats(user_id)  # This will cache the result
                warmed_count += 1
            except Exception as e:
                logger.warning(f"Failed to warm cache for user {user_id}: {e}")
        
        # Warm common data
        common_data = {
            "app_config": {"version": "1.0.0", "features": ["booking", "payments"]},
            "service_prices": {"haircut": 35, "beard_trim": 20, "color": 85},
            "business_hours": {"mon-fri": "9:00-18:00", "sat": "9:00-16:00", "sun": "closed"}
        }
        
        cache_warmed = cache_service.warm_cache(common_data, ttl=3600)
        
        return {
            "success": True,
            "user_stats_warmed": warmed_count,
            "common_data_warmed": cache_warmed,
            "total_warmed": warmed_count + cache_warmed
        }
    except Exception as e:
        logger.error(f"Cache warming failed: {e}")
        raise HTTPException(status_code=500, detail="Cache warming failed")


# Cache monitoring endpoint
@app.get("/api/v1/cache/status")
async def get_cache_status():
    """Get current cache status and performance"""
    try:
        cache_health = cache_service.health_check()
        cache_stats = cache_service.get_stats()
        query_stats = global_query_cache.get_statistics()
        middleware_stats = cache_middleware.get_stats()
        
        return {
            "success": True,
            "health": cache_health,
            "performance": {
                "service_cache": cache_stats,
                "query_cache": query_stats,
                "middleware_cache": middleware_stats
            }
        }
    except Exception as e:
        logger.error(f"Failed to get cache status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cache status")


# Example of cache preloading on application startup
@app.on_event("startup")
async def startup_event():
    """Application startup event - warm cache with essential data"""
    logger.info("Starting application with cache warming...")
    
    try:
        # Test cache connectivity
        health = cache_service.health_check()
        if health["status"] != "healthy":
            logger.warning(f"Cache not healthy on startup: {health}")
        else:
            logger.info("Cache system healthy")
        
        # Warm cache with essential data
        essential_data = {
            "app_version": "1.0.0",
            "cache_warming_time": time.time(),
            "startup_status": "completed"
        }
        
        cache_service.warm_cache(essential_data, ttl=86400)  # 24 hours
        logger.info("Cache warmed with essential data")
        
    except Exception as e:
        logger.error(f"Cache initialization failed: {e}")
        # Don't fail the application startup for cache issues
        pass


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("Application shutting down...")
    # Cache cleanup is handled automatically


# Example of advanced cache usage with dependencies
class CacheManager:
    """Advanced cache management utilities"""
    
    @staticmethod
    def invalidate_user_cache(user_id: int):
        """Invalidate all cache entries for a specific user"""
        user_tags = {f"user_{user_id}", "user_profiles", "user_appointments"}
        
        # Invalidate service cache
        count1 = cache_service.invalidate_by_tags(user_tags)
        
        # Invalidate middleware cache
        count2 = cache_middleware.invalidate_by_tags(user_tags)
        
        logger.info(f"Invalidated cache for user {user_id}: {count1 + count2} entries")
        
        return count1 + count2
    
    @staticmethod
    def schedule_cache_cleanup():
        """Schedule periodic cache cleanup (integrate with your task scheduler)"""
        # This would typically be called by APScheduler or similar
        
        # Clear expired entries (handled automatically by Redis)
        # Clean up old slow query logs
        if hasattr(global_query_cache, 'slow_queries'):
            if len(global_query_cache.slow_queries) > 100:
                global_query_cache.slow_queries = global_query_cache.slow_queries[-50:]
        
        logger.info("Cache cleanup completed")


# Example usage in development
if __name__ == "__main__":
    import uvicorn
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Run development server
    uvicorn.run(
        "cache_integration_example:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )


"""
Usage Instructions:

1. Basic Setup:
   - Import the caching components as shown above
   - Add the CacheMiddleware to your FastAPI app
   - Configure cache rules for your specific endpoints

2. Service-Level Caching:
   - Use @cached decorator for expensive computations
   - Use cached_session for database queries
   - Use @cache_query for method-level query caching

3. Cache Invalidation:
   - Use tags to group related cache entries
   - Invalidate by tags when data changes
   - Set up automatic invalidation with database listeners

4. Monitoring:
   - Use /api/v1/admin/cache endpoints for monitoring
   - Implement health checks in your application
   - Monitor cache hit rates and performance

5. Production Considerations:
   - Configure Redis URL in environment variables
   - Set appropriate TTL values for your use case
   - Monitor memory usage and adjust cache sizes
   - Implement proper admin authentication for cache endpoints
   - Set up Redis clustering for high availability

6. Performance Tuning:
   - Monitor cache hit rates and adjust strategies
   - Use different cache levels for different data types
   - Implement cache warming for frequently accessed data
   - Profile slow queries and optimize them

Example Environment Variables:
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password
CACHE_DEFAULT_TTL=3600
CACHE_COMPRESSION=true
CACHE_CIRCUIT_BREAKER=true
"""