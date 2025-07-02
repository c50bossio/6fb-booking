"""
Review management router for BookedBarber V2.
Handles review CRUD, responses, templates, analytics, and GMB integration.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import User
from models.review import Review, ReviewResponse, ReviewTemplate, ReviewPlatform, ReviewSentiment
from models.integration import Integration, IntegrationType
from schemas.review import (
    ReviewResponse as ReviewResponseSchema,
    ReviewResponseCreate,
    ReviewResponseUpdate,
    ReviewResponseSchema as ReviewResponseDisplaySchema,
    ReviewTemplateSchema,
    ReviewTemplateCreate,
    ReviewTemplateUpdate,
    ReviewAnalytics,
    ReviewFilters,
    ReviewSyncRequest,
    ReviewSyncResponse,
    GMBAuthRequest,
    GMBAuthResponse,
    ReviewTemplateGenerateRequest,
    ReviewTemplateGenerateResponse,
    BulkResponseRequest,
    BulkResponseResponse,
    AutoResponseConfig,
    AutoResponseStats
)
from services.review_service import ReviewService
from services.gmb_service import GMBService
from utils.auth import get_current_user
from utils.rate_limit import limiter
from sqlalchemy import func


router = APIRouter(prefix="/reviews", tags=["reviews"])
review_service = ReviewService()
gmb_service = GMBService()


# Review endpoints
@router.get("", response_model=dict)
@limiter.limit("30/minute")
async def get_reviews(
    request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    platform: Optional[ReviewPlatform] = Query(None),
    sentiment: Optional[ReviewSentiment] = Query(None),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    max_rating: Optional[float] = Query(None, ge=1, le=5),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search_query: Optional[str] = Query(None, max_length=255),
    business_id: Optional[str] = Query(None),
    has_response: Optional[bool] = Query(None),
    is_flagged: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc")
):
    """Get paginated reviews with filtering and sorting"""
    try:
        # Build filters
        filters = ReviewFilters(
            platform=platform,
            sentiment=sentiment,
            min_rating=min_rating,
            max_rating=max_rating,
            start_date=start_date,
            end_date=end_date,
            search_query=search_query,
            business_id=business_id,
            has_response=has_response,
            is_flagged=is_flagged
        )
        
        reviews, total = review_service.get_reviews(
            db=db,
            user_id=current_user.id,
            filters=filters,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        return {
            "reviews": [ReviewResponseSchema.from_orm(review) for review in reviews],
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + limit < total
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get reviews: {str(e)}"
        )


@router.get("/{review_id}", response_model=ReviewResponseSchema)
@limiter.limit("60/minute")
async def get_review(
    request,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific review by ID"""
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return ReviewResponseSchema.from_orm(review)


@router.post("/{review_id}/respond", response_model=ReviewResponseDisplaySchema)
@limiter.limit("10/minute")
async def create_review_response(
    request,
    review_id: int,
    response_data: ReviewResponseCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a response to a review"""
    try:
        # Create the response
        response = review_service.create_review_response(
            db=db,
            review_id=review_id,
            user_id=current_user.id,
            response_text=response_data.response_text,
            template_id=int(response_data.template_id) if response_data.template_id else None,
            auto_generated=False
        )
        
        # If user wants to send immediately, try to send via platform API
        # This would be handled in background task for better UX
        
        return ReviewResponseDisplaySchema.from_orm(response)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create response: {str(e)}"
        )


@router.put("/responses/{response_id}", response_model=ReviewResponseDisplaySchema)
@limiter.limit("20/minute")
async def update_review_response(
    request,
    response_id: int,
    response_data: ReviewResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a review response"""
    response = db.query(ReviewResponse).filter(
        ReviewResponse.id == response_id,
        ReviewResponse.user_id == current_user.id
    ).first()
    
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review response not found"
        )
    
    if response.is_sent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update response that has already been sent"
        )
    
    # Update fields
    update_data = response_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(response, field, value)
    
    if response_data.response_text:
        response.update_character_count()
    
    db.commit()
    db.refresh(response)
    
    return ReviewResponseDisplaySchema.from_orm(response)


@router.post("/responses/{response_id}/send", response_model=dict)
@limiter.limit("10/minute")
async def send_review_response(
    request,
    response_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a review response to the platform"""
    try:
        response = review_service.send_review_response(
            db=db,
            response_id=response_id,
            user_id=current_user.id
        )
        
        # Add background task to actually send via platform API
        # background_tasks.add_task(send_response_to_platform, response)
        
        return {
            "success": True,
            "message": "Response sent successfully",
            "response_id": response.id,
            "sent_at": response.sent_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send response: {str(e)}"
        )


# Analytics endpoints
@router.get("/analytics", response_model=ReviewAnalytics)
@limiter.limit("20/minute")
async def get_review_analytics(
    request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    business_id: Optional[str] = Query(None)
):
    """Get comprehensive review analytics"""
    try:
        analytics = review_service.get_review_analytics(
            db=db,
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date,
            business_id=business_id
        )
        
        return analytics
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )


# Sync endpoints
@router.post("/sync", response_model=ReviewSyncResponse)
@limiter.limit("5/minute")
async def sync_reviews(
    request,
    sync_request: ReviewSyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger review sync from platform"""
    try:
        if sync_request.platform == ReviewPlatform.GOOGLE:
            # Get GMB integration
            integration = db.query(Integration).filter(
                Integration.user_id == current_user.id,
                Integration.integration_type == IntegrationType.GOOGLE_MY_BUSINESS,
                Integration.is_active == True
            ).first()
            
            if not integration:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Google My Business integration not found"
                )
            
            # Get business locations if no business_id provided
            if not sync_request.business_id:
                locations = await gmb_service.get_business_locations(integration)
                if not locations:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No business locations found"
                    )
                business_id = locations[0].location_id
            else:
                business_id = sync_request.business_id
            
            # Sync reviews
            new_count, updated_count, errors = await gmb_service.sync_reviews_for_location(
                db=db,
                integration=integration,
                location_id=business_id,
                days_back=sync_request.date_range_days
            )
            
            # Get updated stats
            total_reviews = db.query(Review).filter(
                Review.user_id == current_user.id,
                Review.platform == ReviewPlatform.GOOGLE
            ).count()
            
            avg_rating_result = db.query(func.avg(Review.rating)).filter(
                Review.user_id == current_user.id,
                Review.platform == ReviewPlatform.GOOGLE
            ).scalar()
            avg_rating = float(avg_rating_result) if avg_rating_result else 0.0
            
            return ReviewSyncResponse(
                success=True,
                message=f"Synced {new_count} new reviews and updated {updated_count} existing reviews",
                synced_at=datetime.utcnow(),
                platform=sync_request.platform,
                business_id=business_id,
                reviews_synced=new_count + updated_count,
                new_reviews=new_count,
                updated_reviews=updated_count,
                errors_count=len(errors),
                total_reviews_after_sync=total_reviews,
                average_rating_after_sync=round(avg_rating, 2),
                errors=errors
            )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sync not supported for platform: {sync_request.platform}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync reviews: {str(e)}"
        )


# Template endpoints
@router.get("/templates", response_model=List[ReviewTemplateSchema])
@limiter.limit("30/minute")
async def get_review_templates(
    request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    category: Optional[str] = Query(None),
    platform: Optional[ReviewPlatform] = Query(None),
    is_active: Optional[bool] = Query(None)
):
    """Get review response templates"""
    query = db.query(ReviewTemplate).filter(ReviewTemplate.user_id == current_user.id)
    
    if category:
        query = query.filter(ReviewTemplate.category == category.lower())
    if platform:
        query = query.filter(ReviewTemplate.platform == platform)
    if is_active is not None:
        query = query.filter(ReviewTemplate.is_active == is_active)
    
    templates = query.order_by(ReviewTemplate.priority.desc(), ReviewTemplate.created_at.desc()).all()
    
    return [ReviewTemplateSchema.from_orm(template) for template in templates]


@router.post("/templates", response_model=ReviewTemplateSchema)
@limiter.limit("10/minute")
async def create_review_template(
    request,
    template_data: ReviewTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new review response template"""
    try:
        template = ReviewTemplate(
            user_id=current_user.id,
            **template_data.dict()
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        return ReviewTemplateSchema.from_orm(template)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )


@router.put("/templates/{template_id}", response_model=ReviewTemplateSchema)
@limiter.limit("20/minute")
async def update_review_template(
    request,
    template_id: int,
    template_data: ReviewTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a review response template"""
    template = db.query(ReviewTemplate).filter(
        ReviewTemplate.id == template_id,
        ReviewTemplate.user_id == current_user.id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Update fields
    update_data = template_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    
    return ReviewTemplateSchema.from_orm(template)


@router.delete("/templates/{template_id}", response_model=dict)
@limiter.limit("20/minute")
async def delete_review_template(
    request,
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a review response template"""
    template = db.query(ReviewTemplate).filter(
        ReviewTemplate.id == template_id,
        ReviewTemplate.user_id == current_user.id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    db.delete(template)
    db.commit()
    
    return {"success": True, "message": "Template deleted successfully"}


@router.post("/templates/{template_id}/generate", response_model=ReviewTemplateGenerateResponse)
@limiter.limit("20/minute")
async def generate_response_from_template(
    request,
    template_id: int,
    review_id: int,
    generate_request: ReviewTemplateGenerateRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a response using a template"""
    try:
        # Get template
        template = db.query(ReviewTemplate).filter(
            ReviewTemplate.id == template_id,
            ReviewTemplate.user_id == current_user.id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Get review
        review = db.query(Review).filter(
            Review.id == review_id,
            Review.user_id == current_user.id
        ).first()
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        # Generate response
        business_name = generate_request.business_name if generate_request else None
        custom_placeholders = generate_request.custom_placeholders if generate_request else {}
        
        response_text = review_service.generate_response_from_template(
            db=db,
            template=template,
            review=review,
            business_name=business_name,
            custom_placeholders=custom_placeholders
        )
        
        return ReviewTemplateGenerateResponse(
            success=True,
            response_text=response_text,
            template_used=template.name,
            character_count=len(response_text),
            placeholders_replaced=custom_placeholders,
            seo_keywords_included=template.seo_keywords
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )


# Bulk operations
@router.post("/bulk/respond", response_model=BulkResponseResponse)
@limiter.limit("3/minute")
async def bulk_generate_responses(
    request,
    bulk_request: BulkResponseRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate responses for multiple reviews"""
    try:
        results = []
        successful = 0
        failed = 0
        
        for review_id in bulk_request.review_ids:
            try:
                # Get review
                review = db.query(Review).filter(
                    Review.id == review_id,
                    Review.user_id == current_user.id
                ).first()
                
                if not review:
                    results.append({
                        "review_id": review_id,
                        "success": False,
                        "error": "Review not found"
                    })
                    failed += 1
                    continue
                
                if not review.can_respond:
                    results.append({
                        "review_id": review_id,
                        "success": False,
                        "error": "Cannot respond to this review"
                    })
                    failed += 1
                    continue
                
                # Generate response
                if bulk_request.template_id:
                    template = db.query(ReviewTemplate).filter(
                        ReviewTemplate.id == bulk_request.template_id,
                        ReviewTemplate.user_id == current_user.id
                    ).first()
                    
                    if not template:
                        results.append({
                            "review_id": review_id,
                            "success": False,
                            "error": "Template not found"
                        })
                        failed += 1
                        continue
                    
                    response_text = review_service.generate_response_from_template(
                        db=db,
                        template=template,
                        review=review,
                        business_name=bulk_request.business_name
                    )
                else:
                    response_text = review_service.generate_auto_response(
                        db=db,
                        review=review,
                        business_name=bulk_request.business_name
                    )
                
                # Create response
                response = review_service.create_review_response(
                    db=db,
                    review_id=review_id,
                    user_id=current_user.id,
                    response_text=response_text,
                    template_id=bulk_request.template_id,
                    auto_generated=bulk_request.template_id is None
                )
                
                # Send immediately if requested
                if bulk_request.auto_send:
                    review_service.send_review_response(
                        db=db,
                        response_id=response.id,
                        user_id=current_user.id
                    )
                
                results.append({
                    "review_id": review_id,
                    "success": True,
                    "response_id": response.id,
                    "response_text": response_text
                })
                successful += 1
                
            except Exception as e:
                results.append({
                    "review_id": review_id,
                    "success": False,
                    "error": str(e)
                })
                failed += 1
        
        return BulkResponseResponse(
            success=successful > 0,
            message=f"Generated {successful} responses, {failed} failed",
            total_processed=len(bulk_request.review_ids),
            successful_responses=successful,
            failed_responses=failed,
            results=results
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate bulk responses: {str(e)}"
        )


# Auto-response endpoints
@router.get("/auto-response/stats", response_model=AutoResponseStats)
@limiter.limit("20/minute")
async def get_auto_response_stats(
    request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days_back: int = Query(30, ge=1, le=365)
):
    """Get auto-response system statistics"""
    try:
        stats = review_service.get_auto_response_stats(
            db=db,
            user_id=current_user.id,
            days_back=days_back
        )
        
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get auto-response stats: {str(e)}"
        )


# GMB Integration endpoints
@router.post("/gmb/auth", response_model=GMBAuthResponse)
@limiter.limit("5/minute")
async def initiate_gmb_auth(
    request,
    auth_request: GMBAuthRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Initiate Google My Business OAuth flow"""
    try:
        # Generate OAuth URL
        redirect_uri = auth_request.redirect_uri or "http://localhost:3000/integrations/gmb/callback"
        state = f"user_{current_user.id}"
        
        auth_url = gmb_service.get_oauth_url(redirect_uri, state)
        
        return GMBAuthResponse(
            success=True,
            message="OAuth URL generated successfully",
            auth_url=auth_url
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate GMB auth: {str(e)}"
        )


@router.get("/gmb/locations", response_model=List[dict])
@limiter.limit("10/minute")
async def get_gmb_locations(
    request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get Google My Business locations"""
    try:
        # Get GMB integration
        integration = db.query(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.integration_type == IntegrationType.GOOGLE_MY_BUSINESS,
            Integration.is_active == True
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Google My Business integration not found"
            )
        
        locations = await gmb_service.get_business_locations(integration)
        
        return [location.dict() for location in locations]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get GMB locations: {str(e)}"
        )