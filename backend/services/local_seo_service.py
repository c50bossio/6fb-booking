"""
Local SEO Management Service
Business logic for local SEO optimization, Google Business Profile management,
and search engine optimization tracking
"""

import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from models.local_seo import (
    GoogleBusinessProfile,
    SEOOptimization,
    KeywordRanking,
    KeywordRankingHistory,
    BusinessCitation,
    ReviewManagement,
    SEOAnalytics,
    SchemaMarkup,
    OptimizationStatus,
    KeywordDifficulty,
    CitationStatus,
    ReviewPlatform,
)
from models.user import User
from services.google_business_service import GoogleBusinessService
from services.schema_markup_service import SchemaMarkupService
from utils.encryption import encrypt_data, decrypt_data

logger = logging.getLogger(__name__)


class LocalSEOService:
    """Service for managing local SEO optimization and Google Business Profile"""

    def __init__(self, db: Session):
        self.db = db
        self.google_service = GoogleBusinessService()
        self.schema_service = SchemaMarkupService()

    # Google Business Profile Management

    async def create_google_business_profile(
        self,
        user_id: int,
        business_data: Dict[str, Any],
        google_tokens: Optional[Dict[str, str]] = None,
    ) -> GoogleBusinessProfile:
        """Create a new Google Business Profile"""
        try:
            # Encrypt sensitive tokens if provided
            encrypted_access_token = None
            encrypted_refresh_token = None
            if google_tokens:
                if google_tokens.get("access_token"):
                    encrypted_access_token = encrypt_data(google_tokens["access_token"])
                if google_tokens.get("refresh_token"):
                    encrypted_refresh_token = encrypt_data(
                        google_tokens["refresh_token"]
                    )

            profile = GoogleBusinessProfile(
                user_id=user_id,
                location_id=business_data.get("location_id"),
                google_place_id=business_data.get("google_place_id"),
                business_name=business_data["business_name"],
                business_description=business_data.get("business_description"),
                business_phone=business_data.get("business_phone"),
                business_website=business_data.get("business_website"),
                business_address=business_data.get("business_address"),
                business_city=business_data.get("business_city"),
                business_state=business_data.get("business_state"),
                business_zip=business_data.get("business_zip"),
                business_country=business_data.get("business_country", "US"),
                primary_category=business_data.get("primary_category"),
                secondary_categories=business_data.get("secondary_categories", []),
                business_hours=business_data.get("business_hours", {}),
                special_hours=business_data.get("special_hours", {}),
                google_access_token=encrypted_access_token,
                google_refresh_token=encrypted_refresh_token,
                api_last_sync=datetime.utcnow() if google_tokens else None,
            )

            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)

            # Initialize SEO optimization checklist
            await self._initialize_seo_checklist(profile.id, user_id)

            logger.info(f"Created Google Business Profile for user {user_id}")
            return profile

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating Google Business Profile: {str(e)}")
            raise

    async def get_google_business_profile(
        self, user_id: int, profile_id: Optional[int] = None
    ) -> Optional[GoogleBusinessProfile]:
        """Get Google Business Profile for user"""
        query = self.db.query(GoogleBusinessProfile).filter(
            GoogleBusinessProfile.user_id == user_id
        )

        if profile_id:
            query = query.filter(GoogleBusinessProfile.id == profile_id)

        return query.first()

    async def update_google_business_profile(
        self, profile_id: int, user_id: int, updates: Dict[str, Any]
    ) -> GoogleBusinessProfile:
        """Update Google Business Profile"""
        try:
            profile = (
                self.db.query(GoogleBusinessProfile)
                .filter(
                    and_(
                        GoogleBusinessProfile.id == profile_id,
                        GoogleBusinessProfile.user_id == user_id,
                    )
                )
                .first()
            )

            if not profile:
                raise ValueError("Profile not found")

            # Update allowed fields
            allowed_fields = [
                "business_name",
                "business_description",
                "business_phone",
                "business_website",
                "business_address",
                "business_city",
                "business_state",
                "business_zip",
                "primary_category",
                "secondary_categories",
                "business_hours",
                "special_hours",
                "profile_photo_url",
                "cover_photo_url",
                "additional_photos",
            ]

            for field, value in updates.items():
                if field in allowed_fields and hasattr(profile, field):
                    setattr(profile, field, value)

            profile.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(profile)

            logger.info(f"Updated Google Business Profile {profile_id}")
            return profile

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating Google Business Profile: {str(e)}")
            raise

    async def sync_with_google_business_api(
        self, profile_id: int, user_id: int
    ) -> Dict[str, Any]:
        """Sync profile data with Google Business API"""
        try:
            profile = await self.get_google_business_profile(user_id, profile_id)
            if not profile or not profile.google_access_token:
                raise ValueError("Profile not found or not connected to Google")

            # Decrypt tokens for API call
            access_token = decrypt_data(profile.google_access_token)

            # Sync with Google Business API
            google_data = await self.google_service.get_business_profile(
                profile.google_place_id, access_token
            )

            if google_data:
                # Update profile with Google data
                updates = {
                    "total_reviews": google_data.get("total_reviews", 0),
                    "average_rating": google_data.get("average_rating", 0.0),
                    "monthly_views": google_data.get("monthly_views", 0),
                    "monthly_searches": google_data.get("monthly_searches", 0),
                    "monthly_calls": google_data.get("monthly_calls", 0),
                    "monthly_directions": google_data.get("monthly_directions", 0),
                    "is_verified": google_data.get("is_verified", False),
                    "is_published": google_data.get("is_published", False),
                }

                await self.update_google_business_profile(profile_id, user_id, updates)

                # Update sync timestamp
                profile.api_last_sync = datetime.utcnow()
                self.db.commit()

                return {"success": True, "data": google_data}

            return {"success": False, "error": "No data received from Google"}

        except Exception as e:
            logger.error(f"Error syncing with Google Business API: {str(e)}")
            return {"success": False, "error": str(e)}

    # SEO Optimization Management

    async def _initialize_seo_checklist(self, profile_id: int, user_id: int):
        """Initialize SEO optimization checklist for new profile"""
        optimization_items = [
            {
                "category": "profile_completeness",
                "item": "Complete business description",
                "description": "Add a compelling business description with keywords",
                "priority": 5,
                "impact_score": 85,
                "difficulty_score": 2,
                "estimated_time_hours": 0.5,
            },
            {
                "category": "profile_completeness",
                "item": "Add business photos",
                "description": "Upload high-quality photos of your business",
                "priority": 4,
                "impact_score": 75,
                "difficulty_score": 2,
                "estimated_time_hours": 1.0,
            },
            {
                "category": "profile_completeness",
                "item": "Verify business hours",
                "description": "Ensure business hours are accurate and complete",
                "priority": 5,
                "impact_score": 70,
                "difficulty_score": 1,
                "estimated_time_hours": 0.25,
            },
            {
                "category": "reviews",
                "item": "Encourage customer reviews",
                "description": "Implement a system to request reviews from customers",
                "priority": 5,
                "impact_score": 90,
                "difficulty_score": 3,
                "estimated_time_hours": 2.0,
            },
            {
                "category": "reviews",
                "item": "Respond to reviews",
                "description": "Respond to all customer reviews professionally",
                "priority": 4,
                "impact_score": 80,
                "difficulty_score": 2,
                "estimated_time_hours": 1.0,
            },
            {
                "category": "citations",
                "item": "Submit to local directories",
                "description": "Submit business to major local directories",
                "priority": 3,
                "impact_score": 65,
                "difficulty_score": 3,
                "estimated_time_hours": 3.0,
            },
            {
                "category": "website",
                "item": "Add schema markup",
                "description": "Implement LocalBusiness schema markup on website",
                "priority": 3,
                "impact_score": 60,
                "difficulty_score": 4,
                "estimated_time_hours": 2.0,
            },
            {
                "category": "keywords",
                "item": "Optimize for local keywords",
                "description": "Target relevant local search keywords",
                "priority": 4,
                "impact_score": 85,
                "difficulty_score": 3,
                "estimated_time_hours": 2.5,
            },
        ]

        for item_data in optimization_items:
            optimization = SEOOptimization(
                google_profile_id=profile_id,
                user_id=user_id,
                optimization_category=item_data["category"],
                optimization_item=item_data["item"],
                optimization_description=item_data["description"],
                optimization_priority=item_data["priority"],
                impact_score=item_data["impact_score"],
                difficulty_score=item_data["difficulty_score"],
                estimated_time_hours=item_data["estimated_time_hours"],
                status=OptimizationStatus.PENDING,
            )
            self.db.add(optimization)

        self.db.commit()

    async def get_seo_optimization_checklist(
        self,
        user_id: int,
        profile_id: Optional[int] = None,
        category: Optional[str] = None,
        status: Optional[OptimizationStatus] = None,
    ) -> List[SEOOptimization]:
        """Get SEO optimization checklist"""
        query = self.db.query(SEOOptimization).filter(
            SEOOptimization.user_id == user_id
        )

        if profile_id:
            query = query.filter(SEOOptimization.google_profile_id == profile_id)

        if category:
            query = query.filter(SEOOptimization.optimization_category == category)

        if status:
            query = query.filter(SEOOptimization.status == status)

        return query.order_by(
            SEOOptimization.optimization_priority.desc(),
            SEOOptimization.impact_score.desc(),
        ).all()

    async def update_seo_optimization(
        self, optimization_id: int, user_id: int, updates: Dict[str, Any]
    ) -> SEOOptimization:
        """Update SEO optimization item"""
        try:
            optimization = (
                self.db.query(SEOOptimization)
                .filter(
                    and_(
                        SEOOptimization.id == optimization_id,
                        SEOOptimization.user_id == user_id,
                    )
                )
                .first()
            )

            if not optimization:
                raise ValueError("Optimization item not found")

            # Update allowed fields
            allowed_fields = [
                "status",
                "completion_percentage",
                "notes",
                "started_date",
                "completed_date",
            ]

            for field, value in updates.items():
                if field in allowed_fields and hasattr(optimization, field):
                    if field == "status" and isinstance(value, str):
                        value = OptimizationStatus(value)
                    setattr(optimization, field, value)

            # Auto-set dates based on status
            if (
                updates.get("status") == OptimizationStatus.IN_PROGRESS
                and not optimization.started_date
            ):
                optimization.started_date = datetime.utcnow()
            elif updates.get("status") == OptimizationStatus.COMPLETED:
                optimization.completed_date = datetime.utcnow()
                optimization.completion_percentage = 100

            optimization.last_checked_date = datetime.utcnow()
            self.db.commit()
            self.db.refresh(optimization)

            return optimization

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating SEO optimization: {str(e)}")
            raise

    async def calculate_seo_score(
        self, user_id: int, profile_id: int
    ) -> Dict[str, Any]:
        """Calculate overall SEO score and breakdown"""
        try:
            optimizations = await self.get_seo_optimization_checklist(
                user_id, profile_id
            )

            if not optimizations:
                return {"overall_score": 0, "category_scores": {}, "total_items": 0}

            total_score = 0
            max_score = 0
            category_scores = {}
            category_counts = {}

            for opt in optimizations:
                weight = opt.impact_score * (opt.optimization_priority / 5.0)
                max_score += weight

                # Calculate completion score
                if opt.status == OptimizationStatus.COMPLETED:
                    completion = 1.0
                elif opt.status == OptimizationStatus.IN_PROGRESS:
                    completion = opt.completion_percentage / 100.0
                else:
                    completion = 0.0

                score = weight * completion
                total_score += score

                # Category breakdown
                category = opt.optimization_category
                if category not in category_scores:
                    category_scores[category] = {"score": 0, "max_score": 0, "count": 0}

                category_scores[category]["score"] += score
                category_scores[category]["max_score"] += weight
                category_scores[category]["count"] += 1

            # Calculate percentages
            overall_percentage = (total_score / max_score * 100) if max_score > 0 else 0

            for category in category_scores:
                cat_data = category_scores[category]
                cat_data["percentage"] = (
                    cat_data["score"] / cat_data["max_score"] * 100
                    if cat_data["max_score"] > 0
                    else 0
                )

            return {
                "overall_score": round(overall_percentage, 1),
                "category_scores": category_scores,
                "total_items": len(optimizations),
                "completed_items": len(
                    [
                        o
                        for o in optimizations
                        if o.status == OptimizationStatus.COMPLETED
                    ]
                ),
                "in_progress_items": len(
                    [
                        o
                        for o in optimizations
                        if o.status == OptimizationStatus.IN_PROGRESS
                    ]
                ),
            }

        except Exception as e:
            logger.error(f"Error calculating SEO score: {str(e)}")
            return {"overall_score": 0, "category_scores": {}, "total_items": 0}

    # Keyword Ranking Management

    async def add_keyword_tracking(
        self, user_id: int, profile_id: int, keyword_data: Dict[str, Any]
    ) -> KeywordRanking:
        """Add a new keyword to track"""
        try:
            keyword_ranking = KeywordRanking(
                google_profile_id=profile_id,
                user_id=user_id,
                keyword=keyword_data["keyword"],
                keyword_difficulty=KeywordDifficulty(
                    keyword_data.get("difficulty", "medium")
                ),
                monthly_search_volume=keyword_data.get("search_volume", 0),
                competition_level=keyword_data.get("competition", 0.0),
                is_target_keyword=keyword_data.get("is_target", True),
                tracking_start_date=date.today(),
                device_type=keyword_data.get("device_type", "desktop"),
                location_city=keyword_data.get("location_city"),
                location_state=keyword_data.get("location_state"),
                check_frequency_days=keyword_data.get("check_frequency", 7),
            )

            self.db.add(keyword_ranking)
            self.db.commit()
            self.db.refresh(keyword_ranking)

            return keyword_ranking

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding keyword tracking: {str(e)}")
            raise

    async def get_keyword_rankings(
        self, user_id: int, profile_id: Optional[int] = None, target_only: bool = False
    ) -> List[KeywordRanking]:
        """Get keyword rankings for user"""
        query = self.db.query(KeywordRanking).filter(KeywordRanking.user_id == user_id)

        if profile_id:
            query = query.filter(KeywordRanking.google_profile_id == profile_id)

        if target_only:
            query = query.filter(KeywordRanking.is_target_keyword == True)

        return query.order_by(KeywordRanking.current_rank.asc()).all()

    async def update_keyword_ranking(
        self,
        ranking_id: int,
        user_id: int,
        new_rank: Optional[int],
        search_volume: Optional[int] = None,
    ) -> KeywordRanking:
        """Update keyword ranking data"""
        try:
            ranking = (
                self.db.query(KeywordRanking)
                .filter(
                    and_(
                        KeywordRanking.id == ranking_id,
                        KeywordRanking.user_id == user_id,
                    )
                )
                .first()
            )

            if not ranking:
                raise ValueError("Keyword ranking not found")

            # Store previous rank
            if ranking.current_rank:
                ranking.previous_rank = ranking.current_rank

            # Update current rank
            ranking.current_rank = new_rank

            # Update best/worst ranks
            if new_rank:
                if not ranking.best_rank or new_rank < ranking.best_rank:
                    ranking.best_rank = new_rank
                if not ranking.worst_rank or new_rank > ranking.worst_rank:
                    ranking.worst_rank = new_rank

            # Update search volume if provided
            if search_volume is not None:
                ranking.monthly_search_volume = search_volume

            ranking.last_checked_date = date.today()

            # Add to ranking history
            history = KeywordRankingHistory(
                keyword_ranking_id=ranking.id,
                check_date=date.today(),
                rank_position=new_rank,
                search_volume=search_volume or ranking.monthly_search_volume,
                device_type=ranking.device_type,
                location_identifier=f"{ranking.location_city}, {ranking.location_state}",
            )

            self.db.add(history)
            self.db.commit()
            self.db.refresh(ranking)

            return ranking

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating keyword ranking: {str(e)}")
            raise

    # Review Management

    async def sync_reviews(
        self, user_id: int, profile_id: int, platform: ReviewPlatform
    ) -> Dict[str, Any]:
        """Sync reviews from external platform"""
        try:
            # This would integrate with platform APIs to fetch reviews
            # For now, returning a placeholder structure

            profile = await self.get_google_business_profile(user_id, profile_id)
            if not profile:
                raise ValueError("Profile not found")

            # Placeholder for external API integration
            # In real implementation, this would call Google My Business API,
            # Yelp API, etc.

            synced_count = 0
            new_reviews = []

            return {
                "success": True,
                "platform": platform.value,
                "synced_count": synced_count,
                "new_reviews": new_reviews,
            }

        except Exception as e:
            logger.error(f"Error syncing reviews: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_reviews(
        self,
        user_id: int,
        profile_id: Optional[int] = None,
        platform: Optional[ReviewPlatform] = None,
        needs_response: Optional[bool] = None,
    ) -> List[ReviewManagement]:
        """Get reviews for user"""
        query = self.db.query(ReviewManagement).filter(
            ReviewManagement.user_id == user_id
        )

        if profile_id:
            query = query.filter(ReviewManagement.google_profile_id == profile_id)

        if platform:
            query = query.filter(ReviewManagement.platform == platform)

        if needs_response is not None:
            query = query.filter(ReviewManagement.needs_response == needs_response)

        return query.order_by(ReviewManagement.review_date.desc()).all()

    # Analytics and Reporting

    async def get_seo_analytics(
        self,
        user_id: int,
        profile_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        period_type: str = "daily",
    ) -> List[SEOAnalytics]:
        """Get SEO analytics data"""
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        query = self.db.query(SEOAnalytics).filter(
            and_(
                SEOAnalytics.user_id == user_id,
                SEOAnalytics.google_profile_id == profile_id,
                SEOAnalytics.analytics_date >= start_date,
                SEOAnalytics.analytics_date <= end_date,
                SEOAnalytics.period_type == period_type,
            )
        )

        return query.order_by(SEOAnalytics.analytics_date.desc()).all()

    async def generate_seo_report(
        self, user_id: int, profile_id: int
    ) -> Dict[str, Any]:
        """Generate comprehensive SEO report"""
        try:
            profile = await self.get_google_business_profile(user_id, profile_id)
            if not profile:
                raise ValueError("Profile not found")

            # Get SEO score
            seo_score = await self.calculate_seo_score(user_id, profile_id)

            # Get keyword rankings
            keywords = await self.get_keyword_rankings(user_id, profile_id)

            # Get recent analytics
            analytics = await self.get_seo_analytics(user_id, profile_id)

            # Get optimization checklist
            optimizations = await self.get_seo_optimization_checklist(
                user_id, profile_id
            )

            # Get reviews summary
            reviews = await self.get_reviews(user_id, profile_id)

            report = {
                "profile_info": {
                    "business_name": profile.business_name,
                    "is_verified": profile.is_verified,
                    "total_reviews": profile.total_reviews,
                    "average_rating": profile.average_rating,
                    "last_sync": (
                        profile.api_last_sync.isoformat()
                        if profile.api_last_sync
                        else None
                    ),
                },
                "seo_score": seo_score,
                "keyword_performance": {
                    "total_keywords": len(keywords),
                    "ranking_keywords": len(
                        [
                            k
                            for k in keywords
                            if k.current_rank and k.current_rank <= 100
                        ]
                    ),
                    "top_10_keywords": len(
                        [k for k in keywords if k.current_rank and k.current_rank <= 10]
                    ),
                    "average_rank": (
                        sum([k.current_rank for k in keywords if k.current_rank])
                        / len([k for k in keywords if k.current_rank])
                        if keywords
                        else 0
                    ),
                },
                "optimization_progress": {
                    "total_items": len(optimizations),
                    "completed": len(
                        [
                            o
                            for o in optimizations
                            if o.status == OptimizationStatus.COMPLETED
                        ]
                    ),
                    "in_progress": len(
                        [
                            o
                            for o in optimizations
                            if o.status == OptimizationStatus.IN_PROGRESS
                        ]
                    ),
                    "pending": len(
                        [
                            o
                            for o in optimizations
                            if o.status == OptimizationStatus.PENDING
                        ]
                    ),
                },
                "review_summary": {
                    "total_reviews": len(reviews),
                    "needs_response": len([r for r in reviews if r.needs_response]),
                    "average_sentiment": (
                        sum([r.sentiment_score for r in reviews if r.sentiment_score])
                        / len([r for r in reviews if r.sentiment_score])
                        if reviews
                        else 0
                    ),
                },
                "recommendations": await self._generate_recommendations(
                    user_id, profile_id
                ),
            }

            return report

        except Exception as e:
            logger.error(f"Error generating SEO report: {str(e)}")
            raise

    async def _generate_recommendations(
        self, user_id: int, profile_id: int
    ) -> List[Dict[str, Any]]:
        """Generate personalized SEO recommendations"""
        recommendations = []

        try:
            # Get pending high-impact optimizations
            pending_optimizations = await self.get_seo_optimization_checklist(
                user_id, profile_id, status=OptimizationStatus.PENDING
            )

            high_impact_pending = [
                opt
                for opt in pending_optimizations
                if opt.impact_score >= 80 and opt.difficulty_score <= 3
            ]

            for opt in high_impact_pending[:3]:  # Top 3 recommendations
                recommendations.append(
                    {
                        "type": "optimization",
                        "priority": "high",
                        "title": opt.optimization_item,
                        "description": opt.optimization_description,
                        "impact_score": opt.impact_score,
                        "estimated_time": opt.estimated_time_hours,
                        "category": opt.optimization_category,
                    }
                )

            # Add keyword-specific recommendations
            keywords = await self.get_keyword_rankings(
                user_id, profile_id, target_only=True
            )
            unranked_keywords = [
                k for k in keywords if not k.current_rank or k.current_rank > 100
            ]

            if unranked_keywords:
                recommendations.append(
                    {
                        "type": "keyword",
                        "priority": "medium",
                        "title": "Improve keyword rankings",
                        "description": f"Focus on ranking for {len(unranked_keywords)} target keywords",
                        "impact_score": 75,
                        "estimated_time": 3.0,
                        "category": "keywords",
                    }
                )

            return recommendations

        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return []


# Dependency injection function
def get_local_seo_service(db: Session) -> LocalSEOService:
    """Dependency injection for LocalSEOService"""
    return LocalSEOService(db)
