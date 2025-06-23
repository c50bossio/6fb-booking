"""
Performance monitoring and optimization endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import date, timedelta

from config.database import get_db
from models.user import User
from services.rbac_service import RBACService, Permission
from services.query_optimization_service import (
    get_query_performance_report,
    DatabaseOptimizer,
)
from services.optimized_analytics_service import OptimizedAnalyticsService
from ..auth import get_current_user

router = APIRouter()


@router.get("/query-performance")
async def get_query_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get database query performance report (admin only)."""
    rbac = RBACService(db)

    # Only admins can view performance data
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view performance data",
        )

    return get_query_performance_report()


@router.get("/table-stats/{table_name}")
async def get_table_statistics(
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get statistics for a specific database table (admin only)."""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view table statistics",
        )

    # Validate table name to prevent injection
    allowed_tables = [
        "appointments",
        "clients",
        "barbers",
        "users",
        "payments",
        "reviews",
    ]
    if table_name not in allowed_tables:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Table analysis not supported for {table_name}",
        )

    optimizer = DatabaseOptimizer()
    return optimizer.analyze_table_stats(db, table_name)


@router.get("/index-suggestions")
async def get_index_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get database index suggestions for performance optimization (admin only)."""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view index suggestions",
        )

    optimizer = DatabaseOptimizer()
    return {
        "suggestions": optimizer.suggest_indexes(db),
        "note": "Review these suggestions before implementing. Test in development first.",
    }


@router.get("/optimized-dashboard")
async def get_optimized_dashboard(
    start_date: date = Query(..., description="Start date for analytics"),
    end_date: date = Query(..., description="End date for analytics"),
    location_id: Optional[int] = Query(None, description="Filter by location ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get comprehensive dashboard data using optimized queries."""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        if location_id:
            if not rbac.has_permission(
                current_user, Permission.VIEW_LOCATION_ANALYTICS, location_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view analytics for this location",
                )
        else:
            # If no location specified, use accessible locations
            accessible_locations = rbac.get_accessible_locations(current_user)
            if not accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No accessible locations for analytics",
                )
            location_id = accessible_locations[0]  # Use first accessible location

    # Validate date range
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    if (end_date - start_date).days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date range cannot exceed 365 days",
        )

    analytics_service = OptimizedAnalyticsService(db)

    try:
        dashboard_data = analytics_service.get_comprehensive_dashboard(
            start_date=start_date, end_date=end_date, location_id=location_id
        )

        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days + 1,
                "location_id": location_id,
            },
            "data": dashboard_data,
            "generated_at": date.today().isoformat(),
            "optimized": True,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating dashboard data: {str(e)}",
        )


@router.get("/performance-metrics")
async def get_performance_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current application performance metrics (admin only)."""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view performance metrics",
        )

    # Get query performance data
    query_report = get_query_performance_report()

    # Get database statistics
    optimizer = DatabaseOptimizer()
    table_stats = []
    core_tables = ["appointments", "clients", "barbers", "users"]

    for table in core_tables:
        try:
            stats = optimizer.analyze_table_stats(db, table)
            table_stats.append(stats)
        except Exception as e:
            table_stats.append({"table_name": table, "error": str(e)})

    return {
        "query_performance": query_report,
        "database_stats": {"tables": table_stats},
        "recommendations": [
            {
                "category": "Database Optimization",
                "items": [
                    "Review slow queries and add appropriate indexes",
                    "Monitor N+1 query patterns and implement eager loading",
                    "Consider query result caching for frequently accessed data",
                ],
            },
            {
                "category": "Application Performance",
                "items": [
                    "Use optimized analytics service for dashboard queries",
                    "Implement database connection pooling",
                    "Monitor API response times and optimize slow endpoints",
                ],
            },
        ],
        "generated_at": date.today().isoformat(),
    }


@router.post("/optimize-analytics-cache")
async def optimize_analytics_cache(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Warm up analytics cache with commonly requested data (admin only)."""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can optimize analytics cache",
        )

    analytics_service = OptimizedAnalyticsService(db)

    # Pre-calculate common date ranges
    today = date.today()
    date_ranges = [
        (today - timedelta(days=7), today),  # Last 7 days
        (today - timedelta(days=30), today),  # Last 30 days
        (today - timedelta(days=90), today),  # Last 90 days
    ]

    cached_reports = []

    for start_date, end_date in date_ranges:
        try:
            # Generate dashboard data for each range
            dashboard_data = analytics_service.get_comprehensive_dashboard(
                start_date=start_date, end_date=end_date, location_id=None
            )

            cached_reports.append(
                {
                    "period": f"{start_date.isoformat()} to {end_date.isoformat()}",
                    "status": "cached",
                    "metrics_count": len(dashboard_data),
                }
            )

        except Exception as e:
            cached_reports.append(
                {
                    "period": f"{start_date.isoformat()} to {end_date.isoformat()}",
                    "status": "error",
                    "error": str(e),
                }
            )

    return {
        "message": "Analytics cache optimization completed",
        "cached_reports": cached_reports,
        "cache_warmed_at": date.today().isoformat(),
    }
