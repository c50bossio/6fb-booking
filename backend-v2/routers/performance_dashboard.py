"""
Real-Time Performance Dashboard API
Provides comprehensive performance metrics and monitoring endpoints for enterprise-grade observability.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import logging

from db import get_db
from services.performance_monitoring import performance_tracker, PerformanceLevel
from services.redis_cache import cache_service
from utils.auth import get_current_user
from models import User

router = APIRouter(tags=["performance-dashboard"])
logger = logging.getLogger(__name__)

@router.get("/dashboard/performance/current")
async def get_current_performance():
    """Get current real-time performance metrics"""
    try:
        summary = await performance_tracker.get_performance_summary()
        return JSONResponse(content=summary)
    except Exception as e:
        logger.error(f"Error getting current performance: {e}")
        raise HTTPException(status_code=500, detail="Failed to get performance metrics")

@router.get("/dashboard/performance/system-health")
async def get_system_health():
    """Get comprehensive system health snapshot"""
    try:
        health_snapshot = await performance_tracker.track_system_health()
        
        # Add additional system information
        extended_health = {
            "health_snapshot": {
                "timestamp": health_snapshot.timestamp.isoformat(),
                "cpu_percent": health_snapshot.cpu_percent,
                "memory_percent": health_snapshot.memory_percent,
                "disk_percent": health_snapshot.disk_percent,
                "active_connections": health_snapshot.active_connections,
                "database_response_time_ms": health_snapshot.database_response_time_ms,
                "cache_hit_rate": health_snapshot.cache_hit_rate,
                "error_rate": health_snapshot.error_rate,
                "performance_score": health_snapshot.performance_score,
                "status": health_snapshot.status.value
            },
            "thresholds": performance_tracker.alert_thresholds,
            "recommendations": _generate_performance_recommendations(health_snapshot)
        }
        
        return JSONResponse(content=extended_health)
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system health")

@router.get("/dashboard/performance/api-metrics")
async def get_api_performance_metrics(
    hours: int = 1,
    endpoint_filter: Optional[str] = None
):
    """Get API performance metrics over specified time period"""
    try:
        # Calculate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        # Get API statistics
        api_stats = performance_tracker._calculate_api_statistics()
        
        # Filter by endpoint if specified
        if endpoint_filter:
            filtered_stats = {
                k: v for k, v in api_stats["endpoints"].items() 
                if endpoint_filter.lower() in k.lower()
            }
            api_stats["endpoints"] = filtered_stats
        
        # Add trending data
        trending_data = await _get_api_trending_data(start_time, end_time)
        
        response = {
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "hours": hours
            },
            "current_stats": api_stats,
            "trending": trending_data,
            "top_slow_endpoints": _get_top_slow_endpoints(api_stats),
            "top_error_endpoints": _get_top_error_endpoints(api_stats)
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"Error getting API metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get API metrics")

@router.get("/dashboard/performance/database-metrics")
async def get_database_performance_metrics(db: Session = Depends(get_db)):
    """Get comprehensive database performance metrics"""
    try:
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "connection_stats": await _get_database_connection_stats(db),
            "query_performance": await _get_database_query_performance(db),
            "table_statistics": await _get_database_table_statistics(db),
            "index_usage": await _get_database_index_usage(db),
            "slow_queries": await _get_slow_queries(db),
            "recommendations": await _get_database_recommendations(db)
        }
        
        return JSONResponse(content=metrics)
        
    except Exception as e:
        logger.error(f"Error getting database metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get database metrics")

@router.get("/dashboard/performance/cache-metrics")
async def get_cache_performance_metrics():
    """Get Redis cache performance metrics"""
    try:
        cache_stats = await cache_service.get("cache_stats") or {}
        
        # Get cache distribution
        cache_distribution = await _get_cache_key_distribution()
        
        # Calculate cache efficiency
        cache_efficiency = await _calculate_cache_efficiency()
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "basic_stats": cache_stats,
            "key_distribution": cache_distribution,
            "efficiency_metrics": cache_efficiency,
            "memory_usage": await _get_cache_memory_usage(),
            "hit_rate_trend": await _get_cache_hit_rate_trend(),
            "recommendations": _get_cache_recommendations(cache_stats, cache_efficiency)
        }
        
        return JSONResponse(content=metrics)
        
    except Exception as e:
        logger.error(f"Error getting cache metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cache metrics")

@router.get("/dashboard/performance/alerts")
async def get_performance_alerts(
    hours: int = 24,
    severity_filter: Optional[str] = None
):
    """Get recent performance alerts"""
    try:
        # Get alerts from cache
        alerts = []
        
        # This would typically come from your alerting system
        # For now, we'll return recent alerts stored in cache
        current_time = datetime.now()
        start_time = current_time - timedelta(hours=hours)
        
        # Simulate alert retrieval (replace with actual implementation)
        recent_alerts = await _get_recent_alerts(start_time, current_time, severity_filter)
        
        response = {
            "time_range": {
                "start": start_time.isoformat(),
                "end": current_time.isoformat(),
                "hours": hours
            },
            "total_alerts": len(recent_alerts),
            "alerts_by_severity": _group_alerts_by_severity(recent_alerts),
            "alerts": recent_alerts[:50],  # Limit to 50 most recent
            "alert_trend": await _get_alert_trend(start_time)
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"Error getting performance alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get performance alerts")

@router.post("/dashboard/performance/start-monitoring")
async def start_performance_monitoring(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Start continuous performance monitoring (admin only)"""
    # Check if user has admin privileges
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        if not performance_tracker.monitoring_active:
            background_tasks.add_task(performance_tracker.start_monitoring)
            return {"message": "Performance monitoring started", "timestamp": datetime.now().isoformat()}
        else:
            return {"message": "Performance monitoring already active", "timestamp": datetime.now().isoformat()}
            
    except Exception as e:
        logger.error(f"Error starting performance monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to start monitoring")

@router.post("/dashboard/performance/stop-monitoring")
async def stop_performance_monitoring(current_user: User = Depends(get_current_user)):
    """Stop continuous performance monitoring (admin only)"""
    # Check if user has admin privileges
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        performance_tracker.stop_monitoring()
        return {"message": "Performance monitoring stopped", "timestamp": datetime.now().isoformat()}
        
    except Exception as e:
        logger.error(f"Error stopping performance monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop monitoring")

@router.get("/dashboard/performance/stress-test")
async def run_performance_stress_test(
    duration_seconds: int = 30,
    concurrent_requests: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Run a controlled stress test to validate performance (admin only)"""
    # Check if user has admin privileges
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    # Validate parameters
    if duration_seconds > 300:  # Max 5 minutes
        raise HTTPException(status_code=400, detail="Duration cannot exceed 300 seconds")
    if concurrent_requests > 100:  # Max 100 concurrent
        raise HTTPException(status_code=400, detail="Concurrent requests cannot exceed 100")
    
    try:
        # Run stress test
        test_results = await _run_controlled_stress_test(duration_seconds, concurrent_requests)
        
        return JSONResponse(content=test_results)
        
    except Exception as e:
        logger.error(f"Error running stress test: {e}")
        raise HTTPException(status_code=500, detail="Failed to run stress test")

@router.get("/dashboard/performance/recommendations")
async def get_performance_recommendations():
    """Get AI-powered performance optimization recommendations"""
    try:
        # Get current system state
        health_snapshot = await performance_tracker.track_system_health()
        api_stats = performance_tracker._calculate_api_statistics()
        
        recommendations = {
            "timestamp": datetime.now().isoformat(),
            "priority_recommendations": _generate_priority_recommendations(health_snapshot, api_stats),
            "system_optimizations": _generate_system_optimizations(health_snapshot),
            "api_optimizations": _generate_api_optimizations(api_stats),
            "infrastructure_recommendations": _generate_infrastructure_recommendations(health_snapshot),
            "cost_optimization": _generate_cost_optimization_suggestions(health_snapshot)
        }
        
        return JSONResponse(content=recommendations)
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get recommendations")

# Helper functions

def _generate_performance_recommendations(health_snapshot) -> List[Dict[str, Any]]:
    """Generate performance improvement recommendations"""
    recommendations = []
    
    if health_snapshot.cpu_percent > 80:
        recommendations.append({
            "type": "cpu_optimization",
            "priority": "high",
            "message": "CPU usage is high. Consider optimizing heavy operations or scaling horizontally.",
            "action": "Review CPU-intensive operations and implement caching or load balancing."
        })
    
    if health_snapshot.memory_percent > 85:
        recommendations.append({
            "type": "memory_optimization",
            "priority": "high",
            "message": "Memory usage is critical. Check for memory leaks or consider increasing memory allocation.",
            "action": "Profile memory usage and optimize or scale memory resources."
        })
    
    if health_snapshot.database_response_time_ms > 200:
        recommendations.append({
            "type": "database_optimization",
            "priority": "medium",
            "message": "Database response time is elevated. Consider query optimization or read replicas.",
            "action": "Analyze slow queries and implement database performance optimizations."
        })
    
    if health_snapshot.cache_hit_rate < 80:
        recommendations.append({
            "type": "cache_optimization",
            "priority": "medium",
            "message": "Cache hit rate is low. Review caching strategy and TTL settings.",
            "action": "Optimize cache keys, TTL values, and cache warming strategies."
        })
    
    return recommendations

async def _get_api_trending_data(start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    """Get API performance trending data"""
    # This would typically come from your time-series database
    # For now, return simulated trending data
    return {
        "response_time_trend": "stable",
        "request_volume_trend": "increasing",
        "error_rate_trend": "decreasing",
        "data_points": []  # Would contain actual time-series data
    }

def _get_top_slow_endpoints(api_stats: Dict) -> List[Dict[str, Any]]:
    """Get top slowest API endpoints"""
    endpoints = api_stats.get("endpoints", {})
    
    slow_endpoints = [
        {
            "endpoint": endpoint,
            "avg_response_time": stats["avg_response_time"],
            "p95_response_time": stats["p95_response_time"],
            "requests": stats["requests"]
        }
        for endpoint, stats in endpoints.items()
    ]
    
    return sorted(slow_endpoints, key=lambda x: x["avg_response_time"], reverse=True)[:10]

def _get_top_error_endpoints(api_stats: Dict) -> List[Dict[str, Any]]:
    """Get endpoints with highest error rates"""
    endpoints = api_stats.get("endpoints", {})
    
    error_endpoints = [
        {
            "endpoint": endpoint,
            "error_rate": stats["error_rate"],
            "requests": stats["requests"]
        }
        for endpoint, stats in endpoints.items()
        if stats["error_rate"] > 0
    ]
    
    return sorted(error_endpoints, key=lambda x: x["error_rate"], reverse=True)[:10]

async def _get_database_connection_stats(db: Session) -> Dict[str, Any]:
    """Get database connection statistics"""
    try:
        # These queries are PostgreSQL-specific, adjust for your database
        result = db.execute(text("""
            SELECT count(*) as total_connections,
                   count(*) FILTER (WHERE state = 'active') as active_connections,
                   count(*) FILTER (WHERE state = 'idle') as idle_connections
            FROM pg_stat_activity 
            WHERE datname = current_database()
        """))
        
        stats = result.fetchone()
        return {
            "total_connections": stats.total_connections if stats else 0,
            "active_connections": stats.active_connections if stats else 0,
            "idle_connections": stats.idle_connections if stats else 0
        }
    except Exception:
        # Fallback for non-PostgreSQL databases
        return {
            "total_connections": 0,
            "active_connections": 0,
            "idle_connections": 0
        }

async def _get_database_query_performance(db: Session) -> Dict[str, Any]:
    """Get database query performance statistics"""
    try:
        # Simple performance check
        start_time = datetime.now()
        db.execute(text("SELECT COUNT(*) FROM users"))
        query_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "avg_query_time_ms": query_time,
            "slow_query_count": 0,  # Would come from slow query log
            "total_queries": 0      # Would come from database stats
        }
    except Exception:
        return {
            "avg_query_time_ms": 0,
            "slow_query_count": 0,
            "total_queries": 0
        }

async def _get_database_table_statistics(db: Session) -> Dict[str, Any]:
    """Get database table statistics"""
    try:
        key_tables = ['users', 'appointments', 'payments', 'clients']
        table_stats = {}
        
        for table in key_tables:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                table_stats[table] = {"row_count": count}
            except Exception:
                table_stats[table] = {"row_count": 0}
        
        return table_stats
    except Exception:
        return {}

async def _get_database_index_usage(db: Session) -> Dict[str, Any]:
    """Get database index usage statistics"""
    # Placeholder - would implement actual index analysis
    return {
        "total_indexes": 0,
        "unused_indexes": 0,
        "index_efficiency": 0.0
    }

async def _get_slow_queries(db: Session) -> List[Dict[str, Any]]:
    """Get recent slow queries"""
    # Placeholder - would come from slow query log analysis
    return []

async def _get_database_recommendations(db: Session) -> List[Dict[str, Any]]:
    """Get database optimization recommendations"""
    recommendations = []
    
    # Check table sizes and suggest optimizations
    try:
        # This is a simplified example
        result = db.execute(text("SELECT COUNT(*) FROM appointments"))
        appointment_count = result.scalar()
        
        if appointment_count > 100000:
            recommendations.append({
                "type": "indexing",
                "message": "Large appointments table detected. Consider adding indexes on date and barber_id columns.",
                "priority": "medium"
            })
    except Exception:
        pass
    
    return recommendations

async def _get_cache_key_distribution() -> Dict[str, Any]:
    """Get cache key distribution statistics"""
    # Placeholder - would analyze Redis key patterns
    return {
        "total_keys": 0,
        "key_patterns": {},
        "memory_by_pattern": {}
    }

async def _calculate_cache_efficiency() -> Dict[str, Any]:
    """Calculate cache efficiency metrics"""
    # Placeholder - would calculate from Redis stats
    return {
        "hit_rate": 0.0,
        "miss_rate": 0.0,
        "eviction_rate": 0.0,
        "memory_efficiency": 0.0
    }

async def _get_cache_memory_usage() -> Dict[str, Any]:
    """Get cache memory usage statistics"""
    # Placeholder - would get from Redis INFO
    return {
        "used_memory": 0,
        "max_memory": 0,
        "memory_utilization": 0.0
    }

async def _get_cache_hit_rate_trend() -> List[Dict[str, Any]]:
    """Get cache hit rate trending data"""
    # Placeholder - would return time-series data
    return []

def _get_cache_recommendations(cache_stats: Dict, efficiency: Dict) -> List[Dict[str, Any]]:
    """Generate cache optimization recommendations"""
    recommendations = []
    
    hit_rate = efficiency.get("hit_rate", 0)
    if hit_rate < 80:
        recommendations.append({
            "type": "cache_tuning",
            "message": "Cache hit rate is below optimal. Review TTL settings and cache keys.",
            "priority": "medium"
        })
    
    return recommendations

async def _get_recent_alerts(start_time: datetime, end_time: datetime, severity_filter: Optional[str]) -> List[Dict[str, Any]]:
    """Get recent performance alerts"""
    # Placeholder - would retrieve from alerting system
    return []

def _group_alerts_by_severity(alerts: List[Dict[str, Any]]) -> Dict[str, int]:
    """Group alerts by severity level"""
    severity_counts = {"CRITICAL": 0, "WARNING": 0, "INFO": 0}
    
    for alert in alerts:
        severity = alert.get("severity", "INFO")
        if severity in severity_counts:
            severity_counts[severity] += 1
    
    return severity_counts

async def _get_alert_trend(start_time: datetime) -> Dict[str, Any]:
    """Get alerting trend analysis"""
    # Placeholder - would analyze alert patterns
    return {
        "trend": "stable",
        "avg_alerts_per_hour": 0,
        "most_common_alert_type": "none"
    }

async def _run_controlled_stress_test(duration_seconds: int, concurrent_requests: int) -> Dict[str, Any]:
    """Run a controlled stress test"""
    # Placeholder - would implement actual stress testing
    return {
        "test_duration_seconds": duration_seconds,
        "concurrent_requests": concurrent_requests,
        "total_requests": 0,
        "successful_requests": 0,
        "failed_requests": 0,
        "avg_response_time_ms": 0,
        "p95_response_time_ms": 0,
        "requests_per_second": 0,
        "peak_cpu_usage": 0,
        "peak_memory_usage": 0,
        "recommendations": []
    }

def _generate_priority_recommendations(health_snapshot, api_stats: Dict) -> List[Dict[str, Any]]:
    """Generate priority performance recommendations"""
    recommendations = []
    
    # Critical issues first
    if health_snapshot.performance_score < 50:
        recommendations.append({
            "priority": "critical",
            "category": "system_health",
            "title": "Critical Performance Issues Detected",
            "description": f"System performance score is {health_snapshot.performance_score}/100. Immediate action required.",
            "estimated_impact": "high",
            "effort_required": "medium"
        })
    
    return recommendations

def _generate_system_optimizations(health_snapshot) -> List[Dict[str, Any]]:
    """Generate system-level optimization recommendations"""
    optimizations = []
    
    if health_snapshot.cpu_percent > 70:
        optimizations.append({
            "type": "cpu_optimization",
            "title": "Optimize CPU Usage",
            "description": "CPU usage is elevated. Consider implementing caching or optimizing algorithms.",
            "estimated_savings": "20-30% CPU reduction"
        })
    
    return optimizations

def _generate_api_optimizations(api_stats: Dict) -> List[Dict[str, Any]]:
    """Generate API optimization recommendations"""
    optimizations = []
    
    overall_stats = api_stats.get("overall", {})
    avg_response_time = overall_stats.get("avg_response_time", 0)
    
    if avg_response_time > 500:
        optimizations.append({
            "type": "api_performance",
            "title": "Optimize API Response Times",
            "description": f"Average API response time is {avg_response_time:.1f}ms. Target < 200ms.",
            "estimated_improvement": "40-60% response time reduction"
        })
    
    return optimizations

def _generate_infrastructure_recommendations(health_snapshot) -> List[Dict[str, Any]]:
    """Generate infrastructure scaling recommendations"""
    recommendations = []
    
    if health_snapshot.memory_percent > 80:
        recommendations.append({
            "type": "scaling",
            "title": "Scale Memory Resources",
            "description": "Memory usage is high. Consider vertical or horizontal scaling.",
            "estimated_cost": "$50-200/month additional"
        })
    
    return recommendations

def _generate_cost_optimization_suggestions(health_snapshot) -> List[Dict[str, Any]]:
    """Generate cost optimization suggestions"""
    suggestions = []
    
    if health_snapshot.cpu_percent < 20:
        suggestions.append({
            "type": "cost_reduction",
            "title": "Consider Downsizing Infrastructure",
            "description": "CPU utilization is low. You may be able to reduce instance sizes.",
            "estimated_savings": "$100-300/month"
        })
    
    return suggestions