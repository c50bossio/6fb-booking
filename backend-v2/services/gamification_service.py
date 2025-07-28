"""
Gamification Service for BookedBarber V2

This service manages the comprehensive gamification system, including:
- Achievement progress calculation and unlocking
- Experience points (XP) management and level progression
- Challenge creation and progress tracking
- Leaderboard management and ranking
- Notification and celebration system
- Six Figure Barber methodology integration

The service is designed to motivate barbers through structured progression
aligned with business growth and the Six Figure Barber principles.
"""

from datetime import datetime, timedelta, date, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func, text
from sqlalchemy.sql import select
import json
import logging
from dataclasses import dataclass

from models import (
    User, Appointment, Payment, Service, Client,
    AchievementDefinition, UserAchievement, UserXPProfile, XPTransaction,
    GamificationChallenge, ChallengeParticipation, Leaderboard, LeaderboardEntry,
    GamificationNotification, GamificationAnalytics,
    AchievementCategory, AchievementRarity, AchievementType, XPSource,
    NotificationType, ChallengeType, LeaderboardType,
    SixFBRevenueMetrics, SixFBClientValueProfile, SixFBEfficiencyMetrics,
    SixFBGrowthMetrics, SixFBServiceExcellenceMetrics
)

logger = logging.getLogger(__name__)


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass
class AchievementUnlock:
    """Data class for achievement unlock events"""
    achievement_id: int
    achievement_name: str
    xp_earned: int
    rarity: str
    category: str
    unlock_context: Dict[str, Any]
    celebration_data: Dict[str, Any]


@dataclass
class XPEarnedEvent:
    """Data class for XP earning events"""
    amount: int
    source: str
    source_description: str
    multiplier_applied: float
    bonus_reason: Optional[str]
    level_up_occurred: bool
    level_before: int
    level_after: int


class GamificationService:
    """
    Core gamification service managing achievements, XP, challenges, and leaderboards.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # XP Level Calculation Constants
        self.BASE_XP_PER_LEVEL = 100
        self.XP_MULTIPLIER_PER_LEVEL = 1.15
        
        # XP Values by Source
        self.XP_VALUES = {
            XPSource.APPOINTMENT_COMPLETION: 10,
            XPSource.CLIENT_SATISFACTION: 15,
            XPSource.REVENUE_MILESTONE: 50,
            XPSource.TIER_ADVANCEMENT: 100,
            XPSource.ACHIEVEMENT_UNLOCK: 25,
            XPSource.STREAK_MAINTENANCE: 20,
            XPSource.EFFICIENCY_IMPROVEMENT: 30,
            XPSource.SKILL_DEVELOPMENT: 40,
            XPSource.CLIENT_RETENTION: 35,
            XPSource.UPSELL_SUCCESS: 25,
            XPSource.REFERRAL_GENERATION: 45,
            XPSource.PROFESSIONAL_MILESTONE: 75
        }
        
        # Multipliers
        self.TIER_XP_MULTIPLIERS = {
            "standard": 1.0,
            "popular": 1.1,
            "premium": 1.25,
            "elite": 1.5
        }
        
        self.STREAK_XP_MULTIPLIERS = {
            7: 1.1,    # 1 week
            14: 1.15,  # 2 weeks
            30: 1.25,  # 1 month
            60: 1.4,   # 2 months
            90: 1.6    # 3 months
        }

    # ============================================================================
    # ACHIEVEMENT MANAGEMENT
    # ============================================================================

    def check_and_award_achievements(self, user_id: int, trigger_context: Dict[str, Any]) -> List[AchievementUnlock]:
        """
        Check all achievements for a user and award any that have been unlocked.
        Returns list of newly unlocked achievements.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
            
        newly_unlocked = []
        
        # Get all active achievements that user hasn't unlocked
        unlocked_achievement_ids = self.db.query(UserAchievement.achievement_id).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.is_unlocked == True
        ).subquery()
        
        available_achievements = self.db.query(AchievementDefinition).filter(
            AchievementDefinition.is_active == True,
            AchievementDefinition.id.notin_(unlocked_achievement_ids)
        ).all()
        
        for achievement in available_achievements:
            if self._check_achievement_criteria(user, achievement, trigger_context):
                unlock = self._unlock_achievement(user, achievement, trigger_context)
                if unlock:
                    newly_unlocked.append(unlock)
        
        return newly_unlocked

    def _check_achievement_criteria(self, user: User, achievement: AchievementDefinition, context: Dict[str, Any]) -> bool:
        """
        Check if user meets the criteria for a specific achievement.
        """
        try:
            requirements = achievement.requirements
            
            # Revenue-based achievements
            if achievement.category == AchievementCategory.REVENUE_MASTERY:
                return self._check_revenue_achievement(user, requirements, context)
            
            # Client excellence achievements
            elif achievement.category == AchievementCategory.CLIENT_EXCELLENCE:
                return self._check_client_excellence_achievement(user, requirements, context)
            
            # Efficiency achievements
            elif achievement.category == AchievementCategory.EFFICIENCY_EXPERT:
                return self._check_efficiency_achievement(user, requirements, context)
            
            # Growth achievements
            elif achievement.category == AchievementCategory.GROWTH_CHAMPION:
                return self._check_growth_achievement(user, requirements, context)
            
            # Service mastery achievements
            elif achievement.category == AchievementCategory.SERVICE_MASTERY:
                return self._check_service_mastery_achievement(user, requirements, context)
            
            # Brand building achievements
            elif achievement.category == AchievementCategory.BRAND_BUILDER:
                return self._check_brand_building_achievement(user, requirements, context)
            
            # Innovation achievements
            elif achievement.category == AchievementCategory.INNOVATION_LEADER:
                return self._check_innovation_achievement(user, requirements, context)
            
            # Community achievements
            elif achievement.category == AchievementCategory.COMMUNITY_LEADER:
                return self._check_community_achievement(user, requirements, context)
            
            # Consistency achievements
            elif achievement.category == AchievementCategory.CONSISTENCY_KING:
                return self._check_consistency_achievement(user, requirements, context)
            
            # Premium positioning achievements
            elif achievement.category == AchievementCategory.PREMIUM_POSITIONING:
                return self._check_premium_positioning_achievement(user, requirements, context)
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking achievement criteria for achievement {achievement.id}: {e}")
            return False

    def _check_revenue_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check revenue-based achievement criteria"""
        target_type = requirements.get("type")
        target_value = requirements.get("value")
        period = requirements.get("period", "monthly")
        
        if target_type == "monthly_revenue":
            current_month = date.today().replace(day=1)
            monthly_revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user.id,
                Payment.created_at >= current_month,
                Payment.status == "completed"
            ).scalar() or 0
            return monthly_revenue >= target_value
            
        elif target_type == "total_revenue":
            total_revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user.id,
                Payment.status == "completed"
            ).scalar() or 0
            return total_revenue >= target_value
            
        elif target_type == "revenue_streak":
            # Check consecutive months above threshold
            threshold = requirements.get("threshold")
            months_required = requirements.get("months")
            return self._check_revenue_streak(user.id, threshold, months_required)
            
        elif target_type == "average_ticket":
            avg_ticket = self.db.query(func.avg(Payment.amount)).filter(
                Payment.user_id == user.id,
                Payment.status == "completed"
            ).scalar() or 0
            return avg_ticket >= target_value
            
        return False

    def _check_client_excellence_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check client excellence achievement criteria"""
        target_type = requirements.get("type")
        target_value = requirements.get("value")
        
        if target_type == "client_retention_rate":
            retention_rate = self._calculate_client_retention_rate(user.id)
            return retention_rate >= target_value
            
        elif target_type == "client_satisfaction_average":
            # Check from SixFBServiceExcellenceMetrics
            avg_satisfaction = self.db.query(func.avg(SixFBServiceExcellenceMetrics.client_satisfaction_score)).filter(
                SixFBServiceExcellenceMetrics.user_id == user.id,
                SixFBServiceExcellenceMetrics.service_date >= date.today() - timedelta(days=90)
            ).scalar() or 0
            return avg_satisfaction >= target_value
            
        elif target_type == "premium_clients_count":
            premium_clients = self.db.query(SixFBClientValueProfile).filter(
                SixFBClientValueProfile.user_id == user.id,
                SixFBClientValueProfile.value_tier.in_(["premium_vip", "core_regular"])
            ).count()
            return premium_clients >= target_value
            
        elif target_type == "total_clients_served":
            unique_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                Appointment.user_id == user.id,
                Appointment.status == "completed"
            ).scalar() or 0
            return unique_clients >= target_value
            
        return False

    def _check_efficiency_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check efficiency achievement criteria"""
        target_type = requirements.get("type")
        target_value = requirements.get("value")
        
        if target_type == "utilization_rate":
            # Get current utilization from recent metrics
            recent_utilization = self.db.query(SixFBEfficiencyMetrics.value).filter(
                SixFBEfficiencyMetrics.user_id == user.id,
                SixFBEfficiencyMetrics.metric_type == "booking_utilization",
                SixFBEfficiencyMetrics.date >= date.today() - timedelta(days=30)
            ).order_by(desc(SixFBEfficiencyMetrics.date)).first()
            
            if recent_utilization:
                return recent_utilization[0] >= target_value
                
        elif target_type == "no_show_rate":
            no_show_rate = self._calculate_no_show_rate(user.id)
            return no_show_rate <= target_value  # Lower is better
            
        elif target_type == "on_time_percentage":
            on_time_rate = self._calculate_on_time_percentage(user.id)
            return on_time_rate >= target_value
            
        elif target_type == "booking_streak":
            streak_days = requirements.get("days")
            return self._check_booking_streak(user.id, streak_days)
            
        return False

    def _check_growth_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check growth achievement criteria"""
        target_type = requirements.get("type")
        target_value = requirements.get("value")
        
        if target_type == "revenue_growth_rate":
            growth_rate = self._calculate_revenue_growth_rate(user.id)
            return growth_rate >= target_value
            
        elif target_type == "client_base_growth":
            growth_rate = self._calculate_client_base_growth(user.id)
            return growth_rate >= target_value
            
        elif target_type == "tier_advancement":
            # Check if user has advanced tier in specified timeframe
            timeframe_days = requirements.get("timeframe_days", 30)
            return self._check_recent_tier_advancement(user.id, timeframe_days)
            
        elif target_type == "skill_certifications":
            # This would need integration with skill tracking system
            return False  # Placeholder
            
        return False

    def _check_service_mastery_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check service mastery achievement criteria"""
        target_type = requirements.get("type")
        target_value = requirements.get("value")
        
        if target_type == "service_excellence_score":
            avg_score = self.db.query(func.avg(SixFBServiceExcellenceMetrics.score)).filter(
                SixFBServiceExcellenceMetrics.user_id == user.id,
                SixFBServiceExcellenceMetrics.service_date >= date.today() - timedelta(days=90)
            ).scalar() or 0
            return avg_score >= target_value
            
        elif target_type == "specialty_services_mastery":
            # Count different service types mastered
            service_types_count = self.db.query(func.count(func.distinct(Service.name))).filter(
                Service.id.in_(
                    self.db.query(Appointment.service_id).filter(
                        Appointment.user_id == user.id,
                        Appointment.status == "completed"
                    )
                )
            ).scalar() or 0
            return service_types_count >= target_value
            
        elif target_type == "perfect_service_streak":
            streak_count = requirements.get("streak_count")
            return self._check_perfect_service_streak(user.id, streak_count)
            
        return False

    def _check_brand_building_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check brand building achievement criteria"""
        # These would require integration with social media and marketing metrics
        # Placeholder implementation
        return False

    def _check_innovation_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check innovation achievement criteria"""
        target_type = requirements.get("type")
        
        if target_type == "feature_adoption":
            # Check if user has adopted new platform features
            # This would need feature usage tracking
            return False  # Placeholder
            
        elif target_type == "early_adopter":
            # Check if user was early adopter of new features
            return False  # Placeholder
            
        return False

    def _check_community_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check community achievement criteria"""
        # These would require community/social features
        return False

    def _check_consistency_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check consistency achievement criteria"""
        target_type = requirements.get("type")
        target_value = requirements.get("value")
        
        if target_type == "login_streak":
            streak_days = self._calculate_login_streak(user.id)
            return streak_days >= target_value
            
        elif target_type == "booking_consistency":
            consistency_score = self._calculate_booking_consistency(user.id)
            return consistency_score >= target_value
            
        elif target_type == "service_delivery_consistency":
            consistency_score = self._calculate_service_consistency(user.id)
            return consistency_score >= target_value
            
        return False

    def _check_premium_positioning_achievement(self, user: User, requirements: Dict, context: Dict) -> bool:
        """Check premium positioning achievement criteria"""
        target_type = requirements.get("type")
        target_value = requirements.get("value")
        
        if target_type == "premium_pricing_tier":
            # Check if user has reached premium tier
            # This would integrate with existing tier system
            return False  # Placeholder
            
        elif target_type == "premium_client_percentage":
            total_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                Appointment.user_id == user.id
            ).scalar() or 0
            
            if total_clients == 0:
                return False
                
            premium_clients = self.db.query(SixFBClientValueProfile).filter(
                SixFBClientValueProfile.user_id == user.id,
                SixFBClientValueProfile.value_tier == "premium_vip"
            ).count()
            
            premium_percentage = (premium_clients / total_clients) * 100
            return premium_percentage >= target_value
            
        return False

    def _unlock_achievement(self, user: User, achievement: AchievementDefinition, context: Dict) -> Optional[AchievementUnlock]:
        """
        Unlock an achievement for a user and handle all related processes.
        """
        try:
            # Create or update user achievement record
            user_achievement = self.db.query(UserAchievement).filter(
                UserAchievement.user_id == user.id,
                UserAchievement.achievement_id == achievement.id
            ).first()
            
            if not user_achievement:
                user_achievement = UserAchievement(
                    user_id=user.id,
                    achievement_id=achievement.id,
                    current_progress=100.0,
                    target_progress=100.0,
                    progress_percentage=100.0
                )
                self.db.add(user_achievement)
            
            user_achievement.is_unlocked = True
            user_achievement.unlocked_at = utcnow()
            user_achievement.unlock_context = context
            user_achievement.xp_awarded = achievement.xp_reward
            user_achievement.xp_claimed_at = utcnow()
            
            # Award XP
            xp_event = self.award_xp(
                user.id,
                XPSource.ACHIEVEMENT_UNLOCK,
                achievement.xp_reward,
                f"Achievement unlocked: {achievement.title}",
                related_achievement_id=achievement.id
            )
            
            # Update achievement statistics
            achievement.total_unlocks += 1
            
            # Create celebration data
            celebration_data = {
                "achievement_name": achievement.title,
                "achievement_description": achievement.description,
                "rarity": achievement.rarity.value,
                "category": achievement.category.value,
                "xp_earned": achievement.xp_reward,
                "icon": achievement.icon,
                "badge_design": achievement.badge_design,
                "color_scheme": achievement.color_scheme,
                "level_up_occurred": xp_event.level_up_occurred if xp_event else False
            }
            
            # Create notification
            self._create_achievement_notification(user.id, achievement, celebration_data)
            
            self.db.commit()
            
            return AchievementUnlock(
                achievement_id=achievement.id,
                achievement_name=achievement.title,
                xp_earned=achievement.xp_reward,
                rarity=achievement.rarity.value,
                category=achievement.category.value,
                unlock_context=context,
                celebration_data=celebration_data
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error unlocking achievement {achievement.id} for user {user.id}: {e}")
            return None

    # ============================================================================
    # EXPERIENCE POINTS (XP) MANAGEMENT
    # ============================================================================

    def award_xp(self, user_id: int, source: XPSource, base_amount: Optional[int] = None, 
                 description: str = "", **kwargs) -> Optional[XPEarnedEvent]:
        """
        Award experience points to a user with multipliers and level checking.
        """
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            # Get or create XP profile
            xp_profile = self.get_or_create_xp_profile(user_id)
            
            # Calculate base XP amount
            if base_amount is None:
                base_amount = self.XP_VALUES.get(source, 10)
            
            # Apply multipliers
            multiplier = self._calculate_xp_multiplier(user, source)
            final_amount = int(base_amount * multiplier)
            
            # Record level before XP award
            level_before = xp_profile.current_level
            
            # Award XP
            xp_profile.total_xp += final_amount
            xp_profile.xp_in_current_level += final_amount
            xp_profile.daily_xp_earned += final_amount
            xp_profile.weekly_xp_earned += final_amount
            xp_profile.monthly_xp_earned += final_amount
            xp_profile.last_xp_earned_at = utcnow()
            
            # Update XP breakdown by source
            self._update_xp_breakdown(xp_profile, source, final_amount)
            
            # Check for level up
            level_up_occurred = self._check_and_process_level_up(xp_profile)
            level_after = xp_profile.current_level
            
            # Create XP transaction record
            xp_transaction = XPTransaction(
                user_id=user_id,
                user_xp_profile_id=xp_profile.id,
                xp_amount=final_amount,
                xp_source=source,
                source_description=description,
                base_xp=base_amount,
                multiplier_applied=multiplier,
                bonus_reason=self._get_bonus_reason(user, multiplier),
                level_before=level_before,
                level_after=level_after,
                caused_level_up=level_up_occurred,
                **{k: v for k, v in kwargs.items() if k in ['related_achievement_id', 'related_appointment_id', 'related_metric_value']}
            )
            self.db.add(xp_transaction)
            
            # If level up occurred, create notification
            if level_up_occurred:
                self._create_level_up_notification(user_id, level_before, level_after)
            
            self.db.commit()
            
            return XPEarnedEvent(
                amount=final_amount,
                source=source.value,
                source_description=description,
                multiplier_applied=multiplier,
                bonus_reason=self._get_bonus_reason(user, multiplier),
                level_up_occurred=level_up_occurred,
                level_before=level_before,
                level_after=level_after
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error awarding XP to user {user_id}: {e}")
            return None

    def get_or_create_xp_profile(self, user_id: int) -> UserXPProfile:
        """Get or create XP profile for user"""
        xp_profile = self.db.query(UserXPProfile).filter(UserXPProfile.user_id == user_id).first()
        
        if not xp_profile:
            xp_profile = UserXPProfile(
                user_id=user_id,
                total_xp=0,
                current_level=1,
                xp_in_current_level=0,
                xp_needed_for_next_level=self.BASE_XP_PER_LEVEL
            )
            self.db.add(xp_profile)
            self.db.flush()  # Get the ID
            
        return xp_profile

    def _calculate_xp_multiplier(self, user: User, source: XPSource) -> float:
        """Calculate XP multiplier based on user tier, streaks, and other factors"""
        base_multiplier = 1.0
        
        # Tier-based multiplier (would need integration with tier system)
        # tier_multiplier = self.TIER_XP_MULTIPLIERS.get(user.current_tier, 1.0)
        tier_multiplier = 1.0  # Placeholder
        
        # Streak-based multiplier
        streak_multiplier = self._get_streak_multiplier(user.id)
        
        # Special event multipliers
        event_multiplier = self._get_event_multiplier()
        
        return base_multiplier * tier_multiplier * streak_multiplier * event_multiplier

    def _get_streak_multiplier(self, user_id: int) -> float:
        """Calculate streak-based XP multiplier"""
        # This would need streak tracking implementation
        return 1.0  # Placeholder

    def _get_event_multiplier(self) -> float:
        """Get any active event XP multipliers"""
        # Check for active XP boost events
        return 1.0  # Placeholder

    def _get_bonus_reason(self, user: User, multiplier: float) -> Optional[str]:
        """Get description of why bonus was applied"""
        if multiplier > 1.0:
            reasons = []
            # Add reasons based on multiplier sources
            return "; ".join(reasons) if reasons else None
        return None

    def _update_xp_breakdown(self, xp_profile: UserXPProfile, source: XPSource, amount: int):
        """Update XP breakdown by source"""
        if source == XPSource.APPOINTMENT_COMPLETION:
            xp_profile.xp_from_appointments += amount
        elif source == XPSource.ACHIEVEMENT_UNLOCK:
            xp_profile.xp_from_achievements += amount
        elif source in [XPSource.REVENUE_MILESTONE, XPSource.PROFESSIONAL_MILESTONE]:
            xp_profile.xp_from_milestones += amount
        elif source == XPSource.STREAK_MAINTENANCE:
            xp_profile.xp_from_streaks += amount
        elif source == XPSource.EFFICIENCY_IMPROVEMENT:
            xp_profile.xp_from_efficiency += amount
        elif source == XPSource.CLIENT_SATISFACTION:
            xp_profile.xp_from_client_satisfaction += amount

    def _check_and_process_level_up(self, xp_profile: UserXPProfile) -> bool:
        """Check if user leveled up and process the level increase"""
        level_up_occurred = False
        
        while xp_profile.xp_in_current_level >= xp_profile.xp_needed_for_next_level:
            # Level up!
            xp_profile.xp_in_current_level -= xp_profile.xp_needed_for_next_level
            xp_profile.current_level += 1
            xp_profile.total_levels_gained += 1
            
            if xp_profile.current_level > xp_profile.highest_level_achieved:
                xp_profile.highest_level_achieved = xp_profile.current_level
            
            # Calculate XP needed for next level (progressive scaling)
            xp_profile.xp_needed_for_next_level = int(
                self.BASE_XP_PER_LEVEL * (self.XP_MULTIPLIER_PER_LEVEL ** (xp_profile.current_level - 1))
            )
            
            level_up_occurred = True
        
        # Update progress percentage
        if xp_profile.xp_needed_for_next_level > 0:
            xp_profile.level_progress_percentage = (
                xp_profile.xp_in_current_level / xp_profile.xp_needed_for_next_level
            ) * 100
        
        return level_up_occurred

    # ============================================================================
    # NOTIFICATION SYSTEM
    # ============================================================================

    def _create_achievement_notification(self, user_id: int, achievement: AchievementDefinition, 
                                       celebration_data: Dict):
        """Create achievement unlock notification"""
        notification = GamificationNotification(
            user_id=user_id,
            notification_type=NotificationType.ACHIEVEMENT_UNLOCKED,
            title=f"🏆 Achievement Unlocked: {achievement.title}",
            message=f"Congratulations! You've unlocked the {achievement.title} achievement. {achievement.description}",
            related_achievement_id=achievement.id,
            celebration_data=celebration_data,
            display_duration_seconds=8,
            priority_level="high" if achievement.rarity in [AchievementRarity.EPIC, AchievementRarity.LEGENDARY] else "normal",
            show_in_app=True,
            send_push_notification=True if achievement.rarity in [AchievementRarity.RARE, AchievementRarity.EPIC, AchievementRarity.LEGENDARY] else False
        )
        self.db.add(notification)

    def _create_level_up_notification(self, user_id: int, old_level: int, new_level: int):
        """Create level up notification"""
        notification = GamificationNotification(
            user_id=user_id,
            notification_type=NotificationType.LEVEL_UP,
            title=f"🎉 Level Up! You're now Level {new_level}",
            message=f"Amazing progress! You've advanced from Level {old_level} to Level {new_level}. Keep up the great work!",
            celebration_data={
                "old_level": old_level,
                "new_level": new_level,
                "level_difference": new_level - old_level
            },
            display_duration_seconds=6,
            priority_level="high" if new_level % 10 == 0 else "normal",  # Special celebration for milestone levels
            show_in_app=True,
            send_push_notification=True if new_level % 5 == 0 else False  # Push notification every 5 levels
        )
        self.db.add(notification)

    # ============================================================================
    # LEADERBOARD MANAGEMENT
    # ============================================================================

    def update_leaderboards(self):
        """Update all active leaderboards"""
        active_leaderboards = self.db.query(Leaderboard).filter(Leaderboard.is_active == True).all()
        
        for leaderboard in active_leaderboards:
            self._update_single_leaderboard(leaderboard)

    def _update_single_leaderboard(self, leaderboard: Leaderboard):
        """Update a single leaderboard with current rankings"""
        try:
            # Get ranking data based on leaderboard type
            ranking_data = self._get_leaderboard_ranking_data(leaderboard)
            
            # Clear existing entries for this leaderboard
            self.db.query(LeaderboardEntry).filter(
                LeaderboardEntry.leaderboard_id == leaderboard.id
            ).delete()
            
            # Create new entries
            for position, (user_id, score, breakdown) in enumerate(ranking_data, 1):
                if position > leaderboard.max_displayed_positions:
                    break
                    
                entry = LeaderboardEntry(
                    leaderboard_id=leaderboard.id,
                    user_id=user_id,
                    current_position=position,
                    current_score=score,
                    score_breakdown=breakdown,
                    percentile_rank=((len(ranking_data) - position + 1) / len(ranking_data)) * 100
                )
                self.db.add(entry)
            
            leaderboard.last_updated = utcnow()
            leaderboard.next_update_at = utcnow() + timedelta(minutes=leaderboard.update_frequency_minutes)
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating leaderboard {leaderboard.id}: {e}")

    def _get_leaderboard_ranking_data(self, leaderboard: Leaderboard) -> List[Tuple[int, float, Dict]]:
        """Get ranking data for a specific leaderboard type"""
        if leaderboard.leaderboard_type == LeaderboardType.OVERALL_XP:
            return self._get_xp_rankings()
        elif leaderboard.leaderboard_type == LeaderboardType.MONTHLY_REVENUE:
            return self._get_monthly_revenue_rankings()
        elif leaderboard.leaderboard_type == LeaderboardType.CLIENT_SATISFACTION:
            return self._get_client_satisfaction_rankings()
        elif leaderboard.leaderboard_type == LeaderboardType.EFFICIENCY_SCORE:
            return self._get_efficiency_rankings()
        elif leaderboard.leaderboard_type == LeaderboardType.ACHIEVEMENT_COUNT:
            return self._get_achievement_count_rankings()
        else:
            return []

    def _get_xp_rankings(self) -> List[Tuple[int, float, Dict]]:
        """Get XP-based rankings"""
        results = self.db.query(
            UserXPProfile.user_id,
            UserXPProfile.total_xp,
            UserXPProfile.current_level
        ).order_by(desc(UserXPProfile.total_xp)).limit(1000).all()
        
        return [(user_id, float(total_xp), {"level": level, "total_xp": int(total_xp)}) 
                for user_id, total_xp, level in results]

    def _get_monthly_revenue_rankings(self) -> List[Tuple[int, float, Dict]]:
        """Get monthly revenue rankings"""
        current_month = date.today().replace(day=1)
        
        results = self.db.query(
            Payment.user_id,
            func.sum(Payment.amount).label('monthly_revenue')
        ).filter(
            Payment.created_at >= current_month,
            Payment.status == "completed"
        ).group_by(Payment.user_id).order_by(desc('monthly_revenue')).limit(1000).all()
        
        return [(user_id, float(revenue), {"monthly_revenue": float(revenue)}) 
                for user_id, revenue in results]

    def _get_client_satisfaction_rankings(self) -> List[Tuple[int, float, Dict]]:
        """Get client satisfaction rankings"""
        results = self.db.query(
            SixFBServiceExcellenceMetrics.user_id,
            func.avg(SixFBServiceExcellenceMetrics.client_satisfaction_score).label('avg_satisfaction')
        ).filter(
            SixFBServiceExcellenceMetrics.service_date >= date.today() - timedelta(days=90)
        ).group_by(SixFBServiceExcellenceMetrics.user_id).order_by(desc('avg_satisfaction')).limit(1000).all()
        
        return [(user_id, float(avg_satisfaction), {"avg_satisfaction": float(avg_satisfaction)}) 
                for user_id, avg_satisfaction in results if avg_satisfaction is not None]

    def _get_efficiency_rankings(self) -> List[Tuple[int, float, Dict]]:
        """Get efficiency score rankings"""
        # This would need more sophisticated efficiency calculation
        return []

    def _get_achievement_count_rankings(self) -> List[Tuple[int, float, Dict]]:
        """Get achievement count rankings"""
        results = self.db.query(
            UserAchievement.user_id,
            func.count(UserAchievement.id).label('achievement_count')
        ).filter(
            UserAchievement.is_unlocked == True
        ).group_by(UserAchievement.user_id).order_by(desc('achievement_count')).limit(1000).all()
        
        return [(user_id, float(count), {"achievement_count": int(count)}) 
                for user_id, count in results]

    # ============================================================================
    # HELPER METHODS
    # ============================================================================

    def _calculate_client_retention_rate(self, user_id: int) -> float:
        """Calculate client retention rate over the last 6 months"""
        six_months_ago = date.today() - timedelta(days=180)
        three_months_ago = date.today() - timedelta(days=90)
        
        # Clients from 3-6 months ago
        early_clients = set(self.db.query(Appointment.client_id).filter(
            Appointment.user_id == user_id,
            Appointment.appointment_time >= six_months_ago,
            Appointment.appointment_time < three_months_ago,
            Appointment.status == "completed"
        ).distinct().scalars())
        
        if not early_clients:
            return 0.0
        
        # Clients who returned in the last 3 months
        recent_clients = set(self.db.query(Appointment.client_id).filter(
            Appointment.user_id == user_id,
            Appointment.appointment_time >= three_months_ago,
            Appointment.status == "completed",
            Appointment.client_id.in_(early_clients)
        ).distinct().scalars())
        
        return (len(recent_clients) / len(early_clients)) * 100

    def _calculate_no_show_rate(self, user_id: int) -> float:
        """Calculate no-show rate over the last 30 days"""
        thirty_days_ago = date.today() - timedelta(days=30)
        
        total_appointments = self.db.query(Appointment).filter(
            Appointment.user_id == user_id,
            Appointment.appointment_time >= thirty_days_ago,
            Appointment.status.in_(["completed", "no_show"])
        ).count()
        
        if total_appointments == 0:
            return 0.0
        
        no_show_appointments = self.db.query(Appointment).filter(
            Appointment.user_id == user_id,
            Appointment.appointment_time >= thirty_days_ago,
            Appointment.status == "no_show"
        ).count()
        
        return (no_show_appointments / total_appointments) * 100

    def _calculate_on_time_percentage(self, user_id: int) -> float:
        """Calculate on-time percentage based on appointment start times"""
        # This would need actual timing data from appointments
        return 85.0  # Placeholder

    def _check_booking_streak(self, user_id: int, required_days: int) -> bool:
        """Check if user has maintained booking streak for required days"""
        # This would need more sophisticated streak tracking
        return False  # Placeholder

    def _calculate_revenue_growth_rate(self, user_id: int) -> float:
        """Calculate revenue growth rate comparing last month to previous month"""
        current_month = date.today().replace(day=1)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        two_months_ago = (last_month - timedelta(days=1)).replace(day=1)
        
        current_revenue = self.db.query(func.sum(Payment.amount)).filter(
            Payment.user_id == user_id,
            Payment.created_at >= current_month,
            Payment.status == "completed"
        ).scalar() or 0
        
        last_month_revenue = self.db.query(func.sum(Payment.amount)).filter(
            Payment.user_id == user_id,
            Payment.created_at >= last_month,
            Payment.created_at < current_month,
            Payment.status == "completed"
        ).scalar() or 0
        
        if last_month_revenue == 0:
            return 0.0
        
        return ((current_revenue - last_month_revenue) / last_month_revenue) * 100

    def _calculate_client_base_growth(self, user_id: int) -> float:
        """Calculate client base growth rate"""
        current_month = date.today().replace(day=1)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        
        current_unique_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
            Appointment.user_id == user_id,
            Appointment.appointment_time >= current_month,
            Appointment.status == "completed"
        ).scalar() or 0
        
        last_month_unique_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
            Appointment.user_id == user_id,
            Appointment.appointment_time >= last_month,
            Appointment.appointment_time < current_month,
            Appointment.status == "completed"
        ).scalar() or 0
        
        if last_month_unique_clients == 0:
            return 0.0
        
        return ((current_unique_clients - last_month_unique_clients) / last_month_unique_clients) * 100

    def _check_recent_tier_advancement(self, user_id: int, timeframe_days: int) -> bool:
        """Check if user has advanced tier recently"""
        # This would need integration with the tier advancement tracking
        return False  # Placeholder

    def _check_perfect_service_streak(self, user_id: int, required_streak: int) -> bool:
        """Check if user has perfect service rating streak"""
        # This would need service rating tracking
        return False  # Placeholder

    def _check_revenue_streak(self, user_id: int, threshold: float, months_required: int) -> bool:
        """Check if user has maintained revenue above threshold for consecutive months"""
        current_month = date.today().replace(day=1)
        
        for i in range(months_required):
            month_start = current_month - timedelta(days=32*i)
            month_start = month_start.replace(day=1)
            next_month = (month_start + timedelta(days=32)).replace(day=1)
            
            month_revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.created_at >= month_start,
                Payment.created_at < next_month,
                Payment.status == "completed"
            ).scalar() or 0
            
            if month_revenue < threshold:
                return False
        
        return True

    def _calculate_login_streak(self, user_id: int) -> int:
        """Calculate current login streak"""
        # This would need login tracking implementation
        return 0  # Placeholder

    def _calculate_booking_consistency(self, user_id: int) -> float:
        """Calculate booking consistency score"""
        # This would need more sophisticated consistency calculation
        return 0.0  # Placeholder

    def _calculate_service_consistency(self, user_id: int) -> float:
        """Calculate service delivery consistency score"""
        # This would need service quality tracking
        return 0.0  # Placeholder


# ============================================================================
# TRIGGER FUNCTIONS FOR AUTOMATIC ACHIEVEMENT CHECKING
# ============================================================================

def trigger_appointment_completion_achievements(db: Session, user_id: int, appointment_id: int):
    """Trigger achievement checks when an appointment is completed"""
    service = GamificationService(db)
    
    context = {
        "trigger": "appointment_completion",
        "appointment_id": appointment_id,
        "timestamp": utcnow().isoformat()
    }
    
    # Award XP for appointment completion
    service.award_xp(
        user_id,
        XPSource.APPOINTMENT_COMPLETION,
        description="Appointment completed successfully",
        related_appointment_id=appointment_id
    )
    
    # Check achievements
    service.check_and_award_achievements(user_id, context)


def trigger_revenue_milestone_achievements(db: Session, user_id: int, revenue_amount: float, period: str):
    """Trigger achievement checks when revenue milestones are reached"""
    service = GamificationService(db)
    
    context = {
        "trigger": "revenue_milestone",
        "revenue_amount": revenue_amount,
        "period": period,
        "timestamp": utcnow().isoformat()
    }
    
    # Award XP for revenue milestone
    xp_amount = min(int(revenue_amount / 100), 500)  # 1 XP per $100, max 500 XP
    service.award_xp(
        user_id,
        XPSource.REVENUE_MILESTONE,
        xp_amount,
        f"Revenue milestone: ${revenue_amount} in {period}",
        related_metric_value=revenue_amount
    )
    
    # Check achievements
    service.check_and_award_achievements(user_id, context)


def trigger_client_satisfaction_achievements(db: Session, user_id: int, satisfaction_score: float):
    """Trigger achievement checks for client satisfaction"""
    service = GamificationService(db)
    
    context = {
        "trigger": "client_satisfaction",
        "satisfaction_score": satisfaction_score,
        "timestamp": utcnow().isoformat()
    }
    
    # Award XP based on satisfaction score
    xp_amount = int(satisfaction_score * 3)  # Higher satisfaction = more XP
    service.award_xp(
        user_id,
        XPSource.CLIENT_SATISFACTION,
        xp_amount,
        f"Client satisfaction score: {satisfaction_score}/100",
        related_metric_value=satisfaction_score
    )
    
    # Check achievements
    service.check_and_award_achievements(user_id, context)


def trigger_tier_advancement_achievements(db: Session, user_id: int, old_tier: str, new_tier: str):
    """Trigger achievement checks when user advances tier"""
    service = GamificationService(db)
    
    context = {
        "trigger": "tier_advancement",
        "old_tier": old_tier,
        "new_tier": new_tier,
        "timestamp": utcnow().isoformat()
    }
    
    # Award XP for tier advancement
    service.award_xp(
        user_id,
        XPSource.TIER_ADVANCEMENT,
        description=f"Tier advancement: {old_tier} → {new_tier}"
    )
    
    # Check achievements
    service.check_and_award_achievements(user_id, context)