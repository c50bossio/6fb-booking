"""
Franchise Network Management Router

Provides comprehensive API endpoints for franchise network operations including:
- Network hierarchy management (networks, regions, groups)
- Cross-network analytics and benchmarking
- Compliance tracking and reporting
- Real-time performance monitoring
"""

from datetime import datetime, timedelta
from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from dependencies import get_db, get_current_user
from models import User
from models.franchise import (
    FranchiseNetwork, FranchiseRegion, FranchiseGroup, 
    FranchiseCompliance, FranchiseAnalytics,
    FranchiseNetworkType, FranchiseStatus, ComplianceJurisdiction
)
from schemas_new.franchise import (
    FranchiseNetworkCreate, FranchiseNetworkUpdate, FranchiseNetworkResponse,
    FranchiseRegionCreate, FranchiseRegionUpdate, FranchiseRegionResponse,
    FranchiseGroupCreate, FranchiseGroupUpdate, FranchiseGroupResponse,
    FranchiseAnalyticsFilter, FranchiseAnalyticsResponse,
    FranchiseNetworkDashboard, BenchmarkingRequest, BenchmarkingResponse,
    FranchiseAPIResponse, PaginatedResponse
)
from services.franchise_analytics_service import FranchiseAnalyticsService
from services.franchise_compliance_service import FranchiseComplianceService
from utils.authorization import verify_franchise_access
from utils.cache_decorators import cache_result
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/franchise",
    tags=["franchise"],
    dependencies=[Depends(get_current_user)]
)


def require_franchise_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user has franchise admin privileges"""
    if current_user.role not in ["admin", "super_admin", "franchise_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Franchise admin access required"
        )
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user has super admin privileges"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Super admin access required"
        )
    return current_user


# Franchise Networks Management
@router.post("/networks", response_model=FranchiseNetworkResponse)
async def create_franchise_network(
    network_data: FranchiseNetworkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Create a new franchise network (super admin only).
    
    Creates the top-level franchise network entity with:
    - Corporate structure and governance
    - Financial and legal frameworks
    - Compliance requirements setup
    """
    try:
        # Check for duplicate network names
        existing = db.query(FranchiseNetwork).filter(
            FranchiseNetwork.name == network_data.name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A franchise network with this name already exists"
            )
        
        # Create network
        network = FranchiseNetwork(**network_data.dict())
        db.add(network)
        db.commit()
        db.refresh(network)
        
        logger.info(f"Created franchise network {network.id}: {network.name}")
        return network
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating franchise network: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create franchise network: {str(e)}"
        )


@router.get("/networks", response_model=List[FranchiseNetworkResponse])
async def list_franchise_networks(
    status: Optional[FranchiseStatus] = Query(None),
    network_type: Optional[FranchiseNetworkType] = Query(None),
    include_metrics: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    List franchise networks with optional filtering.
    
    Returns networks with basic information and optional performance metrics.
    """
    try:
        query = db.query(FranchiseNetwork)
        
        if status:
            query = query.filter(FranchiseNetwork.status == status)
        if network_type:
            query = query.filter(FranchiseNetwork.network_type == network_type)
        
        networks = query.order_by(FranchiseNetwork.name).all()
        
        if include_metrics:
            # Enhance with computed metrics
            analytics_service = FranchiseAnalyticsService(db)
            for network in networks:
                metrics = analytics_service.get_network_summary_metrics(network.id)
                network.total_regions = metrics.get("total_regions", 0)
                network.total_groups = metrics.get("total_groups", 0)
                network.network_revenue_ytd = metrics.get("revenue_ytd", 0.0)
                network.current_locations_count = metrics.get("total_locations", 0)
        
        return networks
        
    except Exception as e:
        logger.error(f"Error listing franchise networks: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve franchise networks: {str(e)}"
        )


@router.get("/networks/{network_id}", response_model=FranchiseNetworkResponse)
async def get_franchise_network(
    network_id: int,
    include_hierarchy: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    Get detailed franchise network information.
    
    Returns comprehensive network data with optional hierarchy details.
    """
    try:
        network = db.query(FranchiseNetwork).filter(
            FranchiseNetwork.id == network_id
        ).first()
        
        if not network:
            raise HTTPException(
                status_code=404,
                detail="Franchise network not found"
            )
        
        # Enhance with computed metrics
        analytics_service = FranchiseAnalyticsService(db)
        metrics = analytics_service.get_network_summary_metrics(network_id)
        
        network.total_regions = metrics.get("total_regions", 0)
        network.total_groups = metrics.get("total_groups", 0)
        network.network_revenue_ytd = metrics.get("revenue_ytd", 0.0)
        network.current_locations_count = metrics.get("total_locations", 0)
        
        return network
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving franchise network {network_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve franchise network: {str(e)}"
        )


@router.put("/networks/{network_id}", response_model=FranchiseNetworkResponse)
async def update_franchise_network(
    network_id: int,
    network_update: FranchiseNetworkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Update franchise network configuration.
    
    Allows modification of network structure, policies, and settings.
    """
    try:
        network = db.query(FranchiseNetwork).filter(
            FranchiseNetwork.id == network_id
        ).first()
        
        if not network:
            raise HTTPException(
                status_code=404,
                detail="Franchise network not found"
            )
        
        # Update fields
        update_data = network_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(network, field, value)
        
        network.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(network)
        
        logger.info(f"Updated franchise network {network_id}")
        return network
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating franchise network {network_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update franchise network: {str(e)}"
        )


# Franchise Regions Management
@router.post("/networks/{network_id}/regions", response_model=FranchiseRegionResponse)
async def create_franchise_region(
    network_id: int,
    region_data: FranchiseRegionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    Create a new franchise region within a network.
    
    Establishes regional management structure and geographic boundaries.
    """
    try:
        # Verify network exists
        network = db.query(FranchiseNetwork).filter(
            FranchiseNetwork.id == network_id
        ).first()
        
        if not network:
            raise HTTPException(
                status_code=404,
                detail="Franchise network not found"
            )
        
        # Check for duplicate region codes within network
        existing = db.query(FranchiseRegion).filter(
            and_(
                FranchiseRegion.network_id == network_id,
                FranchiseRegion.code == region_data.code
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A region with this code already exists in the network"
            )
        
        # Create region
        region_data.network_id = network_id
        region = FranchiseRegion(**region_data.dict())
        db.add(region)
        db.commit()
        db.refresh(region)
        
        logger.info(f"Created franchise region {region.id}: {region.name} in network {network_id}")
        return region
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating franchise region: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create franchise region: {str(e)}"
        )


@router.get("/networks/{network_id}/regions", response_model=List[FranchiseRegionResponse])
async def list_franchise_regions(
    network_id: int,
    status: Optional[FranchiseStatus] = Query(None),
    include_metrics: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    List franchise regions within a network.
    
    Returns regional structure with optional performance metrics.
    """
    try:
        query = db.query(FranchiseRegion).filter(
            FranchiseRegion.network_id == network_id
        )
        
        if status:
            query = query.filter(FranchiseRegion.status == status)
        
        regions = query.order_by(FranchiseRegion.name).all()
        
        if include_metrics:
            # Enhance with computed metrics
            analytics_service = FranchiseAnalyticsService(db)
            for region in regions:
                metrics = analytics_service.get_region_summary_metrics(region.id)
                region.total_groups = metrics.get("total_groups", 0)
                region.total_locations = metrics.get("total_locations", 0)
                region.region_revenue_ytd = metrics.get("revenue_ytd", 0.0)
                region.compliance_score = metrics.get("compliance_score", 0.0)
        
        return regions
        
    except Exception as e:
        logger.error(f"Error listing franchise regions for network {network_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve franchise regions: {str(e)}"
        )


# Franchise Groups Management
@router.post("/regions/{region_id}/groups", response_model=FranchiseGroupResponse)
async def create_franchise_group(
    region_id: int,
    group_data: FranchiseGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    Create a new franchise group within a region.
    
    Establishes operational clusters for multi-unit management.
    """
    try:
        # Verify region exists
        region = db.query(FranchiseRegion).filter(
            FranchiseRegion.id == region_id
        ).first()
        
        if not region:
            raise HTTPException(
                status_code=404,
                detail="Franchise region not found"
            )
        
        # Check for duplicate group codes within region
        existing = db.query(FranchiseGroup).filter(
            and_(
                FranchiseGroup.region_id == region_id,
                FranchiseGroup.code == group_data.code
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A group with this code already exists in the region"
            )
        
        # Create group
        group_data.region_id = region_id
        group = FranchiseGroup(**group_data.dict())
        db.add(group)
        db.commit()
        db.refresh(group)
        
        logger.info(f"Created franchise group {group.id}: {group.name} in region {region_id}")
        return group
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating franchise group: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create franchise group: {str(e)}"
        )


# Franchise Analytics and Dashboards
@router.get("/networks/{network_id}/dashboard", response_model=FranchiseNetworkDashboard)
@cache_result(ttl=300)  # Cache for 5 minutes
async def get_franchise_network_dashboard(
    network_id: int,
    date_range_days: int = Query(30, ge=1, le=365),
    include_forecasts: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    Get comprehensive franchise network dashboard.
    
    Returns real-time analytics, performance metrics, and compliance status
    across the entire franchise network.
    """
    try:
        # Verify network exists
        network = db.query(FranchiseNetwork).filter(
            FranchiseNetwork.id == network_id
        ).first()
        
        if not network:
            raise HTTPException(
                status_code=404,
                detail="Franchise network not found"
            )
        
        analytics_service = FranchiseAnalyticsService(db)
        compliance_service = FranchiseComplianceService(db)
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=date_range_days)
        
        # Network summary
        network_summary = analytics_service.get_network_summary_metrics(network_id)
        
        # Performance overview
        performance_overview = analytics_service.get_network_performance_overview(
            network_id, start_date, end_date
        )
        
        # Regional breakdown
        regional_breakdown = analytics_service.get_regional_performance_breakdown(
            network_id, start_date, end_date
        )
        
        # Compliance status
        compliance_status = compliance_service.get_network_compliance_summary(network_id)
        
        # Financial summary
        financial_summary = analytics_service.get_network_financial_summary(
            network_id, start_date, end_date
        )
        
        # Growth metrics
        growth_metrics = analytics_service.get_network_growth_metrics(
            network_id, start_date, end_date
        )
        
        # Alerts and notifications
        alerts = analytics_service.get_network_alerts(network_id)
        
        dashboard_data = FranchiseNetworkDashboard(
            network_summary=network_summary,
            performance_overview=performance_overview,
            regional_breakdown=regional_breakdown,
            compliance_status=compliance_status,
            financial_summary=financial_summary,
            growth_metrics=growth_metrics,
            alerts_and_notifications=alerts,
            last_updated=datetime.utcnow()
        )
        
        if include_forecasts:
            # Add predictive analytics
            forecasts = analytics_service.generate_network_forecasts(
                network_id, forecast_periods=12
            )
            dashboard_data.real_time_metrics = {"forecasts": forecasts}
        
        return dashboard_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating network dashboard {network_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate network dashboard: {str(e)}"
        )


@router.post("/analytics/query", response_model=List[FranchiseAnalyticsResponse])
async def query_franchise_analytics(
    analytics_filter: FranchiseAnalyticsFilter,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    Query franchise analytics with flexible filtering.
    
    Supports complex queries across the franchise hierarchy with
    benchmarking, forecasting, and comparative analysis.
    """
    try:
        analytics_service = FranchiseAnalyticsService(db)
        
        # Build query based on filters
        query = db.query(FranchiseAnalytics)
        
        if analytics_filter.entity_type:
            query = query.filter(FranchiseAnalytics.entity_type == analytics_filter.entity_type)
        
        if analytics_filter.entity_ids:
            query = query.filter(FranchiseAnalytics.entity_id.in_(analytics_filter.entity_ids))
        
        if analytics_filter.period_type:
            query = query.filter(FranchiseAnalytics.period_type == analytics_filter.period_type)
        
        if analytics_filter.date_range_start:
            query = query.filter(FranchiseAnalytics.period_start >= analytics_filter.date_range_start)
        
        if analytics_filter.date_range_end:
            query = query.filter(FranchiseAnalytics.period_end <= analytics_filter.date_range_end)
        
        # Execute query
        analytics_results = query.order_by(
            FranchiseAnalytics.entity_type,
            FranchiseAnalytics.entity_id,
            desc(FranchiseAnalytics.period_start)
        ).all()
        
        # Enhanced with benchmarking if requested
        if analytics_filter.include_benchmarks:
            for result in analytics_results:
                benchmark_data = analytics_service.calculate_benchmarks(
                    result.entity_type,
                    result.entity_id,
                    result.period_type,
                    result.period_start
                )
                result.peer_comparison_metrics = benchmark_data.get("peer_comparison", {})
                result.network_percentile_ranking = benchmark_data.get("percentile_ranking", {})
                result.industry_benchmark_comparison = benchmark_data.get("industry_comparison", {})
        
        return analytics_results
        
    except Exception as e:
        logger.error(f"Error querying franchise analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to query franchise analytics: {str(e)}"
        )


@router.post("/benchmarking", response_model=BenchmarkingResponse)
async def franchise_benchmarking_analysis(
    benchmarking_request: BenchmarkingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_franchise_admin)
):
    """
    Perform franchise benchmarking analysis.
    
    Compares performance across franchise entities with industry standards,
    peer comparisons, and historical trends.
    """
    try:
        analytics_service = FranchiseAnalyticsService(db)
        
        # Perform benchmarking analysis
        benchmark_results = analytics_service.perform_comprehensive_benchmarking(
            primary_entity_type=benchmarking_request.primary_entity_type,
            primary_entity_id=benchmarking_request.primary_entity_id,
            comparison_entity_ids=benchmarking_request.comparison_entity_ids,
            benchmark_type=benchmarking_request.benchmark_type,
            metrics=benchmarking_request.metrics,
            time_period=benchmarking_request.time_period,
            normalize_by_size=benchmarking_request.normalize_by_size
        )
        
        return benchmark_results
        
    except Exception as e:
        logger.error(f"Error performing benchmarking analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to perform benchmarking analysis: {str(e)}"
        )


# Cross-Network Operations
@router.get("/cross-network/performance", response_model=Dict[str, Any])
async def get_cross_network_performance(
    network_ids: Optional[List[int]] = Query(None),
    metrics: Optional[List[str]] = Query(None),
    date_range_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Get cross-network performance comparison.
    
    Provides high-level comparison across multiple franchise networks
    for portfolio-level decision making.
    """
    try:
        analytics_service = FranchiseAnalyticsService(db)
        
        if not network_ids:
            # Get all active networks if none specified
            networks = db.query(FranchiseNetwork).filter(
                FranchiseNetwork.status == FranchiseStatus.ACTIVE
            ).all()
            network_ids = [n.id for n in networks]
        
        if not metrics:
            metrics = [
                "total_revenue", "total_locations", "average_revenue_per_location",
                "client_retention_rate", "brand_compliance_score"
            ]
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=date_range_days)
        
        # Get cross-network performance data
        performance_data = analytics_service.get_cross_network_performance(
            network_ids=network_ids,
            metrics=metrics,
            start_date=start_date,
            end_date=end_date
        )
        
        return performance_data
        
    except Exception as e:
        logger.error(f"Error retrieving cross-network performance: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve cross-network performance: {str(e)}"
        )


# Health and Status Endpoints
@router.get("/health", response_model=Dict[str, Any])
async def franchise_api_health(
    db: Session = Depends(get_db)
):
    """
    Franchise API health check with system status.
    """
    try:
        # Quick database connectivity check
        network_count = db.query(func.count(FranchiseNetwork.id)).scalar()
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database_connected": True,
            "franchise_networks_count": network_count,
            "api_version": "2.0",
            "features": [
                "network_hierarchy",
                "real_time_analytics",
                "compliance_tracking",
                "cross_network_benchmarking",
                "performance_forecasting"
            ]
        }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Franchise API health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "database_connected": False
        }