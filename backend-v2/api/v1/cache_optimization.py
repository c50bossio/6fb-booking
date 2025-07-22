"""
Cache Optimization API for BookedBarber V2
Endpoints to monitor and optimize cache performance
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

from database import get_db
from services.cache_optimization_service import cache_optimization_service
from services.enhanced_redis_service import enhanced_redis_service
from models import User

# Simple auth dependency for cache endpoints (optional user)
def get_current_user_optional():
    return None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cache-optimization", tags=["Cache Optimization"])

@router.get("/metrics", response_model=Dict[str, Any])
async def get_cache_metrics():
    """Get current cache performance metrics"""
    
    try:
        metrics = enhanced_redis_service.get_cache_metrics()
        
        return {
            'status': 'success',
            'metrics': metrics,
            'target_hit_rate': 80.0,
            'performance_status': 'optimal' if metrics['hit_rate'] >= 80 else 'needs_optimization',
            'timestamp': metrics.get('timestamp', 'N/A')
        }
        
    except Exception as e:
        logger.error(f"Failed to get cache metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve cache metrics: {str(e)}")

@router.post("/optimize", response_model=Dict[str, Any])
async def run_cache_optimization(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """Run cache optimization cycle"""
    
    try:
        logger.info("Starting cache optimization via API request")
        
        # Run optimization in background
        background_tasks.add_task(cache_optimization_service.run_cache_optimization_cycle)
        
        # Get current metrics for immediate response
        current_metrics = enhanced_redis_service.get_cache_metrics()
        
        return {
            'status': 'success',
            'message': 'Cache optimization started in background',
            'current_metrics': current_metrics,
            'optimization_status': 'running'
        }
        
    except Exception as e:
        logger.error(f"Failed to start cache optimization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start optimization: {str(e)}")

@router.post("/preload-hot-data", response_model=Dict[str, Any])
async def preload_hot_data(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Preload frequently accessed data"""
    
    try:
        logger.info("Starting hot data preload via API request")
        
        # Run preload in background
        background_tasks.add_task(cache_optimization_service._preload_hot_data)
        
        return {
            'status': 'success',
            'message': 'Hot data preload started in background',
            'preload_status': 'running'
        }
        
    except Exception as e:
        logger.error(f"Failed to start hot data preload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start preload: {str(e)}")

@router.get("/strategies", response_model=Dict[str, Any])
async def get_cache_strategies():
    """Get current cache strategies configuration"""
    
    try:
        strategies = enhanced_redis_service.cache_strategies
        
        return {
            'status': 'success',
            'strategies': strategies,
            'total_categories': len(strategies),
            'compressed_categories': [
                name for name, config in strategies.items() 
                if config.get('compression', False)
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get cache strategies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve strategies: {str(e)}")

@router.post("/strategies/optimize", response_model=Dict[str, Any])
async def optimize_cache_strategies():
    """Optimize cache strategies based on performance"""
    
    try:
        logger.info("Optimizing cache strategies via API request")
        
        # Apply optimization
        enhanced_redis_service.optimize_cache_performance()
        
        # Get updated strategies
        updated_strategies = enhanced_redis_service.cache_strategies
        
        return {
            'status': 'success',
            'message': 'Cache strategies optimized',
            'updated_strategies': updated_strategies,
            'optimization_applied': True
        }
        
    except Exception as e:
        logger.error(f"Failed to optimize cache strategies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to optimize strategies: {str(e)}")

@router.delete("/clear/{category}")
async def clear_cache_category(category: str):
    """Clear cache for specific category"""
    
    valid_categories = list(enhanced_redis_service.cache_strategies.keys()) + ['all']
    
    if category not in valid_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Valid options: {valid_categories}"
        )
    
    try:
        if category == 'all':
            # Clear all categories
            total_deleted = 0
            for cat in enhanced_redis_service.cache_strategies.keys():
                deleted = enhanced_redis_service.delete_pattern(cat, "*")
                total_deleted += deleted
            
            message = f"Cleared all cache categories ({total_deleted} entries)"
        else:
            # Clear specific category
            deleted = enhanced_redis_service.delete_pattern(category, "*")
            message = f"Cleared {category} cache ({deleted} entries)"
        
        logger.info(message)
        
        return {
            'status': 'success',
            'message': message,
            'category': category,
            'entries_deleted': total_deleted if category == 'all' else deleted
        }
        
    except Exception as e:
        logger.error(f"Failed to clear cache category {category}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@router.get("/health", response_model=Dict[str, Any])
async def get_cache_health():
    """Get comprehensive cache health status"""
    
    try:
        metrics = enhanced_redis_service.get_cache_metrics()
        redis_info = metrics.get('redis_info', {})
        
        # Determine health status
        hit_rate = metrics['hit_rate']
        health_status = 'excellent' if hit_rate >= 85 else 'good' if hit_rate >= 80 else 'fair' if hit_rate >= 70 else 'poor'
        
        health_report = {
            'overall_status': health_status,
            'hit_rate': hit_rate,
            'target_hit_rate': 80.0,
            'performance_grade': _calculate_performance_grade(hit_rate),
            'redis_connected': redis_info.get('connected', False),
            'total_operations': metrics['total_operations'],
            'recommendations': _get_health_recommendations(hit_rate, metrics),
            'cache_strategies_count': len(enhanced_redis_service.cache_strategies),
            'timestamp': metrics.get('timestamp')
        }
        
        return health_report
        
    except Exception as e:
        logger.error(f"Failed to get cache health: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve health status: {str(e)}")

@router.post("/reset-metrics")
async def reset_cache_metrics():
    """Reset cache performance metrics"""
    
    try:
        enhanced_redis_service.reset_metrics()
        
        return {
            'status': 'success',
            'message': 'Cache metrics reset successfully',
            'reset_timestamp': enhanced_redis_service.get_cache_metrics().get('timestamp')
        }
        
    except Exception as e:
        logger.error(f"Failed to reset cache metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset metrics: {str(e)}")

def _calculate_performance_grade(hit_rate: float) -> str:
    """Calculate performance grade based on hit rate"""
    if hit_rate >= 90:
        return 'A+'
    elif hit_rate >= 85:
        return 'A'
    elif hit_rate >= 80:
        return 'B+'
    elif hit_rate >= 75:
        return 'B'
    elif hit_rate >= 70:
        return 'C+'
    elif hit_rate >= 60:
        return 'C'
    elif hit_rate >= 50:
        return 'D'
    else:
        return 'F'

def _get_health_recommendations(hit_rate: float, metrics: Dict) -> list:
    """Get health recommendations based on performance"""
    recommendations = []
    
    if hit_rate < 80:
        recommendations.append("Run cache optimization to improve hit rate")
        recommendations.append("Preload frequently accessed data")
    
    if hit_rate < 70:
        recommendations.append("URGENT: Review caching strategy")
        recommendations.append("Enable compression for large datasets")
    
    if metrics['total_operations'] < 100:
        recommendations.append("Increase cache usage across application")
    
    if hit_rate >= 80:
        recommendations.append("Performance is optimal - maintain current strategy")
    
    if not metrics.get('redis_info', {}).get('connected', False):
        recommendations.append("CRITICAL: Redis connection failed")
    
    return recommendations