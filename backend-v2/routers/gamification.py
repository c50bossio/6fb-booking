"""
Gamification API Endpoints for BookedBarber V2

This module provides comprehensive API endpoints for the gamification system:
- Achievement tracking and progress
- Experience points (XP) and level management
- Leaderboards and rankings
- Challenges and competitions
- Notifications and celebrations
- Analytics and insights

All endpoints are aligned with the Six Figure Barber methodology and provide
data to support the engaging gamification frontend experience.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
import logging
from pydantic import BaseModel, Field

from db import get_db
from utils.auth import get_current_user
from models import (
    User, AchievementDefinition, UserAchievement, UserXPProfile, XPTransaction,
    GamificationChallenge, ChallengeParticipation, Leaderboard, LeaderboardEntry,
    GamificationNotification, GamificationAnalytics,
    AchievementCategory, AchievementRarity, AchievementType, XPSource,
    NotificationType, ChallengeType, LeaderboardType
)
from services.gamification_service import GamificationService
from services.achievement_definitions import ACHIEVEMENT_DEFINITIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/gamification", tags=["gamification"])

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class AchievementProgressResponse(BaseModel):
    achievement_id: int
    name: str
    title: str
    description: str
    category: str
    rarity: str
    current_progress: float
    target_progress: float
    progress_percentage: float
    is_unlocked: bool
    unlocked_at: Optional[datetime]
    xp_reward: int
    icon: Optional[str]
    badge_design: Optional[Dict[str, Any]]

class UserXPProfileResponse(BaseModel):
    total_xp: int
    current_level: int
    xp_in_current_level: int
    xp_needed_for_next_level: int
    level_progress_percentage: float
    daily_xp_earned: int
    weekly_xp_earned: int
    monthly_xp_earned: int
    global_rank: Optional[int]
    regional_rank: Optional[int]
    tier_rank: Optional[int]

class XPTransactionResponse(BaseModel):
    id: int
    xp_amount: int
    xp_source: str
    source_description: str
    base_xp: int
    multiplier_applied: float
    bonus_reason: Optional[str]
    caused_level_up: bool
    transaction_date: datetime

class LeaderboardEntryResponse(BaseModel):
    user_id: int
    user_name: str
    current_position: int
    previous_position: Optional[int]
    position_change: int
    current_score: float
    score_change: float
    percentile_rank: float
    score_breakdown: Optional[Dict[str, Any]]

class LeaderboardResponse(BaseModel):
    id: int
    name: str
    title: str
    description: Optional[str]
    leaderboard_type: str
    entries: List[LeaderboardEntryResponse]
    user_position: Optional[int]
    user_score: Optional[float]
    last_updated: datetime

class ChallengeResponse(BaseModel):
    id: int
    name: str
    title: str
    description: str
    challenge_type: str
    category: str
    start_date: datetime
    end_date: datetime
    current_progress: Optional[float] = None
    target_progress: Optional[float] = None
    progress_percentage: Optional[float] = None
    is_participating: bool = False
    is_completed: bool = False
    completion_rewards: Optional[Dict[str, Any]]
    participant_count: int

class NotificationResponse(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    celebration_data: Optional[Dict[str, Any]]
    is_read: bool
    created_at: datetime
    priority_level: str

class GamificationStatsResponse(BaseModel):
    total_achievements_unlocked: int
    total_achievements_available: int
    achievement_completion_rate: float
    current_level: int
    total_xp: int
    challenges_completed: int
    leaderboard_positions: Dict[str, int]
    recent_achievements: List[AchievementProgressResponse]
    recent_xp_transactions: List[XPTransactionResponse]

# ============================================================================
# ACHIEVEMENT ENDPOINTS
# ============================================================================

@router.get("/achievements", response_model=List[AchievementProgressResponse])
async def get_user_achievements(
    category: Optional[str] = Query(None, description="Filter by achievement category"),
    rarity: Optional[str] = Query(None, description="Filter by achievement rarity"),
    unlocked_only: bool = Query(False, description="Show only unlocked achievements"),
    available_only: bool = Query(False, description="Show only available (not unlocked) achievements"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's achievement progress and status"""
    
    query = db.query(AchievementDefinition).filter(AchievementDefinition.is_active == True)
    
    # Apply filters
    if category:
        try:
            category_enum = AchievementCategory(category)
            query = query.filter(AchievementDefinition.category == category_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category")
    
    if rarity:
        try:
            rarity_enum = AchievementRarity(rarity)
            query = query.filter(AchievementDefinition.rarity == rarity_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid rarity")
    
    achievements = query.all()
    
    # Get user achievement progress
    user_achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id
    ).all()
    
    # Create lookup for user progress
    progress_lookup = {ua.achievement_id: ua for ua in user_achievements}
    
    result = []
    for achievement in achievements:
        user_progress = progress_lookup.get(achievement.id)
        
        # Apply unlocked/available filters
        is_unlocked = user_progress and user_progress.is_unlocked
        if unlocked_only and not is_unlocked:
            continue
        if available_only and is_unlocked:
            continue
        
        response_item = AchievementProgressResponse(
            achievement_id=achievement.id,
            name=achievement.name,
            title=achievement.title,
            description=achievement.description,
            category=achievement.category.value,
            rarity=achievement.rarity.value,
            current_progress=user_progress.current_progress if user_progress else 0,
            target_progress=user_progress.target_progress if user_progress else achievement.target_value or 100,
            progress_percentage=user_progress.progress_percentage if user_progress else 0,
            is_unlocked=is_unlocked,
            unlocked_at=user_progress.unlocked_at if user_progress else None,
            xp_reward=achievement.xp_reward,
            icon=achievement.icon,
            badge_design=achievement.badge_design
        )
        result.append(response_item)
    
    return result

@router.get("/achievements/{achievement_id}", response_model=AchievementProgressResponse)
async def get_achievement_details(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific achievement"""
    
    achievement = db.query(AchievementDefinition).filter(
        AchievementDefinition.id == achievement_id,
        AchievementDefinition.is_active == True
    ).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    user_progress = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id,
        UserAchievement.achievement_id == achievement_id
    ).first()
    
    return AchievementProgressResponse(
        achievement_id=achievement.id,
        name=achievement.name,
        title=achievement.title,
        description=achievement.description,
        category=achievement.category.value,
        rarity=achievement.rarity.value,
        current_progress=user_progress.current_progress if user_progress else 0,
        target_progress=user_progress.target_progress if user_progress else achievement.target_value or 100,
        progress_percentage=user_progress.progress_percentage if user_progress else 0,
        is_unlocked=user_progress.is_unlocked if user_progress else False,
        unlocked_at=user_progress.unlocked_at if user_progress else None,
        xp_reward=achievement.xp_reward,
        icon=achievement.icon,
        badge_design=achievement.badge_design
    )

@router.post("/achievements/check")
async def trigger_achievement_check(
    background_tasks: BackgroundTasks,
    context: Dict[str, Any] = {},
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger achievement checking for the current user"""
    
    def check_achievements_background():
        service = GamificationService(db)
        unlocked_achievements = service.check_and_award_achievements(current_user.id, context)
        logger.info(f"Manual achievement check for user {current_user.id}: {len(unlocked_achievements)} achievements unlocked")
    
    background_tasks.add_task(check_achievements_background)
    
    return {"message": "Achievement check triggered", "user_id": current_user.id}

# ============================================================================
# EXPERIENCE POINTS (XP) ENDPOINTS
# ============================================================================

@router.get("/xp/profile", response_model=UserXPProfileResponse)
async def get_xp_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's XP profile and level information"""
    
    service = GamificationService(db)
    xp_profile = service.get_or_create_xp_profile(current_user.id)
    
    return UserXPProfileResponse(
        total_xp=xp_profile.total_xp,
        current_level=xp_profile.current_level,
        xp_in_current_level=xp_profile.xp_in_current_level,
        xp_needed_for_next_level=xp_profile.xp_needed_for_next_level,
        level_progress_percentage=xp_profile.level_progress_percentage,
        daily_xp_earned=xp_profile.daily_xp_earned,
        weekly_xp_earned=xp_profile.weekly_xp_earned,
        monthly_xp_earned=xp_profile.monthly_xp_earned,
        global_rank=xp_profile.global_rank,
        regional_rank=xp_profile.regional_rank,
        tier_rank=xp_profile.tier_rank
    )

@router.get("/xp/transactions", response_model=List[XPTransactionResponse])
async def get_xp_transactions(
    limit: int = Query(50, le=200, description="Number of transactions to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    source: Optional[str] = Query(None, description="Filter by XP source"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's XP transaction history"""
    
    query = db.query(XPTransaction).filter(XPTransaction.user_id == current_user.id)
    
    if source:
        try:
            source_enum = XPSource(source)
            query = query.filter(XPTransaction.xp_source == source_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid XP source")
    
    transactions = query.order_by(desc(XPTransaction.transaction_date)).offset(offset).limit(limit).all()
    
    return [
        XPTransactionResponse(
            id=t.id,
            xp_amount=t.xp_amount,
            xp_source=t.xp_source.value,
            source_description=t.source_description,
            base_xp=t.base_xp,
            multiplier_applied=t.multiplier_applied,
            bonus_reason=t.bonus_reason,
            caused_level_up=t.caused_level_up,
            transaction_date=t.transaction_date
        )
        for t in transactions
    ]

@router.get("/xp/leaderboard", response_model=List[Dict[str, Any]])
async def get_xp_leaderboard(
    limit: int = Query(100, le=500, description="Number of top users to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get XP leaderboard with top users"""
    
    # Get top users by XP
    top_users = db.query(
        UserXPProfile.user_id,
        UserXPProfile.total_xp,
        UserXPProfile.current_level,
        User.first_name,
        User.last_name
    ).join(User, UserXPProfile.user_id == User.id).order_by(
        desc(UserXPProfile.total_xp)
    ).limit(limit).all()
    
    # Find current user's position
    user_xp_profile = db.query(UserXPProfile).filter(UserXPProfile.user_id == current_user.id).first()
    user_position = None
    user_xp = 0
    
    if user_xp_profile:
        user_xp = user_xp_profile.total_xp
        user_position = db.query(UserXPProfile).filter(
            UserXPProfile.total_xp > user_xp_profile.total_xp
        ).count() + 1
    
    leaderboard = []
    for i, (user_id, total_xp, level, first_name, last_name) in enumerate(top_users, 1):
        leaderboard.append({
            "position": i,
            "user_id": user_id,
            "name": f"{first_name} {last_name}",
            "total_xp": total_xp,
            "level": level,
            "is_current_user": user_id == current_user.id
        })
    
    return {
        "leaderboard": leaderboard,
        "user_position": user_position,
        "user_xp": user_xp,
        "total_users": db.query(UserXPProfile).count()
    }

# ============================================================================
# LEADERBOARD ENDPOINTS
# ============================================================================

@router.get("/leaderboards", response_model=List[LeaderboardResponse])
async def get_leaderboards(
    leaderboard_type: Optional[str] = Query(None, description="Filter by leaderboard type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available leaderboards"""
    
    query = db.query(Leaderboard).filter(Leaderboard.is_active == True)
    
    if leaderboard_type:
        try:
            type_enum = LeaderboardType(leaderboard_type)
            query = query.filter(Leaderboard.leaderboard_type == type_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid leaderboard type")
    
    leaderboards = query.order_by(asc(Leaderboard.name)).all()
    
    result = []
    for leaderboard in leaderboards:
        # Get leaderboard entries
        entries = db.query(LeaderboardEntry).filter(
            LeaderboardEntry.leaderboard_id == leaderboard.id
        ).order_by(asc(LeaderboardEntry.current_position)).limit(100).all()
        
        # Get user names
        user_ids = [entry.user_id for entry in entries]
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_lookup = {user.id: f"{user.first_name} {user.last_name}" for user in users}
        
        # Find user's position
        user_entry = db.query(LeaderboardEntry).filter(
            LeaderboardEntry.leaderboard_id == leaderboard.id,
            LeaderboardEntry.user_id == current_user.id
        ).first()
        
        entry_responses = [
            LeaderboardEntryResponse(
                user_id=entry.user_id,
                user_name=user_lookup.get(entry.user_id, "Unknown"),
                current_position=entry.current_position,
                previous_position=entry.previous_position,
                position_change=entry.position_change,
                current_score=entry.current_score,
                score_change=entry.score_change,
                percentile_rank=entry.percentile_rank,
                score_breakdown=entry.score_breakdown
            )
            for entry in entries
        ]
        
        leaderboard_response = LeaderboardResponse(
            id=leaderboard.id,
            name=leaderboard.name,
            title=leaderboard.title,
            description=leaderboard.description,
            leaderboard_type=leaderboard.leaderboard_type.value,
            entries=entry_responses,
            user_position=user_entry.current_position if user_entry else None,
            user_score=user_entry.current_score if user_entry else None,
            last_updated=leaderboard.last_updated
        )
        
        result.append(leaderboard_response)
    
    return result

@router.get("/leaderboards/{leaderboard_id}", response_model=LeaderboardResponse)
async def get_leaderboard_details(
    leaderboard_id: int,
    limit: int = Query(100, le=500, description="Number of entries to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed leaderboard information"""
    
    leaderboard = db.query(Leaderboard).filter(
        Leaderboard.id == leaderboard_id,
        Leaderboard.is_active == True
    ).first()
    
    if not leaderboard:
        raise HTTPException(status_code=404, detail="Leaderboard not found")
    
    # Get leaderboard entries
    entries = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.leaderboard_id == leaderboard_id
    ).order_by(asc(LeaderboardEntry.current_position)).limit(limit).all()
    
    # Get user names
    user_ids = [entry.user_id for entry in entries]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_lookup = {user.id: f"{user.first_name} {user.last_name}" for user in users}
    
    # Find user's position
    user_entry = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.leaderboard_id == leaderboard_id,
        LeaderboardEntry.user_id == current_user.id
    ).first()
    
    entry_responses = [
        LeaderboardEntryResponse(
            user_id=entry.user_id,
            user_name=user_lookup.get(entry.user_id, "Unknown"),
            current_position=entry.current_position,
            previous_position=entry.previous_position,
            position_change=entry.position_change,
            current_score=entry.current_score,
            score_change=entry.score_change,
            percentile_rank=entry.percentile_rank,
            score_breakdown=entry.score_breakdown
        )
        for entry in entries
    ]
    
    return LeaderboardResponse(
        id=leaderboard.id,
        name=leaderboard.name,
        title=leaderboard.title,
        description=leaderboard.description,
        leaderboard_type=leaderboard.leaderboard_type.value,
        entries=entry_responses,
        user_position=user_entry.current_position if user_entry else None,
        user_score=user_entry.current_score if user_entry else None,
        last_updated=leaderboard.last_updated
    )

# ============================================================================
# CHALLENGE ENDPOINTS
# ============================================================================

@router.get("/challenges", response_model=List[ChallengeResponse])
async def get_challenges(
    active_only: bool = Query(True, description="Show only active challenges"),
    participating_only: bool = Query(False, description="Show only challenges user is participating in"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available and active challenges"""
    
    now = datetime.utcnow()
    query = db.query(GamificationChallenge)
    
    if active_only:
        query = query.filter(
            GamificationChallenge.is_active == True,
            GamificationChallenge.start_date <= now,
            GamificationChallenge.end_date >= now
        )
    
    challenges = query.order_by(desc(GamificationChallenge.start_date)).all()
    
    # Get user participations
    participations = db.query(ChallengeParticipation).filter(
        ChallengeParticipation.user_id == current_user.id,
        ChallengeParticipation.challenge_id.in_([c.id for c in challenges])
    ).all()
    
    participation_lookup = {p.challenge_id: p for p in participations}
    
    result = []
    for challenge in challenges:
        participation = participation_lookup.get(challenge.id)
        is_participating = participation is not None
        
        if participating_only and not is_participating:
            continue
        
        challenge_response = ChallengeResponse(
            id=challenge.id,
            name=challenge.name,
            title=challenge.title,
            description=challenge.description,
            challenge_type=challenge.challenge_type.value,
            category=challenge.category.value,
            start_date=challenge.start_date,
            end_date=challenge.end_date,
            current_progress=participation.current_progress if participation else None,
            target_progress=participation.target_progress if participation else None,
            progress_percentage=participation.progress_percentage if participation else None,
            is_participating=is_participating,
            is_completed=participation.is_completed if participation else False,
            completion_rewards=challenge.completion_rewards,
            participant_count=challenge.current_participants
        )
        
        result.append(challenge_response)
    
    return result

@router.post("/challenges/{challenge_id}/join")
async def join_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a challenge"""
    
    challenge = db.query(GamificationChallenge).filter(
        GamificationChallenge.id == challenge_id,
        GamificationChallenge.is_active == True
    ).first()
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if already participating
    existing_participation = db.query(ChallengeParticipation).filter(
        ChallengeParticipation.user_id == current_user.id,
        ChallengeParticipation.challenge_id == challenge_id
    ).first()
    
    if existing_participation:
        raise HTTPException(status_code=400, detail="Already participating in this challenge")
    
    # Check challenge capacity
    if challenge.max_participants and challenge.current_participants >= challenge.max_participants:
        raise HTTPException(status_code=400, detail="Challenge is full")
    
    # Check registration deadline
    now = datetime.utcnow()
    if challenge.registration_deadline and now > challenge.registration_deadline:
        raise HTTPException(status_code=400, detail="Registration deadline has passed")
    
    # Create participation
    participation = ChallengeParticipation(
        user_id=current_user.id,
        challenge_id=challenge_id,
        target_progress=challenge.target_value,
        started_at=now
    )
    
    db.add(participation)
    
    # Update challenge participant count
    challenge.current_participants += 1
    
    db.commit()
    
    return {"message": "Successfully joined challenge", "challenge_id": challenge_id}

# ============================================================================
# NOTIFICATION ENDPOINTS
# ============================================================================

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False, description="Show only unread notifications"),
    limit: int = Query(50, le=200, description="Number of notifications to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's gamification notifications"""
    
    query = db.query(GamificationNotification).filter(
        GamificationNotification.user_id == current_user.id
    )
    
    if unread_only:
        query = query.filter(GamificationNotification.is_read == False)
    
    notifications = query.order_by(desc(GamificationNotification.created_at)).offset(offset).limit(limit).all()
    
    return [
        NotificationResponse(
            id=n.id,
            notification_type=n.notification_type.value,
            title=n.title,
            message=n.message,
            celebration_data=n.celebration_data,
            is_read=n.is_read,
            created_at=n.created_at,
            priority_level=n.priority_level
        )
        for n in notifications
    ]

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    
    notification = db.query(GamificationNotification).filter(
        GamificationNotification.id == notification_id,
        GamificationNotification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Notification marked as read"}

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    
    db.query(GamificationNotification).filter(
        GamificationNotification.user_id == current_user.id,
        GamificationNotification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })
    
    db.commit()
    
    return {"message": "All notifications marked as read"}

# ============================================================================
# ANALYTICS AND OVERVIEW ENDPOINTS
# ============================================================================

@router.get("/stats", response_model=GamificationStatsResponse)
async def get_gamification_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive gamification statistics for the user"""
    
    # Total achievements
    total_achievements = db.query(AchievementDefinition).filter(
        AchievementDefinition.is_active == True
    ).count()
    
    unlocked_achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id,
        UserAchievement.is_unlocked == True
    ).count()
    
    completion_rate = (unlocked_achievements / total_achievements * 100) if total_achievements > 0 else 0
    
    # XP profile
    xp_profile = db.query(UserXPProfile).filter(UserXPProfile.user_id == current_user.id).first()
    current_level = xp_profile.current_level if xp_profile else 1
    total_xp = xp_profile.total_xp if xp_profile else 0
    
    # Challenges completed
    challenges_completed = db.query(ChallengeParticipation).filter(
        ChallengeParticipation.user_id == current_user.id,
        ChallengeParticipation.is_completed == True
    ).count()
    
    # Leaderboard positions
    leaderboard_positions = {}
    leaderboard_entries = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.user_id == current_user.id
    ).all()
    
    for entry in leaderboard_entries:
        leaderboard = db.query(Leaderboard).filter(Leaderboard.id == entry.leaderboard_id).first()
        if leaderboard:
            leaderboard_positions[leaderboard.name] = entry.current_position
    
    # Recent achievements (last 10)
    recent_achievements_data = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id,
        UserAchievement.is_unlocked == True
    ).order_by(desc(UserAchievement.unlocked_at)).limit(10).all()
    
    recent_achievement_ids = [ua.achievement_id for ua in recent_achievements_data]
    recent_achievement_defs = db.query(AchievementDefinition).filter(
        AchievementDefinition.id.in_(recent_achievement_ids)
    ).all()
    
    achievement_lookup = {ad.id: ad for ad in recent_achievement_defs}
    
    recent_achievements = []
    for ua in recent_achievements_data:
        ad = achievement_lookup.get(ua.achievement_id)
        if ad:
            recent_achievements.append(AchievementProgressResponse(
                achievement_id=ad.id,
                name=ad.name,
                title=ad.title,
                description=ad.description,
                category=ad.category.value,
                rarity=ad.rarity.value,
                current_progress=ua.current_progress,
                target_progress=ua.target_progress or 100,
                progress_percentage=ua.progress_percentage,
                is_unlocked=ua.is_unlocked,
                unlocked_at=ua.unlocked_at,
                xp_reward=ad.xp_reward,
                icon=ad.icon,
                badge_design=ad.badge_design
            ))
    
    # Recent XP transactions (last 10)
    recent_xp = db.query(XPTransaction).filter(
        XPTransaction.user_id == current_user.id
    ).order_by(desc(XPTransaction.transaction_date)).limit(10).all()
    
    recent_xp_transactions = [
        XPTransactionResponse(
            id=t.id,
            xp_amount=t.xp_amount,
            xp_source=t.xp_source.value,
            source_description=t.source_description,
            base_xp=t.base_xp,
            multiplier_applied=t.multiplier_applied,
            bonus_reason=t.bonus_reason,
            caused_level_up=t.caused_level_up,
            transaction_date=t.transaction_date
        )
        for t in recent_xp
    ]
    
    return GamificationStatsResponse(
        total_achievements_unlocked=unlocked_achievements,
        total_achievements_available=total_achievements,
        achievement_completion_rate=completion_rate,
        current_level=current_level,
        total_xp=total_xp,
        challenges_completed=challenges_completed,
        leaderboard_positions=leaderboard_positions,
        recent_achievements=recent_achievements,
        recent_xp_transactions=recent_xp_transactions
    )

@router.get("/dashboard")
async def get_gamification_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive gamification dashboard data"""
    
    service = GamificationService(db)
    
    # Get XP profile
    xp_profile = service.get_or_create_xp_profile(current_user.id)
    
    # Get progress toward next achievements
    near_completion_achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id,
        UserAchievement.is_unlocked == False,
        UserAchievement.progress_percentage >= 50
    ).order_by(desc(UserAchievement.progress_percentage)).limit(5).all()
    
    # Get recent activity
    recent_activity = db.query(XPTransaction).filter(
        XPTransaction.user_id == current_user.id,
        XPTransaction.transaction_date >= datetime.utcnow() - timedelta(days=7)
    ).order_by(desc(XPTransaction.transaction_date)).limit(20).all()
    
    # Get leaderboard rankings
    top_leaderboards = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.user_id == current_user.id,
        LeaderboardEntry.current_position <= 100
    ).order_by(asc(LeaderboardEntry.current_position)).limit(5).all()
    
    return {
        "xp_profile": {
            "total_xp": xp_profile.total_xp,
            "current_level": xp_profile.current_level,
            "progress_to_next_level": xp_profile.level_progress_percentage,
            "daily_xp": xp_profile.daily_xp_earned,
            "weekly_xp": xp_profile.weekly_xp_earned,
            "monthly_xp": xp_profile.monthly_xp_earned
        },
        "near_completion_achievements": [
            {
                "achievement_id": ua.achievement_id,
                "progress_percentage": ua.progress_percentage,
                "current_progress": ua.current_progress,
                "target_progress": ua.target_progress
            }
            for ua in near_completion_achievements
        ],
        "recent_activity": [
            {
                "xp_amount": t.xp_amount,
                "source": t.xp_source.value,
                "description": t.source_description,
                "date": t.transaction_date,
                "level_up": t.caused_level_up
            }
            for t in recent_activity
        ],
        "leaderboard_rankings": [
            {
                "leaderboard_id": entry.leaderboard_id,
                "position": entry.current_position,
                "score": entry.current_score,
                "position_change": entry.position_change
            }
            for entry in top_leaderboards
        ]
    }