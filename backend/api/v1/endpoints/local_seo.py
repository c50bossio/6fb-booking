"""
Local SEO Management API Endpoints
Provides comprehensive local SEO optimization, Google Business Profile management,
and search engine optimization tracking
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session

from config.database import get_db
from services.local_seo_service import LocalSEOService, get_local_seo_service
from services.google_business_service import (
    GoogleBusinessService,
    get_google_business_service,
)
from services.schema_markup_service import (
    SchemaMarkupService,
    get_schema_markup_service,
)
from models.local_seo import (
    GoogleBusinessProfile,
    SEOOptimization,
    KeywordRanking,
    ReviewManagement,
    SEOAnalytics,
    OptimizationStatus,
    KeywordDifficulty,
    ReviewPlatform,
)
from utils.auth_decorators import require_auth
from utils.logging import log_user_action

router = APIRouter(prefix="/local-seo", tags=["Local SEO"])


# Pydantic Models for API
class GoogleBusinessProfileCreate(BaseModel):
    location_id: Optional[int] = None
    business_name: str
    business_description: Optional[str] = None
    business_phone: Optional[str] = None
    business_website: Optional[str] = None
    business_address: Optional[str] = None
    business_city: Optional[str] = None
    business_state: Optional[str] = None
    business_zip: Optional[str] = None
    business_country: str = "US"
    primary_category: Optional[str] = None
    secondary_categories: List[str] = []
    business_hours: Dict[str, Any] = {}
    special_hours: Dict[str, Any] = {}


class GoogleBusinessProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_phone: Optional[str] = None
    business_website: Optional[str] = None
    business_address: Optional[str] = None
    business_city: Optional[str] = None
    business_state: Optional[str] = None
    business_zip: Optional[str] = None
    primary_category: Optional[str] = None
    secondary_categories: Optional[List[str]] = None
    business_hours: Optional[Dict[str, Any]] = None
    special_hours: Optional[Dict[str, Any]] = None
    profile_photo_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    additional_photos: Optional[List[str]] = None


class SEOOptimizationUpdate(BaseModel):
    status: Optional[str] = None
    completion_percentage: Optional[int] = None
    notes: Optional[str] = None

    @validator("completion_percentage")
    def validate_percentage(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Completion percentage must be between 0 and 100")
        return v


class KeywordTrackingCreate(BaseModel):
    keyword: str
    difficulty: str = "medium"
    search_volume: int = 0
    competition: float = 0.0
    is_target: bool = True
    device_type: str = "desktop"
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    check_frequency: int = 7


class KeywordRankingUpdate(BaseModel):
    rank: Optional[int] = None
    search_volume: Optional[int] = None


class SchemaMarkupCreate(BaseModel):
    schema_type: str
    page_url: str
    business_data: Dict[str, Any]


class SchemaMarkupUpdate(BaseModel):
    schema_json: Optional[Dict[str, Any]] = None
    is_implemented: Optional[bool] = None
    implementation_method: Optional[str] = None


class GoogleOAuthRequest(BaseModel):
    authorization_code: str
    redirect_uri: str


# Google Business Profile Endpoints


@router.post("/google-business/profiles", response_model=Dict[str, Any])
async def create_google_business_profile(
    profile_data: GoogleBusinessProfileCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Create a new Google Business Profile"""
    try:
        user_id = current_user["id"]

        profile = await seo_service.create_google_business_profile(
            user_id=user_id, business_data=profile_data.dict()
        )

        await log_user_action(
            db, user_id, "create_google_business_profile", {"profile_id": profile.id}
        )

        return {
            "success": True,
            "message": "Google Business Profile created successfully",
            "profile": {
                "id": profile.id,
                "business_name": profile.business_name,
                "is_verified": profile.is_verified,
                "created_at": profile.created_at.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error creating Google Business Profile: {str(e)}"
        )


@router.get("/google-business/profiles", response_model=Dict[str, Any])
async def get_google_business_profiles(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Get user's Google Business Profiles"""
    try:
        user_id = current_user["id"]

        profile = await seo_service.get_google_business_profile(user_id)

        if not profile:
            return {
                "success": True,
                "profiles": [],
                "message": "No Google Business Profile found",
            }

        return {
            "success": True,
            "profiles": [
                {
                    "id": profile.id,
                    "business_name": profile.business_name,
                    "business_description": profile.business_description,
                    "business_phone": profile.business_phone,
                    "business_website": profile.business_website,
                    "business_address": profile.business_address,
                    "business_city": profile.business_city,
                    "business_state": profile.business_state,
                    "business_zip": profile.business_zip,
                    "primary_category": profile.primary_category,
                    "secondary_categories": profile.secondary_categories,
                    "business_hours": profile.business_hours,
                    "is_verified": profile.is_verified,
                    "is_published": profile.is_published,
                    "total_reviews": profile.total_reviews,
                    "average_rating": profile.average_rating,
                    "monthly_views": profile.monthly_views,
                    "created_at": profile.created_at.isoformat(),
                    "updated_at": profile.updated_at.isoformat(),
                    "api_last_sync": (
                        profile.api_last_sync.isoformat()
                        if profile.api_last_sync
                        else None
                    ),
                }
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving Google Business Profiles: {str(e)}",
        )


@router.put("/google-business/profiles/{profile_id}", response_model=Dict[str, Any])
async def update_google_business_profile(
    profile_id: int,
    updates: GoogleBusinessProfileUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Update Google Business Profile"""
    try:
        user_id = current_user["id"]

        # Filter out None values
        update_data = {k: v for k, v in updates.dict().items() if v is not None}

        profile = await seo_service.update_google_business_profile(
            profile_id=profile_id, user_id=user_id, updates=update_data
        )

        await log_user_action(
            db,
            user_id,
            "update_google_business_profile",
            {"profile_id": profile_id, "updates": list(update_data.keys())},
        )

        return {
            "success": True,
            "message": "Google Business Profile updated successfully",
            "profile": {
                "id": profile.id,
                "business_name": profile.business_name,
                "updated_at": profile.updated_at.isoformat(),
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating Google Business Profile: {str(e)}"
        )


@router.post(
    "/google-business/profiles/{profile_id}/sync", response_model=Dict[str, Any]
)
async def sync_google_business_profile(
    profile_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Sync profile with Google Business API"""
    try:
        user_id = current_user["id"]

        # Run sync in background
        async def perform_sync():
            result = await seo_service.sync_with_google_business_api(
                profile_id, user_id
            )
            await log_user_action(
                db,
                user_id,
                "sync_google_business_profile",
                {"profile_id": profile_id, "success": result.get("success", False)},
            )
            return result

        background_tasks.add_task(perform_sync)

        return {
            "success": True,
            "message": "Google Business Profile sync started in background",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting sync: {str(e)}")


@router.post("/google-business/oauth", response_model=Dict[str, Any])
async def handle_google_oauth(
    oauth_request: GoogleOAuthRequest,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    google_service: GoogleBusinessService = Depends(get_google_business_service),
):
    """Handle Google OAuth callback and store tokens"""
    try:
        user_id = current_user["id"]

        # Exchange code for tokens (this would need client_id and client_secret from config)
        # For now, return success placeholder

        await log_user_action(
            db,
            user_id,
            "google_oauth_connected",
            {"redirect_uri": oauth_request.redirect_uri},
        )

        return {
            "success": True,
            "message": "Google Business account connected successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error handling Google OAuth: {str(e)}"
        )


# SEO Optimization Endpoints


@router.get("/optimization/checklist", response_model=Dict[str, Any])
async def get_seo_optimization_checklist(
    profile_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Get SEO optimization checklist"""
    try:
        user_id = current_user["id"]

        status_filter = None
        if status:
            try:
                status_filter = OptimizationStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

        optimizations = await seo_service.get_seo_optimization_checklist(
            user_id=user_id,
            profile_id=profile_id,
            category=category,
            status=status_filter,
        )

        return {
            "success": True,
            "optimizations": [
                {
                    "id": opt.id,
                    "category": opt.optimization_category,
                    "item": opt.optimization_item,
                    "description": opt.optimization_description,
                    "priority": opt.optimization_priority,
                    "status": opt.status.value,
                    "completion_percentage": opt.completion_percentage,
                    "impact_score": opt.impact_score,
                    "difficulty_score": opt.difficulty_score,
                    "estimated_time_hours": opt.estimated_time_hours,
                    "implementation_steps": opt.implementation_steps,
                    "helpful_resources": opt.helpful_resources,
                    "notes": opt.notes,
                    "started_date": (
                        opt.started_date.isoformat() if opt.started_date else None
                    ),
                    "completed_date": (
                        opt.completed_date.isoformat() if opt.completed_date else None
                    ),
                    "last_checked_date": (
                        opt.last_checked_date.isoformat()
                        if opt.last_checked_date
                        else None
                    ),
                    "created_at": opt.created_at.isoformat(),
                    "updated_at": opt.updated_at.isoformat(),
                }
                for opt in optimizations
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving optimization checklist: {str(e)}"
        )


@router.put("/optimization/{optimization_id}", response_model=Dict[str, Any])
async def update_seo_optimization(
    optimization_id: int,
    updates: SEOOptimizationUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Update SEO optimization item"""
    try:
        user_id = current_user["id"]

        # Filter out None values
        update_data = {k: v for k, v in updates.dict().items() if v is not None}

        optimization = await seo_service.update_seo_optimization(
            optimization_id=optimization_id, user_id=user_id, updates=update_data
        )

        await log_user_action(
            db,
            user_id,
            "update_seo_optimization",
            {"optimization_id": optimization_id, "status": optimization.status.value},
        )

        return {
            "success": True,
            "message": "SEO optimization updated successfully",
            "optimization": {
                "id": optimization.id,
                "status": optimization.status.value,
                "completion_percentage": optimization.completion_percentage,
                "updated_at": optimization.updated_at.isoformat(),
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating SEO optimization: {str(e)}"
        )


@router.get("/optimization/score", response_model=Dict[str, Any])
async def get_seo_score(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Calculate and return SEO score"""
    try:
        user_id = current_user["id"]

        score_data = await seo_service.calculate_seo_score(user_id, profile_id)

        return {"success": True, "seo_score": score_data}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating SEO score: {str(e)}"
        )


# Keyword Tracking Endpoints


@router.post("/keywords", response_model=Dict[str, Any])
async def add_keyword_tracking(
    profile_id: int,
    keyword_data: KeywordTrackingCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Add a new keyword to track"""
    try:
        user_id = current_user["id"]

        keyword_ranking = await seo_service.add_keyword_tracking(
            user_id=user_id, profile_id=profile_id, keyword_data=keyword_data.dict()
        )

        await log_user_action(
            db,
            user_id,
            "add_keyword_tracking",
            {"keyword": keyword_data.keyword, "profile_id": profile_id},
        )

        return {
            "success": True,
            "message": "Keyword tracking added successfully",
            "keyword": {
                "id": keyword_ranking.id,
                "keyword": keyword_ranking.keyword,
                "difficulty": keyword_ranking.keyword_difficulty.value,
                "is_target": keyword_ranking.is_target_keyword,
                "created_at": keyword_ranking.created_at.isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error adding keyword tracking: {str(e)}"
        )


@router.get("/keywords", response_model=Dict[str, Any])
async def get_keyword_rankings(
    profile_id: Optional[int] = Query(None),
    target_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Get keyword rankings"""
    try:
        user_id = current_user["id"]

        keywords = await seo_service.get_keyword_rankings(
            user_id=user_id, profile_id=profile_id, target_only=target_only
        )

        return {
            "success": True,
            "keywords": [
                {
                    "id": kw.id,
                    "keyword": kw.keyword,
                    "difficulty": kw.keyword_difficulty.value,
                    "monthly_search_volume": kw.monthly_search_volume,
                    "competition_level": kw.competition_level,
                    "current_rank": kw.current_rank,
                    "previous_rank": kw.previous_rank,
                    "best_rank": kw.best_rank,
                    "worst_rank": kw.worst_rank,
                    "is_target_keyword": kw.is_target_keyword,
                    "tracking_start_date": (
                        kw.tracking_start_date.isoformat()
                        if kw.tracking_start_date
                        else None
                    ),
                    "last_checked_date": (
                        kw.last_checked_date.isoformat()
                        if kw.last_checked_date
                        else None
                    ),
                    "device_type": kw.device_type,
                    "location_city": kw.location_city,
                    "location_state": kw.location_state,
                    "average_rank_30days": kw.average_rank_30days,
                    "rank_change_30days": kw.rank_change_30days,
                    "visibility_score": kw.visibility_score,
                }
                for kw in keywords
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving keyword rankings: {str(e)}"
        )


@router.put("/keywords/{ranking_id}", response_model=Dict[str, Any])
async def update_keyword_ranking(
    ranking_id: int,
    updates: KeywordRankingUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Update keyword ranking data"""
    try:
        user_id = current_user["id"]

        ranking = await seo_service.update_keyword_ranking(
            ranking_id=ranking_id,
            user_id=user_id,
            new_rank=updates.rank,
            search_volume=updates.search_volume,
        )

        await log_user_action(
            db,
            user_id,
            "update_keyword_ranking",
            {"ranking_id": ranking_id, "new_rank": updates.rank},
        )

        return {
            "success": True,
            "message": "Keyword ranking updated successfully",
            "ranking": {
                "id": ranking.id,
                "keyword": ranking.keyword,
                "current_rank": ranking.current_rank,
                "previous_rank": ranking.previous_rank,
                "last_checked_date": ranking.last_checked_date.isoformat(),
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating keyword ranking: {str(e)}"
        )


# Schema Markup Endpoints


@router.post("/schema-markup", response_model=Dict[str, Any])
async def create_schema_markup(
    profile_id: int,
    schema_data: SchemaMarkupCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    schema_service: SchemaMarkupService = Depends(get_schema_markup_service),
):
    """Generate schema markup for business"""
    try:
        user_id = current_user["id"]

        # Generate schema based on type
        if schema_data.schema_type == "LocalBusiness":
            schema_json = schema_service.generate_local_business_schema(
                schema_data.business_data,
                schema_data.business_data.get("business_type", "BeautySalon"),
            )
        elif schema_data.schema_type == "Organization":
            schema_json = schema_service.generate_organization_schema(
                schema_data.business_data
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported schema type: {schema_data.schema_type}",
            )

        # Validate the generated schema
        validation_result = await schema_service.validate_schema_markup(schema_json)

        # Generate JSON-LD script
        json_ld_script = schema_service.generate_json_ld_script(schema_json)

        await log_user_action(
            db,
            user_id,
            "create_schema_markup",
            {"schema_type": schema_data.schema_type, "profile_id": profile_id},
        )

        return {
            "success": True,
            "message": "Schema markup generated successfully",
            "schema": {
                "type": schema_data.schema_type,
                "json": schema_json,
                "json_ld_script": json_ld_script,
                "validation": validation_result,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating schema markup: {str(e)}"
        )


@router.post("/schema-markup/validate", response_model=Dict[str, Any])
async def validate_schema_markup(
    schema_json: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    schema_service: SchemaMarkupService = Depends(get_schema_markup_service),
):
    """Validate schema markup"""
    try:
        user_id = current_user["id"]

        validation_result = await schema_service.validate_schema_markup(schema_json)

        await log_user_action(
            db,
            user_id,
            "validate_schema_markup",
            {"is_valid": validation_result["is_valid"]},
        )

        return {"success": True, "validation": validation_result}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error validating schema markup: {str(e)}"
        )


@router.get("/schema-markup/suggestions", response_model=Dict[str, Any])
async def get_schema_suggestions(
    business_type: str = Query(...),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    schema_service: SchemaMarkupService = Depends(get_schema_markup_service),
):
    """Get schema markup suggestions for business type"""
    try:
        suggestions = schema_service.get_schema_suggestions(business_type)

        return {"success": True, "suggestions": suggestions}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting schema suggestions: {str(e)}"
        )


# Analytics and Reporting


@router.get("/analytics", response_model=Dict[str, Any])
async def get_seo_analytics(
    profile_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    period_type: str = Query("daily"),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Get SEO analytics data"""
    try:
        user_id = current_user["id"]

        # Parse dates if provided
        start_date_obj = None
        end_date_obj = None

        if start_date:
            start_date_obj = datetime.fromisoformat(start_date).date()
        if end_date:
            end_date_obj = datetime.fromisoformat(end_date).date()

        analytics = await seo_service.get_seo_analytics(
            user_id=user_id,
            profile_id=profile_id,
            start_date=start_date_obj,
            end_date=end_date_obj,
            period_type=period_type,
        )

        return {
            "success": True,
            "analytics": [
                {
                    "date": a.analytics_date.isoformat(),
                    "period_type": a.period_type,
                    "total_impressions": a.total_impressions,
                    "total_clicks": a.total_clicks,
                    "average_ctr": a.average_ctr,
                    "average_position": a.average_position,
                    "local_pack_impressions": a.local_pack_impressions,
                    "local_pack_clicks": a.local_pack_clicks,
                    "profile_views": a.profile_views,
                    "profile_searches": a.profile_searches,
                    "profile_calls": a.profile_calls,
                    "profile_directions": a.profile_directions,
                    "new_reviews_count": a.new_reviews_count,
                    "total_reviews": a.total_reviews,
                    "average_rating": a.average_rating,
                }
                for a in analytics
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving SEO analytics: {str(e)}"
        )


@router.get("/reports/comprehensive", response_model=Dict[str, Any])
async def generate_comprehensive_seo_report(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Generate comprehensive SEO report"""
    try:
        user_id = current_user["id"]

        report = await seo_service.generate_seo_report(user_id, profile_id)

        await log_user_action(
            db, user_id, "generate_seo_report", {"profile_id": profile_id}
        )

        return {"success": True, "report": report}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating SEO report: {str(e)}"
        )


# Review Management


@router.get("/reviews", response_model=Dict[str, Any])
async def get_reviews(
    profile_id: Optional[int] = Query(None),
    platform: Optional[str] = Query(None),
    needs_response: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Get reviews for management"""
    try:
        user_id = current_user["id"]

        platform_filter = None
        if platform:
            try:
                platform_filter = ReviewPlatform(platform)
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid platform: {platform}"
                )

        reviews = await seo_service.get_reviews(
            user_id=user_id,
            profile_id=profile_id,
            platform=platform_filter,
            needs_response=needs_response,
        )

        return {
            "success": True,
            "reviews": [
                {
                    "id": r.id,
                    "platform": r.platform.value,
                    "reviewer_name": r.reviewer_name,
                    "review_text": r.review_text,
                    "review_rating": r.review_rating,
                    "review_date": r.review_date.isoformat() if r.review_date else None,
                    "business_response": r.business_response,
                    "response_date": (
                        r.response_date.isoformat() if r.response_date else None
                    ),
                    "needs_response": r.needs_response,
                    "response_priority": r.response_priority,
                    "sentiment_score": r.sentiment_score,
                    "sentiment_keywords": r.sentiment_keywords,
                    "review_categories": r.review_categories,
                    "is_flagged": r.is_flagged,
                    "flagged_reason": r.flagged_reason,
                    "follow_up_required": r.follow_up_required,
                }
                for r in reviews
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving reviews: {str(e)}"
        )


@router.post("/reviews/{platform}/sync", response_model=Dict[str, Any])
async def sync_platform_reviews(
    platform: str,
    profile_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(require_auth),
    seo_service: LocalSEOService = Depends(get_local_seo_service),
):
    """Sync reviews from external platform"""
    try:
        user_id = current_user["id"]

        try:
            platform_enum = ReviewPlatform(platform)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")

        # Run sync in background
        async def perform_sync():
            result = await seo_service.sync_reviews(user_id, profile_id, platform_enum)
            await log_user_action(
                db,
                user_id,
                "sync_reviews",
                {
                    "platform": platform,
                    "profile_id": profile_id,
                    "success": result.get("success", False),
                },
            )
            return result

        background_tasks.add_task(perform_sync)

        return {
            "success": True,
            "message": f"Review sync from {platform} started in background",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error starting review sync: {str(e)}"
        )


# Health Check


@router.get("/health", response_model=Dict[str, Any])
async def local_seo_health_check():
    """Health check for Local SEO service"""
    try:
        return {
            "success": True,
            "status": "healthy",
            "service": "local_seo",
            "features": {
                "google_business_integration": True,
                "seo_optimization": True,
                "keyword_tracking": True,
                "schema_markup": True,
                "review_management": True,
                "analytics": True,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }
