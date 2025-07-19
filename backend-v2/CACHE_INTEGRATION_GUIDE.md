# Redis Cache Integration Guide

## Quick Start

### 1. Replace Booking Service Imports

**Before:**
```python
from services import booking_service

# Get available slots
slots = booking_service.get_available_slots(db, date.today())

# Create booking
appointment = booking_service.create_booking(
    db, user_id, date.today(), "10:00", "Haircut"
)
```

**After:**
```python
from services.cached_booking_service import cached_booking_service

# Get available slots (now cached)
slots = cached_booking_service.get_available_slots(db, date.today())

# Create booking (automatically invalidates cache)
appointment = cached_booking_service.create_booking(
    db, user_id, date.today(), "10:00", "Haircut"
)
```

### 2. Update Router Dependencies

**Before:**
```python
from services import booking_service

@router.get("/available-slots")
async def get_available_slots(
    target_date: date,
    db: Session = Depends(get_db)
):
    return booking_service.get_available_slots(db, target_date)
```

**After:**
```python
from services.cached_booking_service import cached_booking_service

@router.get("/available-slots")
async def get_available_slots(
    target_date: date,
    db: Session = Depends(get_db)
):
    return cached_booking_service.get_available_slots(db, target_date)
```

## API Methods

### Available Slots (Cached)
```python
# Basic available slots
slots = cached_booking_service.get_available_slots(
    db, 
    target_date=date.today(),
    user_timezone="America/New_York",
    include_next_available=True
)

# Barber-specific slots
barber_slots = cached_booking_service.get_available_slots_with_barber_availability(
    db,
    target_date=date.today(),
    barber_id=1,
    user_timezone="America/New_York"
)
```

### Booking Operations (Auto-Invalidating)
```python
# Create booking (invalidates related cache)
appointment = cached_booking_service.create_booking(
    db, user_id=1, booking_date=date.today(),
    booking_time="10:00", service="Haircut",
    user_timezone="America/New_York"
)

# Update booking (invalidates old and new dates)
updated = cached_booking_service.update_booking(
    db, booking_id=123, user_id=1,
    update_data={"booking_time": "11:00"}
)

# Cancel booking (invalidates cache)
cancelled = cached_booking_service.cancel_booking(
    db, booking_id=123, user_id=1
)
```

### Cache Management
```python
# Warm up cache for busy periods
stats = cached_booking_service.warm_up_cache_for_date_range(
    db, 
    start_date=date.today(),
    end_date=date.today() + timedelta(days=7),
    barber_ids=[1, 2, 3]  # Optional: specific barbers
)

# Check cache health
health = cached_booking_service.get_cache_health()
print(f"Cache available: {health['cache_available']}")

# Manual invalidation (rarely needed)
cached_booking_service.invalidate_cache_for_barber(barber_id=1)
cached_booking_service.invalidate_cache_for_date_range(
    start_date=date.today(),
    end_date=date.today() + timedelta(days=3)
)
```

## Router Integration

### Update Booking Endpoints

**File: `routers/bookings.py`**
```python
# At the top of the file
from services.cached_booking_service import cached_booking_service

# Replace all booking_service calls with cached_booking_service
@router.get("/available-slots")
async def get_available_slots(
    target_date: date = Query(...),
    user_timezone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        slots = cached_booking_service.get_available_slots(
            db, target_date, user_timezone, include_next_available=True
        )
        return slots
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_booking(
    booking_request: BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        appointment = cached_booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking_request.date,
            booking_time=booking_request.time,
            service=booking_request.service,
            user_timezone=booking_request.timezone,
            notes=booking_request.notes
        )
        return appointment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Add Cache Monitoring to Admin

**File: `routers/admin.py` (or similar)**
```python
from services.cache_health_service import cache_monitoring_service

@router.get("/cache/health")
async def cache_health(
    current_user: models.User = Depends(require_admin)
):
    """Get cache health for admin dashboard."""
    health = cache_monitoring_service.get_current_health()
    return {
        "status": health.overall_status.value,
        "metrics": [
            {
                "name": m.name,
                "value": m.value,
                "status": m.status.value,
                "message": m.message
            }
            for m in health.metrics
        ],
        "recommendations": health.recommendations
    }

@router.post("/cache/warm-up")
async def warm_up_cache(
    days_ahead: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Warm up cache for upcoming days."""
    end_date = date.today() + timedelta(days=days_ahead)
    stats = cached_booking_service.warm_up_cache_for_date_range(
        db, date.today(), end_date
    )
    return {"message": "Cache warmed up", "stats": stats}
```

## Error Handling

The cached service gracefully handles Redis failures:

```python
# This will work even if Redis is down
try:
    slots = cached_booking_service.get_available_slots(db, date.today())
    # Will use cache if available, fall back to database if not
except Exception as e:
    # Handle database or other errors normally
    logger.error(f"Failed to get slots: {e}")
    raise HTTPException(status_code=500, detail="Service unavailable")
```

## Monitoring Integration

### Add Health Check Endpoint

```python
@router.get("/health")
async def health_check():
    """Public health check including cache status."""
    try:
        # Basic app health
        db_healthy = True  # Add database check
        cache_healthy = cached_booking_service.cache.is_available()
        
        overall_healthy = db_healthy and cache_healthy
        
        return {
            "status": "healthy" if overall_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "cache": "healthy" if cache_healthy else "unavailable"
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )
```

### Add to Middleware

**File: `middleware/health_check.py`**
```python
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from services.cached_booking_service import cached_booking_service
import time

class CacheHealthMiddleware(BaseHTTPMiddleware):
    """Monitor cache health and add headers."""
    
    async def dispatch(self, request: Request, call_next):
        # Add cache status to response headers
        start_time = time.time()
        
        response = await call_next(request)
        
        # Add cache health headers
        cache_available = cached_booking_service.cache.is_available()
        response.headers["X-Cache-Status"] = "available" if cache_available else "unavailable"
        response.headers["X-Response-Time"] = str(round((time.time() - start_time) * 1000, 2))
        
        return response
```

## Performance Monitoring

### Track Cache Performance

```python
import time
from functools import wraps

def track_cache_performance(func):
    """Decorator to track cache hit/miss performance."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        
        # Check if we're getting from cache
        cache_hit = hasattr(args[0], 'cache') and args[0].cache.is_available()
        
        result = func(*args, **kwargs)
        
        duration = (time.time() - start_time) * 1000
        
        # Log performance metrics
        logger.info(f"{func.__name__}: {duration:.2f}ms (cache: {'hit' if cache_hit else 'miss'})")
        
        return result
    return wrapper

# Apply to cached service methods
@track_cache_performance
def get_available_slots_tracked(db, target_date, **kwargs):
    return cached_booking_service.get_available_slots(db, target_date, **kwargs)
```

## Production Deployment

### 1. Environment Variables

```bash
# .env file
REDIS_URL=redis://localhost:6379/0

# Optional cache tuning
CACHE_AVAILABLE_SLOTS_TTL=300
CACHE_BARBER_AVAILABILITY_TTL=3600
CACHE_BUSINESS_HOURS_TTL=86400
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --save 60 1 --loglevel warning
    
  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

volumes:
  redis_data:
```

### 3. Health Monitoring

```bash
# Check cache health
curl http://localhost:8000/api/v2/cache/health

# Get performance stats
curl http://localhost:8000/api/v2/cache/stats

# Monitor trends
curl http://localhost:8000/api/v2/cache/monitoring/trends?hours=24
```

## Migration Checklist

### Phase 1: Setup ✅
- [x] Redis server installed and running
- [x] Cache services implemented
- [x] Health monitoring added
- [x] Test suite passing

### Phase 2: Integration
- [ ] Update booking router to use cached service
- [ ] Update appointment router to use cached service
- [ ] Add cache health to admin dashboard
- [ ] Deploy to staging environment
- [ ] Performance testing

### Phase 3: Production
- [ ] Deploy Redis to production
- [ ] Update production environment variables
- [ ] Deploy application with caching enabled
- [ ] Monitor cache performance and hit rates
- [ ] Optimize TTL settings based on usage

### Phase 4: Optimization
- [ ] Set up cache warming for peak hours
- [ ] Implement predictive cache loading
- [ ] Add detailed performance analytics
- [ ] Fine-tune cache strategies based on metrics

## Troubleshooting

### Common Issues

1. **Cache Not Working**
   ```bash
   # Check Redis connection
   redis-cli ping
   
   # Check application logs
   grep "Redis" application.log
   
   # Test cache health
   curl http://localhost:8000/api/v2/cache/health
   ```

2. **Poor Performance**
   ```python
   # Check hit rates
   stats = cached_booking_service.get_cache_health()
   print(f"Hit rate: {stats['cache_stats']['hit_rate']}%")
   
   # Review TTL settings
   # Increase TTL for frequently accessed, rarely changing data
   # Decrease TTL for rapidly changing data
   ```

3. **Memory Issues**
   ```bash
   # Check Redis memory usage
   redis-cli info memory
   
   # Set memory limit
   redis-cli config set maxmemory 512mb
   redis-cli config set maxmemory-policy allkeys-lru
   ```

## Best Practices

1. **Always use the cached service for reads**
2. **Let the service handle cache invalidation automatically**
3. **Monitor cache hit rates and performance**
4. **Warm up cache during low-traffic periods**
5. **Set appropriate TTLs based on data change frequency**
6. **Handle cache failures gracefully (service does this automatically)**
7. **Use manual invalidation sparingly - prefer automatic invalidation**

## Support

For issues or questions:
1. Check the test suite: `python test_redis_cache_implementation.py`
2. Review cache health: `GET /api/v2/cache/health`
3. Check application logs for cache-related errors
4. Monitor Redis server logs and performance