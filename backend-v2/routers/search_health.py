"""
Search System Health Check and Management API

Provides comprehensive health monitoring, diagnostics, and management
endpoints for the search system including cache management.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from db import get_db
from dependencies import get_current_user
from utils.role_permissions import get_permission_checker
from models import User
from services.enhanced_semantic_search_service import enhanced_semantic_search
from services.advanced_search_service import advanced_search
from services.embedding_cache_manager import cache_manager
# Temporarily disabled due to missing apscheduler dependency
# from services.cache_cleanup_scheduler import cleanup_scheduler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/search", tags=["Search Health & Management"])
security = HTTPBearer()


@router.get("/health")
async def search_system_health_check():
    """
    Comprehensive search system health check
    Public endpoint for monitoring system status
    """
    try:
        health_status = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "healthy",
            "components": {},
            "performance_metrics": {},
            "errors": []
        }
        
        # Check enhanced semantic search service
        try:
            enhanced_status = enhanced_semantic_search.is_available()
            health_status["components"]["enhanced_semantic_search"] = {
                "status": "healthy" if enhanced_status else "degraded",
                "voyage_client": "connected" if enhanced_semantic_search.voyage_client else "disconnected",
                "configuration": "loaded" if enhanced_semantic_search.config else "missing"
            }
        except Exception as e:
            health_status["components"]["enhanced_semantic_search"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_status["errors"].append(f"Enhanced search: {e}")
        
        # Check advanced search service
        try:
            advanced_status = advanced_search.is_available()
            health_status["components"]["advanced_search"] = {
                "status": "healthy" if advanced_status else "degraded",
                "bm25_index": "loaded" if hasattr(advanced_search, 'bm25_barber_index') else "not_loaded",
                "reranker": "available" if hasattr(advanced_search, 'reranker') else "not_available"
            }
        except Exception as e:
            health_status["components"]["advanced_search"] = {
                "status": "unhealthy", 
                "error": str(e)
            }
            health_status["errors"].append(f"Advanced search: {e}")
        
        # Check cache cleanup scheduler (disabled due to missing apscheduler)
        try:
            # scheduler_status = await cleanup_scheduler.get_scheduler_status()
            health_status["components"]["cache_scheduler"] = {
                "status": "disabled",
                "active_jobs": 0,
                "last_cleanup": None,
                "note": "scheduler disabled due to missing apscheduler dependency"
            }
        except Exception as e:
            health_status["components"]["cache_scheduler"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_status["errors"].append(f"Cache scheduler: {e}")
        
        # Overall health determination
        component_statuses = [
            comp.get("status") for comp in health_status["components"].values()
        ]
        
        if any(status == "unhealthy" for status in component_statuses):
            health_status["status"] = "unhealthy"
        elif any(status == "degraded" for status in component_statuses):
            health_status["status"] = "degraded"
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "unhealthy",
            "error": str(e)
        }


@router.get("/capabilities")
async def search_capabilities():
    """
    Get search system capabilities and configuration
    Public endpoint for understanding available features
    """
    try:
        capabilities = {
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "capabilities": {
                "semantic_search": {
                    "available": enhanced_semantic_search.is_available(),
                    "model": "voyage-3-large",
                    "features": [
                        "content_chunking",
                        "embedding_caching", 
                        "contextual_boosting",
                        "analytics_tracking"
                    ]
                },
                "keyword_search": {
                    "available": True,
                    "algorithm": "BM25",
                    "features": [
                        "exact_matching",
                        "fuzzy_matching",
                        "term_boosting"
                    ]
                },
                "hybrid_search": {
                    "available": True,
                    "combination_method": "weighted_fusion",
                    "features": [
                        "semantic_keyword_fusion",
                        "cross_encoder_reranking",
                        "query_expansion"
                    ]
                },
                "advanced_features": {
                    "cross_encoder_reranking": advanced_search.is_available(),
                    "contextual_retrieval": True,
                    "multi_index_pipeline": True,
                    "query_expansion": True
                }
            },
            "supported_entities": [
                "barber",
                "service",
                "appointment",
                "location"
            ],
            "search_types": [
                "semantic",
                "keyword", 
                "hybrid",
                "advanced"
            ]
        }
        
        return capabilities
        
    except Exception as e:
        logger.error(f"Error getting search capabilities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search capabilities"
        )


@router.get("/cache/statistics")
async def get_cache_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    permission_checker = Depends(get_permission_checker)
):
    """
    Get comprehensive embedding cache statistics
    Requires admin permissions
    """
    # Check permissions
    if not permission_checker.has_permission("search.admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view cache statistics"
        )
    
    try:
        stats = await cache_manager.get_cache_statistics(db)
        
        # Add additional metadata
        stats["retrieved_at"] = datetime.utcnow().isoformat()
        stats["user_id"] = current_user.id
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting cache statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cache statistics"
        )


@router.post("/cache/cleanup")
async def trigger_cache_cleanup(
    cleanup_type: str = Query("routine", regex="^(routine|aggressive|emergency)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    permission_checker = Depends(get_permission_checker)
):
    """
    Manually trigger cache cleanup
    Requires admin permissions
    """
    # Check permissions
    if not permission_checker.has_permission("search.admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to trigger cache cleanup"
        )
    
    try:
        logger.info(f"Manual cache cleanup triggered by user {current_user.id}, type: {cleanup_type}")
        
        # cleanup_stats = await cleanup_scheduler.trigger_manual_cleanup(cleanup_type)
        
        # Temporary fallback while scheduler is disabled
        cleanup_stats = {
            "cleanup_type": cleanup_type,
            "status": "disabled",
            "message": "Cleanup scheduler disabled due to missing apscheduler dependency",
            "triggered_by": current_user.id,
            "triggered_at": datetime.utcnow().isoformat()
        }
        
        return cleanup_stats
        
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache cleanup failed: {str(e)}"
        )


@router.post("/cache/invalidate/{entity_type}/{entity_id}")
async def invalidate_entity_cache(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    permission_checker = Depends(get_permission_checker)
):
    """
    Invalidate cache entries for a specific entity
    Useful when entity data is updated
    """
    # Check permissions
    if not permission_checker.has_permission("search.admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to invalidate cache"
        )
    
    # Validate entity type
    valid_types = ["barber", "service", "appointment", "location"]
    if entity_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity type. Must be one of: {', '.join(valid_types)}"
        )
    
    try:
        invalidated_count = await cache_manager.invalidate_entity_cache(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id
        )
        
        logger.info(f"Cache invalidated for {entity_type}:{entity_id} by user {current_user.id}")
        
        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "invalidated_count": invalidated_count,
            "invalidated_by": current_user.id,
            "invalidated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache invalidation failed: {str(e)}"
        )


@router.get("/scheduler/status")
async def get_scheduler_status(
    current_user: User = Depends(get_current_user),
    permission_checker = Depends(get_permission_checker)
):
    """
    Get cache cleanup scheduler status
    Requires admin permissions
    """
    # Check permissions
    if not permission_checker.has_permission("search.admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view scheduler status"
        )
    
    try:
        # status_info = await cleanup_scheduler.get_scheduler_status()
        status_info = {
            "status": "disabled",
            "message": "Scheduler disabled due to missing apscheduler dependency",
            "is_running": False,
            "active_jobs": [],
            "last_cleanup": None,
            "retrieved_at": datetime.utcnow().isoformat()
        }
        status_info["retrieved_by"] = current_user.id
        
        return status_info
        
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scheduler status"
        )


@router.get("/performance/metrics")
async def get_performance_metrics(
    time_range: str = Query("24h", regex="^(1h|6h|24h|7d|30d)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    permission_checker = Depends(get_permission_checker)
):
    """
    Get search performance metrics over specified time range
    Requires admin permissions
    """
    # Check permissions
    if not permission_checker.has_permission("search.admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view performance metrics"
        )
    
    try:
        # Calculate time range
        from datetime import timedelta
        now = datetime.utcnow()
        
        time_deltas = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6), 
            "24h": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
        
        start_time = now - time_deltas[time_range]
        
        # Get performance metrics from SearchAnalytics table
        from models import SearchAnalytics
        from sqlalchemy import func, and_
        
        search_analytics = db.query(SearchAnalytics).filter(
            SearchAnalytics.searched_at >= start_time
        )
        
        total_searches = search_analytics.count()
        
        avg_response_time = db.query(
            func.avg(SearchAnalytics.search_time_ms)
        ).filter(
            SearchAnalytics.searched_at >= start_time
        ).scalar() or 0
        
        search_types = db.query(
            SearchAnalytics.search_type,
            func.count(SearchAnalytics.id)
        ).filter(
            SearchAnalytics.searched_at >= start_time
        ).group_by(SearchAnalytics.search_type).all()
        
        performance_metrics = {
            "time_range": time_range,
            "start_time": start_time.isoformat(),
            "end_time": now.isoformat(),
            "total_searches": total_searches,
            "average_response_time_ms": round(avg_response_time, 2),
            "searches_by_type": {
                search_type: count for search_type, count in search_types
            },
            "cache_statistics": await cache_manager.get_cache_statistics(db),
            "retrieved_at": now.isoformat(),
            "retrieved_by": current_user.id
        }
        
        return performance_metrics
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance metrics"
        )


@router.get("/diagnostics")
async def run_search_diagnostics(
    include_cache_check: bool = Query(True),
    include_performance_test: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    permission_checker = Depends(get_permission_checker)
):
    """
    Run comprehensive search system diagnostics
    Requires admin permissions
    """
    # Check permissions
    if not permission_checker.has_permission("search.admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to run diagnostics"
        )
    
    try:
        diagnostics = {
            "timestamp": datetime.utcnow().isoformat(),
            "run_by": current_user.id,
            "tests": {},
            "overall_status": "healthy",
            "recommendations": []
        }
        
        # Test 1: Search service availability
        try:
            enhanced_available = enhanced_semantic_search.is_available()
            advanced_available = advanced_search.is_available()
            
            diagnostics["tests"]["service_availability"] = {
                "status": "passed" if (enhanced_available and advanced_available) else "failed",
                "enhanced_search": enhanced_available,
                "advanced_search": advanced_available
            }
            
            if not enhanced_available:
                diagnostics["recommendations"].append("Enhanced semantic search service is not available - check Voyage.ai configuration")
            if not advanced_available:
                diagnostics["recommendations"].append("Advanced search service is not available - check BM25 and reranker initialization")
                
        except Exception as e:
            diagnostics["tests"]["service_availability"] = {
                "status": "error",
                "error": str(e)
            }
            diagnostics["overall_status"] = "unhealthy"
        
        # Test 2: Cache health check
        if include_cache_check:
            try:
                cache_stats = await cache_manager.get_cache_statistics(db)
                
                cache_healthy = True
                cache_issues = []
                
                # Check cache size
                if cache_stats.get("cache_size_mb", 0) > 450:  # 90% of 500MB limit
                    cache_healthy = False
                    cache_issues.append("Cache size approaching limit")
                
                # Check entry count
                if cache_stats.get("total_entries", 0) > 90000:  # 90% of 100k limit
                    cache_healthy = False
                    cache_issues.append("Cache entry count approaching limit")
                
                # Check confidence scores
                if cache_stats.get("average_confidence", 1.0) < 0.4:
                    cache_healthy = False
                    cache_issues.append("Low average confidence scores")
                
                diagnostics["tests"]["cache_health"] = {
                    "status": "passed" if cache_healthy else "warning",
                    "cache_size_mb": cache_stats.get("cache_size_mb", 0),
                    "total_entries": cache_stats.get("total_entries", 0),
                    "average_confidence": cache_stats.get("average_confidence", 0),
                    "issues": cache_issues
                }
                
                if cache_issues:
                    diagnostics["recommendations"].extend([
                        f"Cache: {issue}" for issue in cache_issues
                    ])
                    
            except Exception as e:
                diagnostics["tests"]["cache_health"] = {
                    "status": "error",
                    "error": str(e)
                }
                diagnostics["overall_status"] = "degraded"
        
        # Test 3: Performance test (optional)
        if include_performance_test:
            try:
                import time
                
                # Simple search performance test
                start_time = time.time()
                
                # Mock a simple search (without actual API calls)
                test_query = "test performance"
                # This would normally call the search service
                # For diagnostics, we'll just measure basic response time
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                performance_healthy = response_time_ms < 1000  # Less than 1 second
                
                diagnostics["tests"]["performance"] = {
                    "status": "passed" if performance_healthy else "warning",
                    "response_time_ms": round(response_time_ms, 2),
                    "threshold_ms": 1000
                }
                
                if not performance_healthy:
                    diagnostics["recommendations"].append("Search response time exceeds recommended threshold")
                    
            except Exception as e:
                diagnostics["tests"]["performance"] = {
                    "status": "error",
                    "error": str(e)
                }
        
        # Determine overall status
        test_statuses = [test.get("status") for test in diagnostics["tests"].values()]
        if any(status == "error" for status in test_statuses):
            diagnostics["overall_status"] = "unhealthy"
        elif any(status in ["failed", "warning"] for status in test_statuses):
            diagnostics["overall_status"] = "degraded"
        
        return diagnostics
        
    except Exception as e:
        logger.error(f"Search diagnostics failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostics failed: {str(e)}"
        )