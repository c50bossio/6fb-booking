"""
Gamification Background Worker for BookedBarber V2

This worker handles background processing for the gamification system:
- Periodic achievement progress calculation
- Leaderboard updates
- XP calculation and awarding
- Challenge progress tracking
- Analytics generation
- Notification processing

The worker runs as a Celery task and can be scheduled or triggered by events.
"""

import logging
from datetime import datetime, timedelta, timezone, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc

from db import get_db
from models import (
    User, Appointment, Payment, Service, Client,
    AchievementDefinition, UserAchievement, UserXPProfile, XPTransaction,
    GamificationChallenge, ChallengeParticipation, Leaderboard, LeaderboardEntry,
    GamificationNotification, GamificationAnalytics,
    AchievementCategory, AchievementRarity, XPSource, NotificationType,
    SixFBRevenueMetrics, SixFBClientValueProfile, SixFBEfficiencyMetrics
)
from services.gamification_service import (
    GamificationService, trigger_appointment_completion_achievements,
    trigger_revenue_milestone_achievements, trigger_client_satisfaction_achievements,
    trigger_tier_advancement_achievements
)
from services.achievement_definitions import ACHIEVEMENT_DEFINITIONS

logger = logging.getLogger(__name__)


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class GamificationWorker:
    """
    Background worker for gamification system processing.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.service = GamificationService(db)
    
    # ============================================================================
    # ACHIEVEMENT PROCESSING
    # ============================================================================
    
    def process_all_user_achievements(self, batch_size: int = 50) -> Dict[str, Any]:
        """
        Process achievement checks for all active users in batches.
        """
        logger.info("Starting batch achievement processing")
        
        results = {
            "users_processed": 0,
            "achievements_unlocked": 0,
            "errors": 0,
            "processing_time": 0
        }
        
        start_time = datetime.utcnow()
        
        try:
            # Get all active users
            total_users = self.db.query(func.count(User.id)).filter(User.is_active == True).scalar()
            
            offset = 0
            while offset < total_users:
                # Process batch of users
                users = self.db.query(User).filter(
                    User.is_active == True
                ).offset(offset).limit(batch_size).all()
                
                for user in users:
                    try:
                        # Check achievements for this user
                        context = {
                            "trigger": "batch_processing",
                            "timestamp": utcnow().isoformat(),
                            "worker": "gamification_worker"
                        }
                        
                        unlocked = self.service.check_and_award_achievements(user.id, context)
                        results["achievements_unlocked"] += len(unlocked)
                        results["users_processed"] += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing achievements for user {user.id}: {e}")
                        results["errors"] += 1
                
                offset += batch_size
                
                # Commit batch
                self.db.commit()
                
                logger.info(f"Processed batch: {offset}/{total_users} users")
        
        except Exception as e:
            logger.error(f"Error in batch achievement processing: {e}")
            self.db.rollback()
            results["errors"] += 1
        
        results["processing_time"] = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"Batch achievement processing completed: {results}")
        return results
    
    def process_user_achievements(self, user_id: int, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process achievements for a specific user.
        """
        if context is None:
            context = {
                "trigger": "user_specific_processing",
                "timestamp": utcnow().isoformat(),
                "worker": "gamification_worker"
            }
        
        try:
            unlocked_achievements = self.service.check_and_award_achievements(user_id, context)
            
            result = {
                "user_id": user_id,
                "achievements_unlocked": len(unlocked_achievements),
                "unlocked_details": [
                    {
                        "achievement_id": unlock.achievement_id,
                        "achievement_name": unlock.achievement_name,
                        "xp_earned": unlock.xp_earned,
                        "rarity": unlock.rarity,
                        "category": unlock.category
                    }
                    for unlock in unlocked_achievements
                ],
                "success": True
            }
            
            self.db.commit()
            
            logger.info(f"Processed achievements for user {user_id}: {len(unlocked_achievements)} unlocked")
            return result
            
        except Exception as e:
            logger.error(f"Error processing achievements for user {user_id}: {e}")
            self.db.rollback()
            return {
                "user_id": user_id,
                "achievements_unlocked": 0,
                "error": str(e),
                "success": False
            }
    
    def initialize_achievement_definitions(self) -> Dict[str, Any]:
        """
        Initialize or update achievement definitions in the database.
        """
        logger.info("Initializing achievement definitions")
        
        results = {
            "created": 0,
            "updated": 0,
            "errors": 0
        }
        
        try:
            for achievement_data in ACHIEVEMENT_DEFINITIONS:
                try:
                    # Check if achievement already exists
                    existing = self.db.query(AchievementDefinition).filter(
                        AchievementDefinition.name == achievement_data["name"]
                    ).first()
                    
                    if existing:
                        # Update existing achievement
                        for key, value in achievement_data.items():
                            if key != "name" and hasattr(existing, key):
                                setattr(existing, key, value)
                        existing.updated_at = utcnow()
                        results["updated"] += 1
                    else:
                        # Create new achievement
                        achievement = AchievementDefinition(**achievement_data)
                        self.db.add(achievement)
                        results["created"] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing achievement {achievement_data.get('name', 'unknown')}: {e}")
                    results["errors"] += 1
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error initializing achievement definitions: {e}")
            self.db.rollback()
            results["errors"] += 1
        
        logger.info(f"Achievement definitions initialized: {results}")
        return results
    
    # ============================================================================
    # LEADERBOARD PROCESSING
    # ============================================================================
    
    def update_all_leaderboards(self) -> Dict[str, Any]:
        """
        Update all active leaderboards.
        """
        logger.info("Starting leaderboard updates")
        
        results = {
            "leaderboards_updated": 0,
            "entries_created": 0,
            "errors": 0,
            "processing_time": 0
        }
        
        start_time = datetime.utcnow()
        
        try:
            # Get all active leaderboards that need updating
            now = utcnow()
            leaderboards = self.db.query(Leaderboard).filter(
                Leaderboard.is_active == True,
                or_(
                    Leaderboard.next_update_at.is_(None),
                    Leaderboard.next_update_at <= now
                )
            ).all()
            
            for leaderboard in leaderboards:
                try:
                    self.service._update_single_leaderboard(leaderboard)
                    results["leaderboards_updated"] += 1
                    
                    # Count entries created
                    entry_count = self.db.query(LeaderboardEntry).filter(
                        LeaderboardEntry.leaderboard_id == leaderboard.id
                    ).count()
                    results["entries_created"] += entry_count
                    
                except Exception as e:
                    logger.error(f"Error updating leaderboard {leaderboard.id}: {e}")
                    results["errors"] += 1
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error in leaderboard updates: {e}")
            self.db.rollback()
            results["errors"] += 1
        
        results["processing_time"] = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"Leaderboard updates completed: {results}")
        return results
    
    # ============================================================================
    # CHALLENGE PROCESSING
    # ============================================================================
    
    def process_challenge_progress(self) -> Dict[str, Any]:
        """
        Update challenge progress for all active participants.
        """
        logger.info("Processing challenge progress")
        
        results = {
            "challenges_processed": 0,
            "participants_updated": 0,
            "challenges_completed": 0,
            "errors": 0
        }
        
        try:
            # Get active challenges
            now = utcnow()
            active_challenges = self.db.query(GamificationChallenge).filter(
                GamificationChallenge.is_active == True,
                GamificationChallenge.start_date <= now,
                GamificationChallenge.end_date >= now
            ).all()
            
            for challenge in active_challenges:
                try:
                    # Get all participants for this challenge
                    participants = self.db.query(ChallengeParticipation).filter(
                        ChallengeParticipation.challenge_id == challenge.id,
                        ChallengeParticipation.is_completed == False
                    ).all()
                    
                    for participation in participants:
                        # Update challenge progress based on challenge type
                        progress_updated = self._update_challenge_progress(challenge, participation)
                        if progress_updated:
                            results["participants_updated"] += 1
                            
                            # Check if challenge completed
                            if participation.progress_percentage >= 100:
                                participation.is_completed = True
                                participation.completed_at = utcnow()
                                results["challenges_completed"] += 1
                                
                                # Award completion rewards
                                self._award_challenge_completion_rewards(challenge, participation)
                    
                    results["challenges_processed"] += 1
                    
                except Exception as e:
                    logger.error(f"Error processing challenge {challenge.id}: {e}")
                    results["errors"] += 1
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error in challenge processing: {e}")
            self.db.rollback()
            results["errors"] += 1
        
        logger.info(f"Challenge processing completed: {results}")
        return results
    
    def _update_challenge_progress(self, challenge: GamificationChallenge, participation: ChallengeParticipation) -> bool:
        """
        Update progress for a specific challenge participation.
        """
        try:
            objective = challenge.objective
            challenge_type = objective.get("type")
            
            if challenge_type == "revenue_target":
                # Calculate revenue progress
                target_amount = objective.get("amount")
                current_revenue = self._calculate_user_revenue_for_period(
                    participation.user_id,
                    challenge.start_date,
                    utcnow()
                )
                
                participation.current_progress = current_revenue
                participation.target_progress = target_amount
                participation.progress_percentage = min((current_revenue / target_amount) * 100, 100)
                
            elif challenge_type == "appointment_count":
                # Calculate appointment count progress
                target_count = objective.get("count")
                current_count = self._calculate_user_appointments_for_period(
                    participation.user_id,
                    challenge.start_date,
                    utcnow()
                )
                
                participation.current_progress = current_count
                participation.target_progress = target_count
                participation.progress_percentage = min((current_count / target_count) * 100, 100)
                
            elif challenge_type == "client_satisfaction":
                # Calculate satisfaction score progress
                target_score = objective.get("score")
                current_score = self._calculate_user_satisfaction_for_period(
                    participation.user_id,
                    challenge.start_date,
                    utcnow()
                )
                
                participation.current_progress = current_score
                participation.target_progress = target_score
                participation.progress_percentage = min((current_score / target_score) * 100, 100)
                
            participation.last_progress_update = utcnow()
            return True
            
        except Exception as e:
            logger.error(f"Error updating challenge progress for participation {participation.id}: {e}")
            return False
    
    def _award_challenge_completion_rewards(self, challenge: GamificationChallenge, participation: ChallengeParticipation):
        """
        Award rewards for challenge completion.
        """
        try:
            completion_rewards = challenge.completion_rewards
            if not completion_rewards:
                return
            
            # Award XP
            xp_reward = completion_rewards.get("xp", 0)
            if xp_reward > 0:
                self.service.award_xp(
                    participation.user_id,
                    XPSource.ACHIEVEMENT_UNLOCK,  # Using achievement unlock as closest match
                    xp_reward,
                    f"Challenge completed: {challenge.title}",
                    related_challenge_id=challenge.id
                )
                participation.xp_earned = xp_reward
            
            # Award achievements
            achievement_rewards = completion_rewards.get("achievements", [])
            for achievement_name in achievement_rewards:
                # This would need achievement unlocking logic
                pass
            
            # Create notification
            notification = GamificationNotification(
                user_id=participation.user_id,
                notification_type=NotificationType.CHALLENGE_COMPLETE,
                title=f"🏆 Challenge Completed: {challenge.title}",
                message=f"Congratulations! You've successfully completed the {challenge.title} challenge.",
                related_challenge_id=challenge.id,
                celebration_data={
                    "challenge_name": challenge.title,
                    "completion_date": participation.completed_at.isoformat(),
                    "rewards": completion_rewards
                },
                priority_level="high",
                show_in_app=True,
                send_push_notification=True
            )
            self.db.add(notification)
            
        except Exception as e:
            logger.error(f"Error awarding challenge completion rewards: {e}")
    
    # ============================================================================
    # XP PROCESSING
    # ============================================================================
    
    def reset_daily_xp_counters(self) -> Dict[str, Any]:
        """
        Reset daily XP counters for all users (run at midnight).
        """
        logger.info("Resetting daily XP counters")
        
        try:
            updated_count = self.db.query(UserXPProfile).update({
                "daily_xp_earned": 0
            })
            
            self.db.commit()
            
            result = {
                "users_updated": updated_count,
                "success": True
            }
            
            logger.info(f"Daily XP counters reset for {updated_count} users")
            return result
            
        except Exception as e:
            logger.error(f"Error resetting daily XP counters: {e}")
            self.db.rollback()
            return {
                "users_updated": 0,
                "error": str(e),
                "success": False
            }
    
    def reset_weekly_xp_counters(self) -> Dict[str, Any]:
        """
        Reset weekly XP counters for all users (run weekly).
        """
        logger.info("Resetting weekly XP counters")
        
        try:
            updated_count = self.db.query(UserXPProfile).update({
                "weekly_xp_earned": 0
            })
            
            self.db.commit()
            
            result = {
                "users_updated": updated_count,
                "success": True
            }
            
            logger.info(f"Weekly XP counters reset for {updated_count} users")
            return result
            
        except Exception as e:
            logger.error(f"Error resetting weekly XP counters: {e}")
            self.db.rollback()
            return {
                "users_updated": 0,
                "error": str(e),
                "success": False
            }
    
    def reset_monthly_xp_counters(self) -> Dict[str, Any]:
        """
        Reset monthly XP counters for all users (run monthly).
        """
        logger.info("Resetting monthly XP counters")
        
        try:
            updated_count = self.db.query(UserXPProfile).update({
                "monthly_xp_earned": 0
            })
            
            self.db.commit()
            
            result = {
                "users_updated": updated_count,
                "success": True
            }
            
            logger.info(f"Monthly XP counters reset for {updated_count} users")
            return result
            
        except Exception as e:
            logger.error(f"Error resetting monthly XP counters: {e}")
            self.db.rollback()
            return {
                "users_updated": 0,
                "error": str(e),
                "success": False
            }
    
    # ============================================================================
    # ANALYTICS PROCESSING
    # ============================================================================
    
    def generate_daily_analytics(self) -> Dict[str, Any]:
        """
        Generate daily gamification analytics for all users.
        """
        logger.info("Generating daily gamification analytics")
        
        results = {
            "analytics_generated": 0,
            "errors": 0,
            "processing_time": 0
        }
        
        start_time = datetime.utcnow()
        
        try:
            today = date.today()
            
            # Get all active users
            users = self.db.query(User).filter(User.is_active == True).all()
            
            for user in users:
                try:
                    analytics = self._generate_user_daily_analytics(user.id, today)
                    if analytics:
                        self.db.add(analytics)
                        results["analytics_generated"] += 1
                        
                except Exception as e:
                    logger.error(f"Error generating analytics for user {user.id}: {e}")
                    results["errors"] += 1
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error in daily analytics generation: {e}")
            self.db.rollback()
            results["errors"] += 1
        
        results["processing_time"] = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"Daily analytics generation completed: {results}")
        return results
    
    def _generate_user_daily_analytics(self, user_id: int, analytics_date: date) -> Optional[GamificationAnalytics]:
        """
        Generate daily analytics for a specific user.
        """
        try:
            # Check if analytics already exist for this date
            existing = self.db.query(GamificationAnalytics).filter(
                GamificationAnalytics.user_id == user_id,
                GamificationAnalytics.analytics_date == analytics_date,
                GamificationAnalytics.period_type == "daily"
            ).first()
            
            if existing:
                return None  # Already exists
            
            # Calculate daily metrics
            start_datetime = datetime.combine(analytics_date, datetime.min.time())
            end_datetime = start_datetime + timedelta(days=1)
            
            # Achievements unlocked today
            achievements_unlocked = self.db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.unlocked_at >= start_datetime,
                UserAchievement.unlocked_at < end_datetime
            ).count()
            
            # XP earned today
            xp_earned = self.db.query(func.sum(XPTransaction.xp_amount)).filter(
                XPTransaction.user_id == user_id,
                XPTransaction.transaction_date >= start_datetime,
                XPTransaction.transaction_date < end_datetime
            ).scalar() or 0
            
            # Challenges participated in today
            challenges_participated = self.db.query(ChallengeParticipation).filter(
                ChallengeParticipation.user_id == user_id,
                ChallengeParticipation.registered_at >= start_datetime,
                ChallengeParticipation.registered_at < end_datetime
            ).count()
            
            # Challenges completed today
            challenges_completed = self.db.query(ChallengeParticipation).filter(
                ChallengeParticipation.user_id == user_id,
                ChallengeParticipation.completed_at >= start_datetime,
                ChallengeParticipation.completed_at < end_datetime
            ).count()
            
            # Create analytics record
            analytics = GamificationAnalytics(
                user_id=user_id,
                analytics_date=analytics_date,
                period_type="daily",
                achievements_unlocked_count=achievements_unlocked,
                total_xp_earned=int(xp_earned),
                challenges_participated=challenges_participated,
                challenges_completed=challenges_completed,
                session_engagement_score=self._calculate_engagement_score(user_id, start_datetime, end_datetime),
                calculated_at=utcnow()
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error generating daily analytics for user {user_id}: {e}")
            return None
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    def _calculate_user_revenue_for_period(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate user revenue for a specific period"""
        revenue = self.db.query(func.sum(Payment.amount)).filter(
            Payment.user_id == user_id,
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
            Payment.status == "completed"
        ).scalar()
        
        return float(revenue) if revenue else 0.0
    
    def _calculate_user_appointments_for_period(self, user_id: int, start_date: datetime, end_date: datetime) -> int:
        """Calculate user appointments for a specific period"""
        count = self.db.query(Appointment).filter(
            Appointment.user_id == user_id,
            Appointment.appointment_time >= start_date,
            Appointment.appointment_time <= end_date,
            Appointment.status == "completed"
        ).count()
        
        return count
    
    def _calculate_user_satisfaction_for_period(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate user satisfaction score for a specific period"""
        # This would need integration with satisfaction tracking
        return 4.5  # Placeholder
    
    def _calculate_engagement_score(self, user_id: int, start_datetime: datetime, end_datetime: datetime) -> float:
        """Calculate user engagement score for a period"""
        # This would be a complex calculation based on various engagement metrics
        return 75.0  # Placeholder


# ============================================================================
# CELERY TASK FUNCTIONS
# ============================================================================

def run_batch_achievement_processing():
    """Celery task for batch achievement processing"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.process_all_user_achievements()
    finally:
        db.close()


def run_leaderboard_updates():
    """Celery task for leaderboard updates"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.update_all_leaderboards()
    finally:
        db.close()


def run_challenge_processing():
    """Celery task for challenge progress processing"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.process_challenge_progress()
    finally:
        db.close()


def run_daily_analytics_generation():
    """Celery task for daily analytics generation"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.generate_daily_analytics()
    finally:
        db.close()


def run_daily_xp_reset():
    """Celery task for daily XP counter reset"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.reset_daily_xp_counters()
    finally:
        db.close()


def run_weekly_xp_reset():
    """Celery task for weekly XP counter reset"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.reset_weekly_xp_counters()
    finally:
        db.close()


def run_monthly_xp_reset():
    """Celery task for monthly XP counter reset"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.reset_monthly_xp_counters()
    finally:
        db.close()


def initialize_achievement_definitions():
    """Celery task for initializing achievement definitions"""
    db = next(get_db())
    try:
        worker = GamificationWorker(db)
        return worker.initialize_achievement_definitions()
    finally:
        db.close()


# ============================================================================
# EVENT TRIGGER FUNCTIONS
# ============================================================================

def trigger_appointment_achievements(user_id: int, appointment_id: int):
    """Trigger achievement processing for appointment completion"""
    db = next(get_db())
    try:
        trigger_appointment_completion_achievements(db, user_id, appointment_id)
    finally:
        db.close()


def trigger_revenue_achievements(user_id: int, revenue_amount: float, period: str):
    """Trigger achievement processing for revenue milestones"""
    db = next(get_db())
    try:
        trigger_revenue_milestone_achievements(db, user_id, revenue_amount, period)
    finally:
        db.close()


def trigger_satisfaction_achievements(user_id: int, satisfaction_score: float):
    """Trigger achievement processing for client satisfaction"""
    db = next(get_db())
    try:
        trigger_client_satisfaction_achievements(db, user_id, satisfaction_score)
    finally:
        db.close()


def trigger_tier_achievements(user_id: int, old_tier: str, new_tier: str):
    """Trigger achievement processing for tier advancement"""
    db = next(get_db())
    try:
        trigger_tier_advancement_achievements(db, user_id, old_tier, new_tier)
    finally:
        db.close()