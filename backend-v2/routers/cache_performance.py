"""
Cache Performance Management API Router

This router provides endpoints for monitoring, managing, and optimizing
the Redis API caching layer performance.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import logging

from db import get_db
from utils.auth import get_current_user
from services.api_cache_service import api_cache_service, get_cache_performance_report
from services.cache_monitoring_service import (
    cache_monitoring_service, generate_daily_report, 
    cache_monitoring_health_check
)
from services.cached_booking_service import (
    BookingPerformanceMonitor, BookingCacheWarmer
)
from services.cached_analytics_service import (
    AnalyticsPerformanceMonitor, AnalyticsCacheWarmer
)
from models import User, UnifiedUserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cache", tags=["Cache Performance"])

@router.get("/health", summary="Cache Service Health Check")
async def cache_health_check():
    """
    Get comprehensive cache service health status
    """
    try:
        health_status = await cache_monitoring_health_check()
        performance_metrics = api_cache_service.get_performance_metrics()
        
        return {
            "status": "healthy" if health_status["redis_connected"] else "degraded",
            "timestamp": datetime.now().isoformat(),
            "cache_service": health_status,
            "performance_summary": performance_metrics["performance_summary"],
            "redis_connected": health_status["redis_connected"]
        }
        
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache health check failed: {str(e)}")

@router.get("/metrics", summary="Real-time Cache Metrics")
async def get_cache_metrics():
    """
    Get real-time cache performance metrics
    """
    try:
        # Collect current metrics
        current_metrics = await cache_monitoring_service.collect_metrics()
        real_time_status = cache_monitoring_service.get_real_time_status()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "current_metrics": {
                "hit_rate_percent": round(current_metrics.hit_rate, 2),
                "total_requests": current_metrics.total_requests,
                "cache_hits": current_metrics.cache_hits,
                "cache_misses": current_metrics.cache_misses,  
                "avg_cached_response_ms": round(current_metrics.avg_response_time_cached, 2),
                "avg_uncached_response_ms": round(current_metrics.avg_response_time_uncached, 2),
                "performance_improvement_percent": round(current_metrics.performance_improvement, 2)
            },
            "redis_status": {
                "connected": current_metrics.redis_memory_usage is not None,
                "memory_usage": current_metrics.redis_memory_usage,
                "connected_clients": current_metrics.redis_connected_clients,
                "active_keys": current_metrics.active_keys
            },
            "service_status": real_time_status
        }
        
    except Exception as e:
        logger.error(f"Error getting cache metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving metrics: {str(e)}")

@router.get("/performance-report", summary="Cache Performance Report")
async def get_performance_report(
    hours_back: int = 24,
    current_user: User = Depends(get_current_user)
):
    """
    Generate comprehensive cache performance report
    
    Args:
        hours_back: Number of hours to analyze (default: 24)
    """
    try:
        # Verify user has admin privileges
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        performance_report = cache_monitoring_service.get_performance_report(hours_back)
        key_analysis = await cache_monitoring_service.get_cache_key_analysis()
        
        return {
            "generated_at": datetime.now().isoformat(),
            "analysis_period_hours": hours_back,
            "performance_report": performance_report,
            "cache_key_analysis": key_analysis,
            "summary": {
                "target_performance_met": performance_report.get("performance_analysis", {}).get("avg_improvement_percent", 0) >= 30,
                "overall_health": "excellent" if performance_report.get("hit_rate_analysis", {}).get("current", 0) > 70 else "good" if performance_report.get("hit_rate_analysis", {}).get("current", 0) > 40 else "needs_attention"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating performance report: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@router.post("/benchmark/appointment-slots", summary="Benchmark Appointment Slots Performance")
async def benchmark_appointment_slots(
    days_ahead: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Benchmark appointment slots caching performance
    
    Args:
        days_ahead: Number of days ahead to test
    """
    try:
        # Verify user has access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER, UnifiedUserRole.BARBER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Generate test dates
        test_dates = [
            date.today() + timedelta(days=i) for i in range(1, days_ahead + 1)
        ]
        
        # Run benchmark
        benchmark_results = await BookingPerformanceMonitor.benchmark_slot_calculation(
            db=db,
            target_dates=test_dates,
            user_timezone="UTC"
        )
        
        return {
            "benchmark_type": "appointment_slots",
            "test_parameters": {
                "days_tested": len(test_dates),
                "timezone": "UTC"
            },
            "results": benchmark_results,
            "performance_analysis": {
                "meets_target": benchmark_results["performance_improvement_percent"] >= 30,
                "target_range": "30-50%",
                "actual_improvement": f"{benchmark_results['performance_improvement_percent']:.1f}%"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error benchmarking appointment slots: {e}")
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {str(e)}")

@router.post("/benchmark/analytics-dashboard", summary="Benchmark Analytics Dashboard Performance")
async def benchmark_analytics_dashboard(
    iterations: int = 3,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Benchmark analytics dashboard caching performance
    
    Args:
        iterations: Number of test iterations
    """
    try:
        # Verify user has access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Run analytics benchmark
        benchmark_results = await AnalyticsPerformanceMonitor.benchmark_dashboard_performance(
            db=db,
            user_id=current_user.id,
            iterations=iterations
        )
        
        return {
            "benchmark_type": "analytics_dashboard",
            "test_parameters": {
                "user_id": current_user.id,
                "iterations": iterations
            },
            "results": benchmark_results,
            "performance_analysis": {
                "meets_target": benchmark_results["meets_target"],
                "target_range": "30-50%",
                "actual_improvement": f"{benchmark_results['performance_improvement_percent']:.1f}%",
                "database_queries_saved": benchmark_results.get("database_queries_saved", "estimated 60-80%")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error benchmarking analytics dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {str(e)}")

@router.post("/warm-cache", summary="Warm Critical Caches")
async def warm_critical_caches(
    background_tasks: BackgroundTasks,
    cache_types: List[str] = ["availability", "services", "analytics"],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pre-populate critical caches for optimal performance
    
    Args:
        cache_types: Types of caches to warm ["availability", "services", "analytics"]
    """
    try:
        # Verify user has access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        warming_results = {}
        
        # Warm availability cache
        if "availability" in cache_types:
            availability_result = await BookingCacheWarmer.warm_availability_cache(
                db=db,
                user_id=current_user.id,
                days_ahead=14
            )
            warming_results["availability"] = availability_result
        
        # Warm service cache
        if "services" in cache_types:
            service_result = await BookingCacheWarmer.warm_service_cache()
            warming_results["services"] = service_result
        
        # Warm analytics cache
        if "analytics" in cache_types:
            analytics_result = await AnalyticsCacheWarmer.warm_analytics_cache(
                db=db,
                user_id=current_user.id
            )
            warming_results["analytics"] = analytics_result
        
        return {
            "cache_warming_initiated": True,
            "timestamp": datetime.now().isoformat(),
            "user_id": current_user.id,
            "cache_types_warmed": cache_types,
            "warming_results": warming_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error warming caches: {e}")
        raise HTTPException(status_code=500, detail=f"Cache warming failed: {str(e)}")

@router.post("/invalidate", summary="Invalidate Cache Patterns")
async def invalidate_cache_patterns(
    patterns: List[str],
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate specific cache patterns
    
    Args:
        patterns: List of cache patterns to invalidate (e.g., ["get_available_slots*"])
    """
    try:
        # Verify user has admin access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        invalidation_results = {}
        total_invalidated = 0
        
        for pattern in patterns:
            count = await api_cache_service.invalidate_cache_pattern(pattern)
            invalidation_results[pattern] = count
            total_invalidated += count
        
        return {
            "invalidation_completed": True,
            "timestamp": datetime.now().isoformat(),
            "patterns_processed": patterns,
            "invalidation_results": invalidation_results,
            "total_keys_invalidated": total_invalidated
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error invalidating cache patterns: {e}")
        raise HTTPException(status_code=500, detail=f"Cache invalidation failed: {str(e)}")

@router.get("/daily-report", summary="Generate Daily Cache Report")
async def get_daily_cache_report(
    current_user: User = Depends(get_current_user)
):
    """
    Generate comprehensive daily cache performance report
    """
    try:
        # Verify user has admin access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        daily_report = await generate_daily_report()
        
        return daily_report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating daily report: {e}")
        raise HTTPException(status_code=500, detail=f"Daily report generation failed: {str(e)}")

@router.get("/optimization-recommendations", summary="Get Cache Optimization Recommendations")
async def get_optimization_recommendations(
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-powered cache optimization recommendations
    """
    try:
        # Verify user has access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get recent performance data
        performance_report = cache_monitoring_service.get_performance_report(hours_back=24)
        recommendations = performance_report.get("recommendations", [])
        
        # Get current metrics for additional analysis
        current_metrics = await cache_monitoring_service.collect_metrics()
        
        # Generate enhanced recommendations
        enhanced_recommendations = []
        
        # Performance-based recommendations
        if current_metrics.hit_rate < 50:
            enhanced_recommendations.append({
                "type": "performance",
                "priority": "high",
                "title": "Increase Cache TTL Values",
                "description": "Low hit rate detected. Consider increasing TTL for stable data like service catalogs and pricing.",
                "estimated_impact": "15-25% performance improvement"
            })
        
        if current_metrics.performance_improvement < 30:
            enhanced_recommendations.append({
                "type": "strategy",
                "priority": "medium", 
                "title": "Expand Caching Coverage",
                "description": "Consider adding caching to additional heavy operations and database queries.",
                "estimated_impact": "10-20% additional performance gain"
            })
        
        if current_metrics.avg_response_time_cached > 50:
            enhanced_recommendations.append({
                "type": "infrastructure",
                "priority": "medium",
                "title": "Optimize Redis Configuration",
                "description": "Cached response times are higher than optimal. Review Redis memory and connection settings.",
                "estimated_impact": "20-30% response time improvement"
            })
        
        return {
            "generated_at": datetime.now().isoformat(),
            "user_id": current_user.id,
            "current_performance": {
                "hit_rate": current_metrics.hit_rate,
                "performance_improvement": current_metrics.performance_improvement,
                "meets_target": current_metrics.performance_improvement >= 30
            },
            "general_recommendations": recommendations,
            "enhanced_recommendations": enhanced_recommendations,
            "next_review_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendations generation failed: {str(e)}")

@router.post("/run-performance-test", summary="Run Comprehensive Performance Test")
async def run_comprehensive_performance_test(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run comprehensive performance test suite to validate cache effectiveness
    """
    try:
        # Verify user has admin access
        if current_user.role != UnifiedUserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # This would typically be run as a background task
        def run_test_suite():
            """Background task to run performance tests"""
            logger.info(f"Starting comprehensive cache performance test for user {current_user.id}")
            
            # Import and run the test suite
            try:
                import asyncio
                from tests.performance.test_redis_cache_performance import test_comprehensive_cache_performance_suite
                
                # Run the comprehensive test suite
                results = asyncio.run(test_comprehensive_cache_performance_suite())
                
                logger.info(f"Performance test completed: {results}")
                return results
                
            except Exception as e:
                logger.error(f"Performance test failed: {e}")
                return {"error": str(e)}
        
        # Add to background tasks
        background_tasks.add_task(run_test_suite)
        
        return {
            "test_initiated": True,
            "timestamp": datetime.now().isoformat(),
            "initiated_by": current_user.id,
            "estimated_duration_minutes": 5,
            "message": "Comprehensive performance test started. Results will be logged and available in the daily report."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating performance test: {e}")
        raise HTTPException(status_code=500, detail=f"Performance test initiation failed: {str(e)}")

# Utility endpoints for cache management
@router.get("/cache-keys", summary="Analyze Cache Key Usage")
async def analyze_cache_keys(
    current_user: User = Depends(get_current_user)
):
    """
    Analyze cache key patterns and usage statistics
    """
    try:
        # Verify user has access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        key_analysis = await cache_monitoring_service.get_cache_key_analysis()
        
        return key_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing cache keys: {e}")
        raise HTTPException(status_code=500, detail=f"Cache key analysis failed: {str(e)}")

@router.get("/alerts", summary="Get Cache Performance Alerts")
async def get_cache_alerts(
    hours_back: int = 24,
    current_user: User = Depends(get_current_user)
):
    """
    Get recent cache performance alerts and issues
    
    Args:
        hours_back: Number of hours to look back for alerts
    """
    try:
        # Verify user has access
        if current_user.role not in [UnifiedUserRole.ADMIN, UnifiedUserRole.SHOP_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        recent_alerts = [
            alert.to_dict() for alert in cache_monitoring_service.alerts 
            if alert.timestamp > cutoff_time
        ]
        
        # Categorize alerts by level
        alert_summary = {
            "critical": [a for a in recent_alerts if a["level"] == "critical"],
            "error": [a for a in recent_alerts if a["level"] == "error"],
            "warning": [a for a in recent_alerts if a["level"] == "warning"],
            "info": [a for a in recent_alerts if a["level"] == "info"]
        }
        
        return {
            "timestamp": datetime.now().isoformat(),
            "hours_analyzed": hours_back,
            "total_alerts": len(recent_alerts),
            "alerts_by_level": {
                level: len(alerts) for level, alerts in alert_summary.items()
            },
            "recent_alerts": recent_alerts[:10],  # Most recent 10
            "alert_summary": alert_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cache alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Alert retrieval failed: {str(e)}")

# Export router
__all__ = ["router"]