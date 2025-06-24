# Redis Caching Implementation Guide

## Overview

This document describes the comprehensive Redis caching implementation for the 6FB Booking Platform. The caching system provides significant performance improvements through intelligent data caching, automatic fallback mechanisms, and comprehensive monitoring.

## Architecture

### Core Components

1. **Redis Service** (`services/redis_service.py`)
   - Connection management with automatic reconnection
   - Health monitoring and statistics
   - Graceful error handling and fallback mechanisms

2. **Enhanced Cache** (`utils/enhanced_cache.py`)
   - High-level caching utilities
   - Smart cache invalidation
   - Cache warming and batch operations
   - Performance monitoring

3. **Cache Health** (`utils/cache_health.py`)
   - Health monitoring and diagnostics
   - Maintenance automation
   - Performance analysis and debugging

4. **Cache Management API** (`api/v1/endpoints/cache_management.py`)
   - Administrative endpoints for cache control
   - Debugging and monitoring tools
   - Performance benchmarking

## Features

### 🚀 Performance Features

- **Multi-level Caching**: Redis primary with in-memory fallback
- **Smart Invalidation**: Entity-based cache invalidation patterns
- **Cache Warming**: Automatic preloading of frequently accessed data
- **Batch Operations**: Efficient multi-key operations
- **Connection Pooling**: Optimized Redis connection management

### 🛡️ Reliability Features

- **Automatic Fallback**: Seamless fallback to in-memory cache when Redis is unavailable
- **Health Monitoring**: Continuous health checks and alerting
- **Graceful Degradation**: Application continues working even if cache fails
- **Connection Recovery**: Automatic reconnection to Redis

### 📊 Monitoring Features

- **Performance Metrics**: Hit rates, response times, error rates
- **Health Dashboards**: Real-time cache health status
- **Debug Tools**: Key inspection and performance analysis
- **Admin Interface**: Web-based cache management

## Configuration

### Environment Variables

```bash
# Redis Connection
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Cache Settings
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600
CACHE_PREFIX=6fb
```

### Production Configuration

For production deployment, configure Redis with:

```bash
# Production Redis (example for Render.com)
REDIS_URL=redis://red-xxxxx:6379
REDIS_PASSWORD=secure_password_here
REDIS_DB=0
CACHE_DEFAULT_TTL=3600
CACHE_PREFIX=6fb_prod
```

## Implementation Details

### Cached Endpoints

#### Barber Availability
- **Endpoint**: `/api/v1/availability/check`
- **TTL**: 60 seconds
- **Invalidation**: On barber or appointment changes

```python
@cache_result(ttl_seconds=60, key_prefix="availability_check", invalidate_on=["barber", "appointment"])
async def check_availability(request: AvailabilityCheckRequest, db: Session = Depends(get_db)):
    # ... implementation
```

#### Available Time Slots
- **Endpoint**: `/api/v1/availability/slots`
- **TTL**: 300 seconds (5 minutes)
- **Invalidation**: On barber or appointment changes

#### Dashboard Metrics
- **Endpoint**: `/api/v1/dashboard/appointments/today`
- **TTL**: 300 seconds (5 minutes)
- **Invalidation**: On appointment or analytics changes

### Cache Keys Strategy

The system uses structured cache keys for efficient management:

```python
# Examples of cache keys
availability_check:barber_id=123:date=2025-06-24:time=14:00
available_slots:barber_id=123:date=2025-06-24:duration=60
dashboard_today:location_id=1:barber_id=123
analytics:revenue:2025-06-24:2025-06-30:location_id=1
```

### Smart Invalidation

Cache invalidation is triggered automatically when entities change:

```python
# When a barber's schedule changes
invalidate_by_entity("barber", barber_id="123")
# Invalidates: barber:123, barber:123:*, availability:*

# When an appointment is created/updated
invalidate_by_entity("appointment")
# Invalidates: appointments:*, analytics:*, dashboard:*
```

## Usage Examples

### Basic Caching

```python
from utils.enhanced_cache import cache_result, CacheKeys

@cache_result(ttl_seconds=3600, key_prefix="user_profile")
async def get_user_profile(user_id: int):
    # This function's result will be cached for 1 hour
    return await fetch_user_from_database(user_id)
```

### Manual Cache Operations

```python
from utils.enhanced_cache import set_in_cache, get_from_cache, delete_from_cache

# Set value in cache
set_in_cache("my_key", {"data": "value"}, ttl_seconds=1800)

# Get value from cache
cached_value = get_from_cache("my_key")

# Delete from cache
delete_from_cache("my_key")
```

### Cache Warming

```python
from utils.enhanced_cache import cache_warmer

# Register cache warming job
cache_warmer.register_job(
    key_pattern=lambda: CacheKeys.dashboard_metrics(today),
    data_func=fetch_dashboard_data,
    ttl=1800
)

# Trigger cache warming
await cache_warmer.warm_cache()
```

### Health Monitoring

```python
from utils.cache_health import get_cache_health_status

# Check cache health
health = await get_cache_health_status()
print(f"Cache status: {health.status}")
print(f"Recommendations: {health.recommendations}")
```

## API Endpoints

### Cache Management

All cache management endpoints require admin privileges:

- `GET /api/v1/cache/health` - Get cache health status
- `GET /api/v1/cache/stats` - Get performance statistics
- `POST /api/v1/cache/maintenance` - Perform maintenance
- `DELETE /api/v1/cache/clear` - Clear cache (with patterns)
- `GET /api/v1/cache/debug/key/{key}` - Debug specific key
- `GET /api/v1/cache/performance` - Get performance report

### Example API Usage

```bash
# Get cache health
curl -X GET "http://localhost:8000/api/v1/cache/health" \
     -H "Authorization: Bearer your_admin_token"

# Clear cache for specific pattern
curl -X DELETE "http://localhost:8000/api/v1/cache/clear?pattern=dashboard:*" \
     -H "Authorization: Bearer your_admin_token"

# Get performance statistics
curl -X GET "http://localhost:8000/api/v1/cache/stats" \
     -H "Authorization: Bearer your_admin_token"
```

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your_redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - REDIS_PASSWORD=your_redis_password
      - CACHE_ENABLED=true
    depends_on:
      - redis

volumes:
  redis_data:
```

### Render.com Deployment

1. **Create Redis Service**
   - Add Redis service in Render dashboard
   - Note the Redis URL provided

2. **Configure Environment Variables**
   ```bash
   REDIS_URL=redis://red-xxxxx:6379
   REDIS_PASSWORD=provided_password
   CACHE_ENABLED=true
   CACHE_DEFAULT_TTL=3600
   ```

3. **Deploy Application**
   - The app will automatically connect to Redis
   - Monitor cache health through admin endpoints

### Heroku Deployment

1. **Add Heroku Redis**
   ```bash
   heroku addons:create heroku-redis:mini
   ```

2. **Configure Settings**
   ```bash
   heroku config:set CACHE_ENABLED=true
   heroku config:set CACHE_DEFAULT_TTL=3600
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

## Monitoring and Maintenance

### Health Monitoring

The system provides comprehensive health monitoring:

```python
# Check overall health
health = await get_cache_health_status()

# Get detailed statistics
stats = get_cache_stats()

# Performance metrics
report = await get_cache_performance_report()
```

### Automated Maintenance

Cache maintenance runs automatically:

- **Expired Key Cleanup**: Removes expired in-memory cache entries
- **Health Checks**: Continuous Redis connectivity monitoring
- **Cache Warming**: Periodic warming of critical data
- **Performance Monitoring**: Tracks hit rates and response times

### Manual Maintenance

```python
from utils.cache_health import perform_cache_maintenance

# Perform routine maintenance
result = await perform_cache_maintenance()

# Force cache cleanup
result = await perform_cache_maintenance(force_cleanup=True)
```

## Performance Optimization

### Best Practices

1. **Choose Appropriate TTL**
   - Static data: 1-24 hours
   - Dynamic data: 5-30 minutes
   - Real-time data: 30-300 seconds

2. **Use Structured Keys**
   ```python
   # Good
   f"user:{user_id}:profile"
   f"barber:{barber_id}:availability:{date}"

   # Avoid
   f"user_profile_data_{user_id}"
   ```

3. **Implement Smart Invalidation**
   ```python
   # Invalidate related caches when data changes
   @cache_result(invalidate_on=["barber", "appointment"])
   def get_barber_schedule(barber_id):
       pass
   ```

4. **Monitor Performance**
   - Target > 80% hit rate
   - Monitor cache size and memory usage
   - Track slow operations

### Troubleshooting

#### Common Issues

1. **Low Hit Rate**
   - Check TTL settings
   - Verify cache keys are consistent
   - Monitor invalidation frequency

2. **Redis Connection Issues**
   - Check Redis server status
   - Verify connection credentials
   - Monitor network connectivity

3. **High Memory Usage**
   - Reduce TTL for large objects
   - Implement cache size limits
   - Monitor key expiration

#### Debug Tools

```python
# Debug specific cache key
debug_info = await debug_cache_key("problematic_key")

# List keys by pattern
keys_info = await cache_debugger.list_cache_keys("barber:*")

# Performance analysis
report = await get_cache_performance_report()
```

## Migration Guide

### From No Caching

1. **Install Redis**
2. **Add Environment Variables**
3. **Deploy with Caching Enabled**
4. **Monitor Performance Improvements**

### From Basic Caching

1. **Update Cache Implementation**
2. **Migrate to Enhanced Cache**
3. **Enable Health Monitoring**
4. **Configure Smart Invalidation**

## Testing

### Unit Tests

```python
import pytest
from utils.enhanced_cache import set_in_cache, get_from_cache

def test_cache_basic_operations():
    # Test set and get
    set_in_cache("test_key", {"test": True}, 60)
    result = get_from_cache("test_key")
    assert result == {"test": True}
```

### Integration Tests

```python
async def test_cached_endpoint():
    # Test cached endpoint performance
    response = await client.get("/api/v1/availability/check")
    assert response.status_code == 200

    # Second request should be faster (cached)
    start_time = time.time()
    response = await client.get("/api/v1/availability/check")
    duration = time.time() - start_time
    assert duration < 0.1  # Should be very fast from cache
```

## Support and Maintenance

### Monitoring

- Monitor cache hit rates (target > 80%)
- Track Redis memory usage
- Monitor connection pool health
- Watch for slow operations

### Maintenance Schedule

- **Daily**: Automated health checks
- **Weekly**: Performance review
- **Monthly**: Configuration optimization
- **Quarterly**: Capacity planning

### Support Contacts

For issues with the caching system:

1. Check application logs for cache errors
2. Review Redis server logs
3. Use admin debugging endpoints
4. Monitor health dashboards

## Version History

- **v1.0.0** - Initial Redis caching implementation
- **v1.1.0** - Added cache warming and health monitoring
- **v1.2.0** - Enhanced invalidation patterns
- **v1.3.0** - Added admin management interface

---

Last Updated: June 24, 2025
Version: 1.3.0
