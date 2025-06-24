"""
Cache Management API Endpoints
Provides admin and debug endpoints for cache monitoring, management, and performance analysis.
"""

from typing import Dict, List, Any, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging

from services.enhanced_cache_service import cache_service, CacheLevel
from utils.query_cache import global_query_cache
from config.cache_config import get_cache_health
from middleware.cache_middleware import CacheMiddleware

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cache", tags=["cache-management"])


# Pydantic models for request/response
class CacheKeyRequest(BaseModel):
    key: str = Field(..., description="Cache key to operate on")
    cache_level: Optional[CacheLevel] = Field(CacheLevel.BOTH, description="Cache level to target")


class CacheSetRequest(BaseModel):
    key: str = Field(..., description="Cache key")
    value: Any = Field(..., description="Value to cache")
    ttl: Optional[int] = Field(3600, description="Time to live in seconds")
    tags: Optional[Set[str]] = Field(None, description="Cache tags for invalidation")
    cache_level: Optional[CacheLevel] = Field(CacheLevel.BOTH, description="Cache level")


class CacheInvalidationRequest(BaseModel):
    tags: Optional[Set[str]] = Field(None, description="Tags to invalidate")
    pattern: Optional[str] = Field(None, description="Key pattern to invalidate")
    clear_all: Optional[bool] = Field(False, description="Clear entire cache")


class CacheStatsResponse(BaseModel):
    service_stats: Dict[str, Any]
    query_cache_stats: Dict[str, Any]
    health_status: Dict[str, Any]


class CacheWarmingRequest(BaseModel):
    data: Dict[str, Any] = Field(..., description="Key-value pairs to warm cache with")
    ttl: Optional[int] = Field(3600, description="TTL for warmed data")


# Dependency for admin access (implement based on your auth system)
async def require_admin_access():
    """Require admin access for cache management endpoints"""
    # TODO: Implement proper admin authentication
    # For now, this is a placeholder
    return True


@router.get("/health", response_model=Dict[str, Any])
async def get_cache_health():
    """Get cache system health status"""
    try:
        health_status = get_cache_health()
        service_health = cache_service.health_check()
        
        return {
            "status": "healthy" if health_status.get("status") == "healthy" else "degraded",
            "backend_health": health_status,
            "service_health": service_health,
            "timestamp": health_status.get("timestamp")
        }
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_statistics():
    """Get comprehensive cache statistics"""
    try:
        return CacheStatsResponse(
            service_stats=cache_service.get_stats(),
            query_cache_stats=global_query_cache.get_statistics(),
            health_status=get_cache_health()
        )
    except Exception as e:
        logger.error(f"Failed to get cache statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.get("/key/{key}")
async def get_cache_value(
    key: str,
    cache_level: CacheLevel = Query(CacheLevel.BOTH, description="Cache level to check"),
    admin: bool = Depends(require_admin_access)
):
    """Get value from cache by key"""
    try:
        value = cache_service.get(key, cache_level=cache_level)
        if value is None:
            raise HTTPException(status_code=404, detail="Key not found in cache")
        
        return {
            "key": key,
            "value": value,
            "cache_level": cache_level.value,
            "exists": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get cache value for key {key}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache value: {str(e)}")


@router.post("/key")
async def set_cache_value(
    request: CacheSetRequest,
    admin: bool = Depends(require_admin_access)
):
    """Set value in cache"""
    try:
        success = cache_service.set(
            key=request.key,
            value=request.value,
            ttl=request.ttl,
            tags=request.tags or set(),
            cache_level=request.cache_level
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set cache value")
        
        return {
            "success": True,
            "key": request.key,
            "ttl": request.ttl,
            "cache_level": request.cache_level.value
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to set cache value for key {request.key}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set cache value: {str(e)}")


@router.delete("/key/{key}")
async def delete_cache_key(
    key: str,
    cache_level: CacheLevel = Query(CacheLevel.BOTH, description="Cache level to target"),
    admin: bool = Depends(require_admin_access)
):
    """Delete key from cache"""
    try:
        success = cache_service.delete(key, cache_level=cache_level)
        
        return {
            "success": success,
            "key": key,
            "cache_level": cache_level.value
        }
    except Exception as e:
        logger.error(f"Failed to delete cache key {key}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete cache key: {str(e)}")


@router.post("/invalidate")
async def invalidate_cache(
    request: CacheInvalidationRequest,
    admin: bool = Depends(require_admin_access)
):
    """Invalidate cache by tags, patterns, or clear all"""
    try:
        results = {}
        
        if request.clear_all:
            success = cache_service.clear_all()
            results["clear_all"] = {"success": success}
        
        if request.tags:
            count = cache_service.invalidate_by_tags(request.tags)
            results["tags"] = {"invalidated_count": count, "tags": list(request.tags)}
        
        if request.pattern:
            count = cache_service.invalidate_by_pattern(request.pattern)
            results["pattern"] = {"invalidated_count": count, "pattern": request.pattern}
        
        if not results:
            raise HTTPException(status_code=400, detail="No invalidation criteria provided")
        
        return {
            "success": True,
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache invalidation failed: {str(e)}")


@router.post("/warm")
async def warm_cache(
    request: CacheWarmingRequest,
    admin: bool = Depends(require_admin_access)
):
    """Warm cache with predefined data"""
    try:
        warmed_count = cache_service.warm_cache(request.data, ttl=request.ttl)
        
        return {
            "success": True,
            "warmed_count": warmed_count,
            "total_items": len(request.data),
            "ttl": request.ttl
        }
    except Exception as e:
        logger.error(f"Cache warming failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache warming failed: {str(e)}")


@router.get("/keys")
async def list_cache_keys(
    pattern: str = Query("*", description="Key pattern to match"),
    limit: int = Query(100, description="Maximum number of keys to return"),
    admin: bool = Depends(require_admin_access)
):
    """List cache keys matching pattern"""
    try:
        # This is a simplified implementation
        # In practice, you'd need to implement pattern matching in the cache service
        
        return {
            "pattern": pattern,
            "limit": limit,
            "keys": [],  # TODO: Implement key listing in cache service
            "message": "Key listing not fully implemented - use Redis CLI for detailed key inspection"
        }
    except Exception as e:
        logger.error(f"Failed to list cache keys: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list cache keys: {str(e)}")


@router.get("/performance")
async def get_cache_performance(
    admin: bool = Depends(require_admin_access)
):
    """Get cache performance metrics and slow queries"""
    try:
        query_stats = global_query_cache.get_statistics()
        service_stats = cache_service.get_stats()
        
        # Get slow queries if available
        slow_queries = getattr(global_query_cache, 'slow_queries', [])
        
        return {
            "query_cache": query_stats,
            "service_cache": service_stats,
            "slow_queries": slow_queries[-10:],  # Last 10 slow queries
            "recommendations": _generate_performance_recommendations(query_stats, service_stats)
        }
    except Exception as e:
        logger.error(f"Failed to get cache performance metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")


@router.post("/benchmark")
async def run_cache_benchmark(
    operations: int = Query(1000, description="Number of operations to perform"),
    admin: bool = Depends(require_admin_access)
):
    """Run cache performance benchmark"""
    try:
        import time
        import random
        import string
        
        # Generate test data
        test_keys = [''.join(random.choices(string.ascii_letters, k=10)) for _ in range(operations)]
        test_values = [f"test_value_{i}" for i in range(operations)]
        
        # Benchmark SET operations
        start_time = time.time()
        set_success = 0
        for key, value in zip(test_keys, test_values):
            if cache_service.set(f"benchmark:{key}", value, ttl=60):
                set_success += 1
        set_duration = time.time() - start_time
        
        # Benchmark GET operations
        start_time = time.time()
        get_success = 0
        for key in test_keys:
            if cache_service.get(f"benchmark:{key}") is not None:
                get_success += 1
        get_duration = time.time() - start_time
        
        # Cleanup
        for key in test_keys:
            cache_service.delete(f"benchmark:{key}")
        
        return {
            "operations": operations,
            "set_performance": {
                "duration_seconds": round(set_duration, 3),
                "ops_per_second": round(operations / set_duration, 2),
                "success_rate": round(set_success / operations * 100, 2)
            },
            "get_performance": {
                "duration_seconds": round(get_duration, 3),
                "ops_per_second": round(operations / get_duration, 2),
                "success_rate": round(get_success / operations * 100, 2)
            }
        }
    except Exception as e:
        logger.error(f"Cache benchmark failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache benchmark failed: {str(e)}")


def _generate_performance_recommendations(query_stats: Dict[str, Any], service_stats: Dict[str, Any]) -> List[str]:
    """Generate performance recommendations based on cache statistics"""
    recommendations = []
    
    # Check hit rates
    if service_stats.get("hit_rate_percent", 0) < 70:
        recommendations.append("Consider increasing cache TTL or improving cache key strategies - hit rate is below 70%")
    
    if query_stats.get("hit_rate_percent", 0) < 60:
        recommendations.append("Query cache hit rate is low - consider caching more frequently accessed queries")
    
    # Check error rates
    if service_stats.get("errors", 0) > service_stats.get("total_requests", 1) * 0.05:
        recommendations.append("High error rate detected - check Redis connectivity and configuration")
    
    # Check slow operations
    if service_stats.get("slow_operations", 0) > 0:
        recommendations.append("Slow cache operations detected - consider optimizing large cached values or network latency")
    
    # Check memory usage
    l1_memory_mb = service_stats.get("l1_cache_memory_usage_mb", 0)
    if l1_memory_mb > 50:
        recommendations.append("L1 cache using significant memory - consider reducing max_memory_mb setting")
    
    if not recommendations:
        recommendations.append("Cache performance looks good! No immediate optimizations needed.")
    
    return recommendations


# Export router
__all__ = ["router"]