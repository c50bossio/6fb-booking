"""
Gamification Achievement System for BookedBarber V2

This module implements a comprehensive gamification system aligned with the 
Six Figure Barber methodology, providing achievement tracking, experience points,
and progression systems that motivate barbers to improve their business metrics.

Key Features:
- Six Figure Barber methodology aligned achievement categories
- Experience points (XP) system with level progression
- Achievement rarity and reward systems
- Progress tracking and milestone celebrations
- Leaderboards and competitive elements
- Integration with existing pricing tier system
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Enum as SQLEnum, Date, Index, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta, date, timezone
import enum
from decimal import Decimal
from typing import Dict, Any, Optional

from db import Base


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ============================================================================
# GAMIFICATION ENUMS
# ============================================================================

class AchievementCategory(enum.Enum):
    """Achievement categories aligned with Six Figure Barber methodology"""
    REVENUE_MASTERY = "revenue_mastery"              # Revenue optimization achievements
    CLIENT_EXCELLENCE = "client_excellence"          # Client value and satisfaction
    EFFICIENCY_EXPERT = "efficiency_expert"          # Business efficiency achievements
    GROWTH_CHAMPION = "growth_champion"              # Professional growth milestones
    SERVICE_MASTERY = "service_mastery"              # Service delivery excellence
    BRAND_BUILDER = "brand_builder"                  # Brand and marketing achievements
    INNOVATION_LEADER = "innovation_leader"          # Adoption of new features/strategies
    COMMUNITY_LEADER = "community_leader"            # Community engagement and mentoring
    CONSISTENCY_KING = "consistency_king"            # Consistent performance achievements
    PREMIUM_POSITIONING = "premium_positioning"      # Premium service and pricing mastery


class AchievementRarity(enum.Enum):
    """Achievement rarity levels affecting rewards and prestige"""
    COMMON = "common"          # Frequently earned, basic milestones
    UNCOMMON = "uncommon"      # Moderate difficulty, good progress
    RARE = "rare"              # Challenging achievements, significant effort
    EPIC = "epic"              # Very difficult, major accomplishments
    LEGENDARY = "legendary"    # Extremely rare, exceptional achievements


class AchievementType(enum.Enum):
    """Types of achievement tracking"""
    MILESTONE = "milestone"        # One-time achievement (e.g., first $10k month)
    PROGRESSIVE = "progressive"    # Incremental progress (e.g., 100, 500, 1000 clients)
    STREAK = "streak"             # Consecutive performance (e.g., 30-day streak)
    COMPETITIVE = "competitive"   # Ranking-based (e.g., top 10% in region)
    SEASONAL = "seasonal"         # Time-limited achievements
    SPECIAL = "special"           # Special events or promotions


class XPSource(enum.Enum):
    """Sources of experience points"""
    APPOINTMENT_COMPLETION = "appointment_completion"
    REVENUE_MILESTONE = "revenue_milestone"
    CLIENT_SATISFACTION = "client_satisfaction"
    TIER_ADVANCEMENT = "tier_advancement"
    ACHIEVEMENT_UNLOCK = "achievement_unlock"
    STREAK_MAINTENANCE = "streak_maintenance"
    EFFICIENCY_IMPROVEMENT = "efficiency_improvement"
    SKILL_DEVELOPMENT = "skill_development"
    CLIENT_RETENTION = "client_retention"
    UPSELL_SUCCESS = "upsell_success"
    REFERRAL_GENERATION = "referral_generation"
    PROFESSIONAL_MILESTONE = "professional_milestone"


class NotificationType(enum.Enum):
    """Types of achievement notifications"""
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    LEVEL_UP = "level_up"
    MILESTONE_REACHED = "milestone_reached"
    STREAK_BONUS = "streak_bonus"
    LEADERBOARD_POSITION = "leaderboard_position"
    CHALLENGE_COMPLETE = "challenge_complete"
    TIER_PROMOTION = "tier_promotion"
    BADGE_EARNED = "badge_earned"


class ChallengeType(enum.Enum):
    """Types of gamification challenges"""
    DAILY = "daily"               # 24-hour challenges
    WEEKLY = "weekly"             # 7-day challenges
    MONTHLY = "monthly"           # 30-day challenges
    SEASONAL = "seasonal"         # Quarterly or special event challenges
    MILESTONE = "milestone"       # Long-term goal challenges
    COMMUNITY = "community"       # Team/community challenges


class LeaderboardType(enum.Enum):
    """Types of leaderboards"""
    OVERALL_XP = "overall_xp"
    MONTHLY_REVENUE = "monthly_revenue"
    CLIENT_SATISFACTION = "client_satisfaction"
    EFFICIENCY_SCORE = "efficiency_score"
    ACHIEVEMENT_COUNT = "achievement_count"
    STREAK_CHAMPION = "streak_champion"
    GROWTH_RATE = "growth_rate"
    TIER_ADVANCEMENT = "tier_advancement"


# ============================================================================
# ACHIEVEMENT DEFINITION MODELS
# ============================================================================

class AchievementDefinition(Base):
    """
    Defines all possible achievements in the system.
    These are the templates that users can unlock.
    """
    __tablename__ = "achievement_definitions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    name = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)  # Display title
    description = Column(Text, nullable=False)
    category = Column(SQLEnum(AchievementCategory), nullable=False, index=True)
    rarity = Column(SQLEnum(AchievementRarity), nullable=False, index=True)
    achievement_type = Column(SQLEnum(AchievementType), nullable=False)
    
    # Visual elements
    icon = Column(String, nullable=True)  # Icon identifier or emoji
    badge_design = Column(JSON, nullable=True)  # Badge visual configuration
    color_scheme = Column(JSON, nullable=True)  # Colors for UI elements
    
    # Requirements and criteria
    requirements = Column(JSON, nullable=False)  # Detailed unlock criteria
    target_value = Column(Float, nullable=True)  # Numeric target if applicable
    measurement_criteria = Column(JSON, nullable=True)  # How progress is measured
    
    # Six Figure Barber methodology alignment
    sfb_principle = Column(String, nullable=True)  # Related SFB principle
    business_impact = Column(Text, nullable=True)  # How this helps business growth
    coaching_insight = Column(Text, nullable=True)  # Coaching value of achievement
    
    # Rewards and recognition
    xp_reward = Column(Integer, default=0)  # XP points awarded
    tier_boost_value = Column(Float, default=0)  # Boost to tier score if applicable
    special_rewards = Column(JSON, nullable=True)  # Additional rewards (badges, titles, etc.)
    
    # Progression and dependencies
    prerequisite_achievements = Column(JSON, nullable=True)  # Required previous achievements
    next_level_achievement_id = Column(Integer, ForeignKey("achievement_definitions.id"), nullable=True)
    progression_series = Column(String, nullable=True)  # Series name for progressive achievements
    
    # System configuration
    is_active = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)  # Should it appear in achievement lists
    release_date = Column(Date, nullable=True)  # When achievement becomes available
    expiry_date = Column(Date, nullable=True)  # For seasonal/limited achievements
    
    # Analytics and tracking
    total_unlocks = Column(Integer, default=0)  # How many users have unlocked this
    completion_rate = Column(Float, default=0)  # Percentage of eligible users who completed
    average_time_to_complete_days = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    next_level_achievement = relationship("AchievementDefinition", remote_side=[id])
    user_achievements = relationship("UserAchievement", back_populates="achievement")
    
    # Indexes
    __table_args__ = (
        Index("idx_achievement_category_rarity", "category", "rarity"),
        Index("idx_achievement_active_visible", "is_active", "is_visible"),
    )


class UserAchievement(Base):
    """
    Tracks individual user achievement progress and unlocks.
    """
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievement_definitions.id"), nullable=False, index=True)
    
    # Progress tracking
    current_progress = Column(Float, default=0)  # Current progress toward achievement
    target_progress = Column(Float, nullable=True)  # Target value needed
    progress_percentage = Column(Float, default=0)  # 0-100% completion
    
    # Status and completion
    is_unlocked = Column(Boolean, default=False, index=True)
    unlocked_at = Column(DateTime, nullable=True)
    is_notified = Column(Boolean, default=False)  # Has user been notified of unlock
    
    # Context and attribution
    unlock_context = Column(JSON, nullable=True)  # What triggered the unlock
    progress_history = Column(JSON, nullable=True)  # Historical progress snapshots
    milestone_snapshots = Column(JSON, nullable=True)  # Key milestone moments
    
    # Recognition and sharing
    is_featured = Column(Boolean, default=False)  # Featured achievement for user
    is_shared = Column(Boolean, default=False)  # User shared this achievement
    sharing_platforms = Column(JSON, nullable=True)  # Where it was shared
    
    # XP and rewards claimed
    xp_awarded = Column(Integer, default=0)
    xp_claimed_at = Column(DateTime, nullable=True)
    rewards_claimed = Column(JSON, nullable=True)  # Which rewards were claimed
    
    # Metadata
    first_progress_at = Column(DateTime, nullable=True)  # When progress started
    last_progress_at = Column(DateTime, nullable=True)  # Most recent progress update
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("AchievementDefinition", back_populates="user_achievements")
    
    # Indexes
    __table_args__ = (
        Index("idx_user_achievement_user_unlocked", "user_id", "is_unlocked"),
        Index("idx_user_achievement_unlocked_at", "unlocked_at"),
    )


# ============================================================================
# EXPERIENCE POINTS AND LEVELING SYSTEM
# ============================================================================

class UserXPProfile(Base):
    """
    Tracks user experience points, levels, and progression.
    """
    __tablename__ = "user_xp_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # XP and level tracking
    total_xp = Column(Integer, default=0, index=True)
    current_level = Column(Integer, default=1, index=True)
    xp_in_current_level = Column(Integer, default=0)
    xp_needed_for_next_level = Column(Integer, default=100)
    
    # Level progression
    level_progress_percentage = Column(Float, default=0)
    total_levels_gained = Column(Integer, default=0)
    highest_level_achieved = Column(Integer, default=1)
    
    # XP breakdown by source
    xp_from_appointments = Column(Integer, default=0)
    xp_from_achievements = Column(Integer, default=0)
    xp_from_milestones = Column(Integer, default=0)
    xp_from_streaks = Column(Integer, default=0)
    xp_from_efficiency = Column(Integer, default=0)
    xp_from_client_satisfaction = Column(Integer, default=0)
    
    # Multipliers and bonuses
    current_xp_multiplier = Column(Float, default=1.0)  # Active XP multiplier
    streak_bonus_multiplier = Column(Float, default=1.0)  # Bonus from streaks
    tier_bonus_multiplier = Column(Float, default=1.0)  # Bonus from tier level
    premium_bonus_multiplier = Column(Float, default=1.0)  # Premium subscription bonus
    
    # Recent activity
    daily_xp_earned = Column(Integer, default=0)
    weekly_xp_earned = Column(Integer, default=0)
    monthly_xp_earned = Column(Integer, default=0)
    last_xp_earned_at = Column(DateTime, nullable=True)
    
    # Milestones and recognition
    xp_milestones_reached = Column(JSON, nullable=True)  # XP milestone achievements
    level_rewards_claimed = Column(JSON, nullable=True)  # Rewards claimed per level
    next_major_milestone = Column(Integer, nullable=True)  # Next significant XP milestone
    
    # Leaderboard positioning
    global_rank = Column(Integer, nullable=True)
    regional_rank = Column(Integer, nullable=True)
    tier_rank = Column(Integer, nullable=True)
    last_rank_update = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="xp_profile")
    xp_transactions = relationship("XPTransaction", back_populates="user_profile")
    
    # Indexes
    __table_args__ = (
        Index("idx_xp_total_level", "total_xp", "current_level"),
        Index("idx_xp_daily_weekly", "daily_xp_earned", "weekly_xp_earned"),
    )


class XPTransaction(Base):
    """
    Records all XP earning transactions for audit and analytics.
    """
    __tablename__ = "xp_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_xp_profile_id = Column(Integer, ForeignKey("user_xp_profiles.id"), nullable=False)
    
    # Transaction details
    xp_amount = Column(Integer, nullable=False)
    xp_source = Column(SQLEnum(XPSource), nullable=False, index=True)
    source_description = Column(String, nullable=True)
    
    # Context and attribution
    related_achievement_id = Column(Integer, ForeignKey("achievement_definitions.id"), nullable=True)
    related_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    related_metric_value = Column(Float, nullable=True)  # Associated metric that triggered XP
    
    # Multipliers applied
    base_xp = Column(Integer, nullable=False)  # XP before multipliers
    multiplier_applied = Column(Float, default=1.0)
    bonus_reason = Column(String, nullable=True)  # Why bonus was applied
    
    # Level impact
    level_before = Column(Integer, nullable=True)
    level_after = Column(Integer, nullable=True)
    caused_level_up = Column(Boolean, default=False)
    
    # Metadata
    transaction_date = Column(DateTime, default=utcnow, index=True)
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    user = relationship("User")
    user_profile = relationship("UserXPProfile", back_populates="xp_transactions")
    achievement = relationship("AchievementDefinition")
    appointment = relationship("Appointment")
    
    # Indexes
    __table_args__ = (
        Index("idx_xp_transaction_user_date", "user_id", "transaction_date"),
        Index("idx_xp_transaction_source", "xp_source", "transaction_date"),
    )


# ============================================================================
# CHALLENGES AND COMPETITIONS
# ============================================================================

class GamificationChallenge(Base):
    """
    Defines time-limited challenges and competitions.
    """
    __tablename__ = "gamification_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Challenge definition
    name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    challenge_type = Column(SQLEnum(ChallengeType), nullable=False, index=True)
    category = Column(SQLEnum(AchievementCategory), nullable=False)
    
    # Timeline
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False, index=True)
    registration_deadline = Column(DateTime, nullable=True)
    
    # Challenge criteria
    objective = Column(JSON, nullable=False)  # What needs to be accomplished
    target_value = Column(Float, nullable=True)
    measurement_criteria = Column(JSON, nullable=False)
    difficulty_level = Column(String, default="medium")  # easy, medium, hard, expert
    
    # Participation
    max_participants = Column(Integer, nullable=True)
    current_participants = Column(Integer, default=0)
    is_team_challenge = Column(Boolean, default=False)
    team_size_limit = Column(Integer, nullable=True)
    
    # Rewards and recognition
    completion_rewards = Column(JSON, nullable=True)  # Rewards for completion
    ranking_rewards = Column(JSON, nullable=True)  # Rewards based on ranking
    participation_rewards = Column(JSON, nullable=True)  # Rewards just for participating
    
    # Six Figure Barber alignment
    sfb_principle = Column(String, nullable=True)
    business_development_focus = Column(String, nullable=True)
    coaching_value = Column(Text, nullable=True)
    
    # Challenge status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    registration_required = Column(Boolean, default=False)
    
    # Analytics
    total_completions = Column(Integer, default=0)
    completion_rate = Column(Float, default=0)
    average_completion_time_hours = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    participants = relationship("ChallengeParticipation", back_populates="challenge")
    
    # Indexes
    __table_args__ = (
        Index("idx_challenge_dates", "start_date", "end_date"),
        Index("idx_challenge_type_active", "challenge_type", "is_active"),
    )


class ChallengeParticipation(Base):
    """
    Tracks user participation in challenges.
    """
    __tablename__ = "challenge_participations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("gamification_challenges.id"), nullable=False, index=True)
    
    # Participation details
    registered_at = Column(DateTime, default=utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Progress tracking
    current_progress = Column(Float, default=0)
    target_progress = Column(Float, nullable=True)
    progress_percentage = Column(Float, default=0)
    progress_history = Column(JSON, nullable=True)
    
    # Results and ranking
    final_score = Column(Float, nullable=True)
    ranking_position = Column(Integer, nullable=True)
    is_completed = Column(Boolean, default=False)
    completion_verified = Column(Boolean, default=False)
    
    # Rewards and recognition
    rewards_earned = Column(JSON, nullable=True)
    xp_earned = Column(Integer, default=0)
    achievements_unlocked = Column(JSON, nullable=True)
    
    # Team information (if applicable)
    team_id = Column(String, nullable=True)
    team_name = Column(String, nullable=True)
    team_role = Column(String, nullable=True)
    
    # Metadata
    last_progress_update = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    challenge = relationship("GamificationChallenge", back_populates="participants")
    
    # Indexes
    __table_args__ = (
        Index("idx_participation_user_challenge", "user_id", "challenge_id"),
        Index("idx_participation_completed", "is_completed", "completed_at"),
    )


# ============================================================================
# LEADERBOARDS AND RANKINGS
# ============================================================================

class Leaderboard(Base):
    """
    Manages different types of leaderboards and rankings.
    """
    __tablename__ = "leaderboards"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Leaderboard definition
    name = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    leaderboard_type = Column(SQLEnum(LeaderboardType), nullable=False, index=True)
    
    # Scope and filtering
    scope = Column(String, default="global")  # global, regional, local, tier-based
    filter_criteria = Column(JSON, nullable=True)  # Additional filtering rules
    minimum_activity_threshold = Column(JSON, nullable=True)  # Min requirements to appear
    
    # Ranking configuration
    ranking_metric = Column(String, nullable=False)  # What metric to rank by
    ranking_direction = Column(String, default="desc")  # desc (highest first) or asc
    ranking_period = Column(String, default="all_time")  # all_time, monthly, weekly, daily
    max_displayed_positions = Column(Integer, default=100)
    
    # Update frequency
    update_frequency_minutes = Column(Integer, default=60)  # How often to recalculate
    last_updated = Column(DateTime, nullable=True)
    next_update_at = Column(DateTime, nullable=True)
    
    # Visibility and access
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)
    access_level = Column(String, default="all")  # all, premium, tier-specific
    
    # Six Figure Barber integration
    sfb_principle = Column(String, nullable=True)
    coaching_insight = Column(Text, nullable=True)
    motivation_message = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    entries = relationship("LeaderboardEntry", back_populates="leaderboard")
    
    # Indexes
    __table_args__ = (
        Index("idx_leaderboard_type_active", "leaderboard_type", "is_active"),
        Index("idx_leaderboard_update", "next_update_at"),
    )


class LeaderboardEntry(Base):
    """
    Individual entries in leaderboards.
    """
    __tablename__ = "leaderboard_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    leaderboard_id = Column(Integer, ForeignKey("leaderboards.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Ranking information
    current_position = Column(Integer, nullable=False, index=True)
    previous_position = Column(Integer, nullable=True)
    position_change = Column(Integer, default=0)  # +/- change from last update
    highest_position_ever = Column(Integer, nullable=True)
    
    # Score and metrics
    current_score = Column(Float, nullable=False)
    previous_score = Column(Float, nullable=True)
    score_change = Column(Float, default=0)
    percentile_rank = Column(Float, nullable=True)  # 0-100 percentile
    
    # Achievement and milestones
    position_milestones = Column(JSON, nullable=True)  # Position achievements
    score_milestones = Column(JSON, nullable=True)  # Score achievements
    time_in_top_10 = Column(Integer, default=0)  # Days in top 10
    time_in_top_100 = Column(Integer, default=0)  # Days in top 100
    
    # Context and breakdown
    score_breakdown = Column(JSON, nullable=True)  # How score was calculated
    contributing_factors = Column(JSON, nullable=True)
    performance_trends = Column(JSON, nullable=True)
    
    # Recognition and rewards
    position_rewards_earned = Column(JSON, nullable=True)
    milestone_rewards_earned = Column(JSON, nullable=True)
    recognition_badges = Column(JSON, nullable=True)
    
    # Metadata
    entry_date = Column(DateTime, default=utcnow)
    last_score_update = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    leaderboard = relationship("Leaderboard", back_populates="entries")
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_leaderboard_entry_position", "leaderboard_id", "current_position"),
        Index("idx_leaderboard_entry_user", "user_id", "current_position"),
        Index("idx_leaderboard_entry_score", "current_score"),
    )


# ============================================================================
# NOTIFICATIONS AND CELEBRATIONS
# ============================================================================

class GamificationNotification(Base):
    """
    Manages gamification-related notifications and celebrations.
    """
    __tablename__ = "gamification_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Notification details
    notification_type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    # Related entities
    related_achievement_id = Column(Integer, ForeignKey("achievement_definitions.id"), nullable=True)
    related_challenge_id = Column(Integer, ForeignKey("gamification_challenges.id"), nullable=True)
    related_xp_transaction_id = Column(Integer, ForeignKey("xp_transactions.id"), nullable=True)
    
    # Celebration configuration
    celebration_data = Column(JSON, nullable=True)  # Animation/visual configuration
    display_duration_seconds = Column(Integer, default=5)
    priority_level = Column(String, default="normal")  # low, normal, high, urgent
    
    # Delivery status
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    is_dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime, nullable=True)
    
    # Delivery channels
    show_in_app = Column(Boolean, default=True)
    send_push_notification = Column(Boolean, default=False)
    send_email = Column(Boolean, default=False)
    
    # Engagement tracking
    click_count = Column(Integer, default=0)
    first_click_at = Column(DateTime, nullable=True)
    last_click_at = Column(DateTime, nullable=True)
    
    # Metadata
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    achievement = relationship("AchievementDefinition")
    challenge = relationship("GamificationChallenge")
    xp_transaction = relationship("XPTransaction")
    
    # Indexes
    __table_args__ = (
        Index("idx_notification_user_type", "user_id", "notification_type"),
        Index("idx_notification_sent_read", "is_sent", "is_read"),
        Index("idx_notification_expires", "expires_at"),
    )


# ============================================================================
# GAMIFICATION ANALYTICS
# ============================================================================

class GamificationAnalytics(Base):
    """
    Analytics and insights for the gamification system.
    """
    __tablename__ = "gamification_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Null for system-wide analytics
    
    # Analytics period
    analytics_date = Column(Date, nullable=False, index=True)
    period_type = Column(String, default="daily")  # daily, weekly, monthly, quarterly
    
    # Engagement metrics
    achievements_unlocked_count = Column(Integer, default=0)
    total_xp_earned = Column(Integer, default=0)
    challenges_participated = Column(Integer, default=0)
    challenges_completed = Column(Integer, default=0)
    
    # Progress metrics
    level_progression = Column(Float, default=0)  # Levels gained in period
    tier_advancement_progress = Column(Float, default=0)
    milestone_achievements = Column(Integer, default=0)
    
    # Behavioral insights
    session_engagement_score = Column(Float, default=0)  # 0-100 engagement
    feature_adoption_rate = Column(Float, default=0)
    competitive_participation = Column(Float, default=0)
    social_sharing_activity = Column(Integer, default=0)
    
    # Business impact correlation
    revenue_correlation = Column(Float, nullable=True)  # Correlation with revenue
    efficiency_correlation = Column(Float, nullable=True)
    client_satisfaction_correlation = Column(Float, nullable=True)
    retention_impact = Column(Float, nullable=True)
    
    # Six Figure Barber methodology alignment
    methodology_engagement_score = Column(Float, default=0)
    principle_focus_distribution = Column(JSON, nullable=True)
    coaching_goal_alignment = Column(Float, default=0)
    
    # Detailed breakdown
    achievement_category_breakdown = Column(JSON, nullable=True)
    xp_source_breakdown = Column(JSON, nullable=True)
    time_of_day_activity = Column(JSON, nullable=True)
    device_usage_patterns = Column(JSON, nullable=True)
    
    # Predictions and insights
    predicted_next_achievements = Column(JSON, nullable=True)
    engagement_trend_prediction = Column(Float, nullable=True)
    churn_risk_indicators = Column(JSON, nullable=True)
    optimization_opportunities = Column(JSON, nullable=True)
    
    # Metadata
    calculated_at = Column(DateTime, default=utcnow)
    data_freshness_score = Column(Float, default=100)
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_analytics_user_date", "user_id", "analytics_date"),
        Index("idx_analytics_period_date", "period_type", "analytics_date"),
    )