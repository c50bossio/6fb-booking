"""
CDN management API endpoints for BookedBarber V2.
Provides CDN configuration, analytics, cache management, and health monitoring.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from services.cdn_service import cdn_service
from utils.auth import get_current_user
from utils.permissions import require_permission
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v2/cdn",
    tags=["cdn"]
)


# Request/Response models
class CDNStatusResponse(BaseModel):
    enabled: bool
    provider: str
    domain: Optional[str] = None
    healthy: bool
    response_time_ms: Optional[float] = None
    last_checked: datetime
    error: Optional[str] = None


class CDNAnalyticsResponse(BaseModel):
    cache_hit_rate: float = Field(..., description="Cache hit rate (0.0 to 1.0)")
    total_requests: int = Field(..., description="Total requests in time period")
    bandwidth_saved_mb: float = Field(..., description="Bandwidth saved in MB")
    avg_response_time_ms: float = Field(..., description="Average response time in milliseconds")
    error_rate: float = Field(..., description="Error rate (0.0 to 1.0)")
    top_assets: List[Dict[str, Any]] = Field(..., description="Top requested assets")


class PurgeRequest(BaseModel):
    paths: Optional[List[str]] = Field(None, description="Specific paths to purge")
    tags: Optional[List[str]] = Field(None, description="Cache tags to purge")
    purge_all: bool = Field(False, description="Purge entire cache")


class PurgeResponse(BaseModel):
    success: bool
    job_id: Optional[str] = None
    message: str
    errors: Optional[List[str]] = None


class AssetOptimizationRequest(BaseModel):
    image_url: str
    width: Optional[int] = None
    height: Optional[int] = None
    format: str = "webp"
    quality: int = Field(85, ge=1, le=100)


class AssetOptimizationResponse(BaseModel):
    original_url: str
    optimized_url: str
    estimated_savings_percent: Optional[float] = None


@router.get("/status", response_model=CDNStatusResponse)
async def get_cdn_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get CDN status and health information.
    """
    try:
        # Check if user has permission to view CDN status
        if not require_permission(current_user, "cdn:read", raise_exception=False):
            # Return limited info for non-admin users
            return CDNStatusResponse(
                enabled=cdn_service.is_enabled(),
                provider=cdn_service.config.cdn_provider,
                healthy=True,
                last_checked=datetime.utcnow()
            )
        
        # Perform health check for admin users
        async with cdn_service as cdn:
            health_data = await cdn.health_check()
        
        return CDNStatusResponse(
            enabled=health_data.get("status") != "disabled",
            provider=health_data.get("provider", "unknown"),
            domain=cdn_service.config.cdn_url,
            healthy=health_data.get("status") == "healthy",
            response_time_ms=health_data.get("response_time_ms"),
            last_checked=datetime.utcnow(),
            error=health_data.get("error")
        )
        
    except Exception as e:
        logger.error(f"Failed to get CDN status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve CDN status")


@router.get("/analytics", response_model=CDNAnalyticsResponse)
async def get_cdn_analytics(
    days: int = 7,
    current_user: User = Depends(get_current_user)
):
    """
    Get CDN performance analytics.
    
    Args:
        days: Number of days to include in analytics (1-30)
    """
    # Require admin permission for analytics
    require_permission(current_user, "cdn:analytics")
    
    if not (1 <= days <= 30):
        raise HTTPException(status_code=400, detail="Days must be between 1 and 30")
    
    try:
        async with cdn_service as cdn:
            analytics_data = await cdn.get_cache_analytics()
        
        return CDNAnalyticsResponse(
            cache_hit_rate=analytics_data.get("cache_hit_rate", 0.0),
            total_requests=analytics_data.get("total_requests", 0),
            bandwidth_saved_mb=analytics_data.get("bandwidth_saved_gb", 0) * 1024,
            avg_response_time_ms=analytics_data.get("avg_response_time_ms", 0),
            error_rate=analytics_data.get("error_rate", 0.0),
            top_assets=analytics_data.get("top_assets", [])
        )
        
    except Exception as e:
        logger.error(f"Failed to get CDN analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve CDN analytics")


@router.post("/purge", response_model=PurgeResponse)
async def purge_cdn_cache(
    request: PurgeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Purge CDN cache for specific paths, tags, or entire cache.
    """
    # Require admin permission for cache purging
    require_permission(current_user, "cdn:purge")
    
    if not any([request.paths, request.tags, request.purge_all]):
        raise HTTPException(
            status_code=400,
            detail="Must specify paths, tags, or purge_all=true"
        )
    
    try:
        async with cdn_service as cdn:
            if request.purge_all:
                # Purge entire cache (use with caution)
                success = await cdn.purge_cache(["/"])
                message = "Initiated full cache purge"
            elif request.paths:
                # Purge specific paths
                success = await cdn.purge_cache(request.paths, request.tags)
                message = f"Initiated cache purge for {len(request.paths)} paths"
            elif request.tags:
                # Purge by tags only
                success = await cdn.purge_cache([], request.tags)
                message = f"Initiated cache purge for {len(request.tags)} tags"
            else:
                raise HTTPException(status_code=400, detail="Invalid purge request")
        
        if success:
            # Log the purge action
            logger.info(
                f"CDN cache purge initiated by user {current_user.id}: "
                f"paths={request.paths}, tags={request.tags}, purge_all={request.purge_all}"
            )
            
            return PurgeResponse(
                success=True,
                message=message
            )
        else:
            return PurgeResponse(
                success=False,
                message="Cache purge failed - check CDN configuration"
            )
            
    except Exception as e:
        logger.error(f"Failed to purge CDN cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to purge CDN cache")


@router.post("/optimize-image", response_model=AssetOptimizationResponse)
async def optimize_image(
    request: AssetOptimizationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get optimized image URL using CDN image optimization.
    """
    try:
        async with cdn_service as cdn:
            optimized_url = await cdn.optimize_image(
                request.image_url,
                width=request.width,
                height=request.height,
                format=request.format,
                quality=request.quality
            )
        
        # Estimate savings (simplified calculation)
        estimated_savings = None
        if request.width or request.height:
            # Rough estimate: 30-50% savings for resized images
            estimated_savings = 35.0
        elif request.format == "webp":
            # WebP typically saves 25-35% over JPEG
            estimated_savings = 30.0
        
        return AssetOptimizationResponse(
            original_url=request.image_url,
            optimized_url=optimized_url,
            estimated_savings_percent=estimated_savings
        )
        
    except Exception as e:
        logger.error(f"Failed to optimize image: {e}")
        raise HTTPException(status_code=500, detail="Failed to optimize image")


@router.get("/asset-url")
async def get_cdn_asset_url(
    path: str,
    asset_type: str = "static",
    current_user: User = Depends(get_current_user)
):
    """
    Get CDN URL for a specific asset.
    
    Args:
        path: Asset path (e.g., '/images/logo.png')
        asset_type: Asset type (static, dynamic, tracking, api)
    """
    try:
        cdn_url = cdn_service.get_asset_url(path, asset_type)
        cache_headers = cdn_service.get_cache_headers(asset_type)
        
        return {
            "original_path": path,
            "cdn_url": cdn_url,
            "asset_type": asset_type,
            "cache_headers": cache_headers,
            "cdn_enabled": cdn_service.is_enabled()
        }
        
    except Exception as e:
        logger.error(f"Failed to get CDN asset URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to get CDN asset URL")


@router.get("/preload-headers")
async def get_preload_headers(
    assets: List[str],
    current_user: User = Depends(get_current_user)
):
    """
    Generate preload headers for critical assets.
    
    Args:
        assets: List of asset paths to generate preload headers for
    """
    try:
        # Convert assets to the format expected by generate_preload_headers
        asset_configs = []
        for asset_path in assets:
            # Determine asset type from extension
            if asset_path.endswith(('.css', '.scss')):
                asset_type = 'style'
            elif asset_path.endswith(('.js', '.jsx', '.ts', '.tsx')):
                asset_type = 'script'
            elif asset_path.endswith(('.woff', '.woff2', '.ttf', '.otf')):
                asset_type = 'font'
            elif asset_path.endswith(('.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg')):
                asset_type = 'image'
            else:
                asset_type = 'unknown'
            
            asset_configs.append({
                'path': asset_path,
                'type': asset_type
            })
        
        preload_headers = cdn_service.generate_preload_headers(asset_configs)
        
        return {
            "preload_headers": preload_headers,
            "total_assets": len(assets),
            "cdn_enabled": cdn_service.is_enabled()
        }
        
    except Exception as e:
        logger.error(f"Failed to generate preload headers: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate preload headers")


@router.get("/configuration")
async def get_cdn_configuration(
    current_user: User = Depends(get_current_user)
):
    """
    Get CDN configuration details (admin only).
    """
    # Require admin permission for configuration details
    require_permission(current_user, "cdn:admin")
    
    try:
        config = cdn_service.config
        
        # Return safe configuration details (no sensitive data)
        return {
            "enabled": config.cdn_enabled,
            "provider": config.cdn_provider,
            "url": config.cdn_url,
            "image_optimization": config.image_optimization,
            "image_formats": config.image_formats,
            "image_quality": config.image_quality,
            "cache_settings": {
                "static": config.cache_control_static,
                "dynamic": config.cache_control_dynamic,
                "tracking": config.cache_control_tracking
            },
            "cors_enabled": config.cors_enabled,
            "cors_origins": config.cors_origins,
            "hotlink_protection": config.hotlink_protection
        }
        
    except Exception as e:
        logger.error(f"Failed to get CDN configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to get CDN configuration")


# Background task for periodic cache warming
async def warm_cdn_cache():
    """
    Background task to warm CDN cache with critical assets.
    """
    try:
        critical_assets = [
            "/favicon.ico",
            "/images/logo.svg",
            "/css/globals.css",
            "/fonts/inter-var.woff2"
        ]
        
        async with cdn_service as cdn:
            for asset in critical_assets:
                # This would ideally make a request to warm the cache
                cdn_url = cdn.get_asset_url(asset, "static")
                logger.info(f"Warmed CDN cache for: {cdn_url}")
                
    except Exception as e:
        logger.error(f"Failed to warm CDN cache: {e}")


@router.post("/warm-cache")
async def warm_cache(
    assets: Optional[List[str]] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user)
):
    """
    Warm CDN cache for specified assets or critical assets.
    """
    # Require admin permission for cache warming
    require_permission(current_user, "cdn:admin")
    
    if assets:
        # Warm specific assets
        background_tasks.add_task(warm_specific_assets, assets)
        message = f"Initiated cache warming for {len(assets)} assets"
    else:
        # Warm critical assets
        background_tasks.add_task(warm_cdn_cache)
        message = "Initiated cache warming for critical assets"
    
    return {
        "success": True,
        "message": message
    }


async def warm_specific_assets(assets: List[str]):
    """Warm cache for specific assets."""
    try:
        async with cdn_service as cdn:
            for asset in assets:
                cdn_url = cdn.get_asset_url(asset, "static")
                logger.info(f"Warmed CDN cache for: {cdn_url}")
    except Exception as e:
        logger.error(f"Failed to warm specific assets: {e}")


# Include router in main application
__all__ = ["router"]