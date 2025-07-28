#!/usr/bin/env python3
"""
Gamification System Initialization Script

This script initializes the gamification system for BookedBarber V2:
- Creates achievement definitions in the database
- Sets up default leaderboards
- Initializes XP profiles for existing users
- Creates default challenges
- Configures gamification settings

Run this script after deploying the gamification system to ensure
all components are properly initialized.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, date, timezone
from sqlalchemy.orm import Session
import logging

from db import get_db
from models import (
    User, AchievementDefinition, UserXPProfile, Leaderboard, 
    GamificationChallenge, AchievementCategory, AchievementRarity, 
    AchievementType, LeaderboardType, ChallengeType
)
from services.achievement_definitions import ACHIEVEMENT_DEFINITIONS
from services.gamification_service import GamificationService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class GamificationInitializer:
    """
    Handles initialization of the gamification system.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.service = GamificationService(db)
    
    def initialize_all(self) -> dict:
        """
        Run complete gamification system initialization.
        """
        logger.info("Starting gamification system initialization")
        
        results = {
            "achievements": {},
            "leaderboards": {},
            "xp_profiles": {},
            "challenges": {},
            "success": True,
            "errors": []
        }
        
        try:
            # 1. Initialize achievement definitions
            logger.info("Initializing achievement definitions...")
            results["achievements"] = self.initialize_achievements()
            
            # 2. Create default leaderboards
            logger.info("Creating default leaderboards...")
            results["leaderboards"] = self.create_default_leaderboards()
            
            # 3. Initialize XP profiles for existing users
            logger.info("Initializing XP profiles...")
            results["xp_profiles"] = self.initialize_xp_profiles()
            
            # 4. Create starter challenges
            logger.info("Creating starter challenges...")
            results["challenges"] = self.create_starter_challenges()
            
            # 5. Commit all changes
            self.db.commit()
            
            logger.info("Gamification system initialization completed successfully")
            
        except Exception as e:
            logger.error(f"Error during gamification initialization: {e}")
            self.db.rollback()
            results["success"] = False
            results["errors"].append(str(e))
        
        return results
    
    def initialize_achievements(self) -> dict:
        """
        Initialize achievement definitions in the database.
        """
        results = {
            "created": 0,
            "updated": 0,
            "errors": 0,
            "total_definitions": len(ACHIEVEMENT_DEFINITIONS)
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
                        logger.debug(f"Updated achievement: {achievement_data['name']}")
                    else:
                        # Create new achievement
                        achievement = AchievementDefinition(**achievement_data)
                        self.db.add(achievement)
                        results["created"] += 1
                        logger.debug(f"Created achievement: {achievement_data['name']}")
                        
                except Exception as e:
                    logger.error(f"Error processing achievement {achievement_data.get('name', 'unknown')}: {e}")
                    results["errors"] += 1
            
            logger.info(f"Achievement initialization: {results['created']} created, {results['updated']} updated, {results['errors']} errors")
            
        except Exception as e:
            logger.error(f"Error in achievement initialization: {e}")
            results["errors"] += 1
        
        return results
    
    def create_default_leaderboards(self) -> dict:
        """
        Create default leaderboards for the gamification system.
        """
        results = {
            "created": 0,
            "updated": 0,
            "errors": 0
        }
        
        default_leaderboards = [
            {
                "name": "overall_xp",
                "title": "Overall Experience Points",
                "description": "Top performers by total XP earned across all activities",
                "leaderboard_type": LeaderboardType.OVERALL_XP,
                "ranking_metric": "total_xp",
                "ranking_direction": "desc",
                "ranking_period": "all_time",
                "update_frequency_minutes": 60,
                "max_displayed_positions": 100,
                "is_public": True,
                "sfb_principle": "professional_growth",
                "coaching_insight": "XP leaders demonstrate consistent engagement and skill development",
                "motivation_message": "Every action you take earns XP and builds your expertise!"
            },
            {
                "name": "monthly_revenue",
                "title": "Monthly Revenue Leaders",
                "description": "Top revenue generators for the current month",
                "leaderboard_type": LeaderboardType.MONTHLY_REVENUE,
                "ranking_metric": "monthly_revenue",
                "ranking_direction": "desc",
                "ranking_period": "monthly",
                "update_frequency_minutes": 30,
                "max_displayed_positions": 50,
                "is_public": True,
                "sfb_principle": "revenue_optimization",
                "coaching_insight": "Revenue leaders master premium positioning and client value creation",
                "motivation_message": "Focus on value delivery to maximize your monthly revenue!"
            },
            {
                "name": "client_satisfaction",
                "title": "Client Satisfaction Champions",
                "description": "Barbers with the highest client satisfaction scores",
                "leaderboard_type": LeaderboardType.CLIENT_SATISFACTION,
                "ranking_metric": "avg_satisfaction",
                "ranking_direction": "desc",
                "ranking_period": "last_90_days",
                "update_frequency_minutes": 120,
                "max_displayed_positions": 50,
                "is_public": True,
                "sfb_principle": "service_delivery_excellence",
                "coaching_insight": "Client satisfaction leaders excel at relationship building and service quality",
                "motivation_message": "Happy clients are the foundation of Six Figure success!"
            },
            {
                "name": "efficiency_masters",
                "title": "Efficiency Masters",
                "description": "Most efficient barbers by utilization and performance metrics",
                "leaderboard_type": LeaderboardType.EFFICIENCY_SCORE,
                "ranking_metric": "efficiency_score",
                "ranking_direction": "desc",
                "ranking_period": "last_30_days",
                "update_frequency_minutes": 60,
                "max_displayed_positions": 50,
                "is_public": True,
                "sfb_principle": "business_efficiency",
                "coaching_insight": "Efficiency masters optimize their time and maximize productivity",
                "motivation_message": "Work smarter, not harder - efficiency drives profitability!"
            },
            {
                "name": "achievement_collectors",
                "title": "Achievement Collectors",
                "description": "Barbers with the most achievements unlocked",
                "leaderboard_type": LeaderboardType.ACHIEVEMENT_COUNT,
                "ranking_metric": "achievement_count",
                "ranking_direction": "desc",
                "ranking_period": "all_time",
                "update_frequency_minutes": 180,
                "max_displayed_positions": 100,
                "is_public": True,
                "sfb_principle": "professional_growth",
                "coaching_insight": "Achievement collectors demonstrate well-rounded excellence across all areas",
                "motivation_message": "Challenge yourself to unlock every achievement!"
            },
            {
                "name": "streak_champions",
                "title": "Streak Champions",
                "description": "Longest consistency streaks in performance and engagement",
                "leaderboard_type": LeaderboardType.STREAK_CHAMPION,
                "ranking_metric": "longest_streak",
                "ranking_direction": "desc",
                "ranking_period": "all_time",
                "update_frequency_minutes": 240,
                "max_displayed_positions": 25,
                "is_public": True,
                "sfb_principle": "business_efficiency",
                "coaching_insight": "Consistency is the hallmark of professional excellence",
                "motivation_message": "Build momentum through consistent daily action!"
            }
        ]
        
        try:
            for leaderboard_data in default_leaderboards:
                try:
                    # Check if leaderboard already exists
                    existing = self.db.query(Leaderboard).filter(
                        Leaderboard.name == leaderboard_data["name"]
                    ).first()
                    
                    if existing:
                        # Update existing leaderboard
                        for key, value in leaderboard_data.items():
                            if key != "name" and hasattr(existing, key):
                                setattr(existing, key, value)
                        existing.updated_at = utcnow()
                        results["updated"] += 1
                        logger.debug(f"Updated leaderboard: {leaderboard_data['name']}")
                    else:
                        # Create new leaderboard
                        leaderboard = Leaderboard(**leaderboard_data)
                        leaderboard.next_update_at = utcnow() + timedelta(minutes=leaderboard.update_frequency_minutes)
                        self.db.add(leaderboard)
                        results["created"] += 1
                        logger.debug(f"Created leaderboard: {leaderboard_data['name']}")
                        
                except Exception as e:
                    logger.error(f"Error processing leaderboard {leaderboard_data.get('name', 'unknown')}: {e}")
                    results["errors"] += 1
            
            logger.info(f"Leaderboard initialization: {results['created']} created, {results['updated']} updated, {results['errors']} errors")
            
        except Exception as e:
            logger.error(f"Error in leaderboard initialization: {e}")
            results["errors"] += 1
        
        return results
    
    def initialize_xp_profiles(self) -> dict:
        """
        Initialize XP profiles for all existing users who don't have one.
        """
        results = {
            "created": 0,
            "existing": 0,
            "errors": 0
        }
        
        try:
            # Get all active users
            users = self.db.query(User).filter(User.is_active == True).all()
            
            for user in users:
                try:
                    # Check if user already has XP profile
                    existing_profile = self.db.query(UserXPProfile).filter(
                        UserXPProfile.user_id == user.id
                    ).first()
                    
                    if not existing_profile:
                        # Create new XP profile
                        xp_profile = UserXPProfile(
                            user_id=user.id,
                            total_xp=0,
                            current_level=1,
                            xp_in_current_level=0,
                            xp_needed_for_next_level=100,
                            level_progress_percentage=0.0,
                            current_xp_multiplier=1.0,
                            streak_bonus_multiplier=1.0,
                            tier_bonus_multiplier=1.0,
                            premium_bonus_multiplier=1.0
                        )
                        self.db.add(xp_profile)
                        results["created"] += 1
                        logger.debug(f"Created XP profile for user {user.id}")
                    else:
                        results["existing"] += 1
                        
                except Exception as e:
                    logger.error(f"Error creating XP profile for user {user.id}: {e}")
                    results["errors"] += 1
            
            logger.info(f"XP profile initialization: {results['created']} created, {results['existing']} existing, {results['errors']} errors")
            
        except Exception as e:
            logger.error(f"Error in XP profile initialization: {e}")
            results["errors"] += 1
        
        return results
    
    def create_starter_challenges(self) -> dict:
        """
        Create some starter challenges to engage users.
        """
        results = {
            "created": 0,
            "updated": 0,
            "errors": 0
        }
        
        now = utcnow()
        
        starter_challenges = [
            {
                "name": "welcome_challenge",
                "title": "Welcome to Six Figure Barber",
                "description": "Complete your first week with the platform by booking 5 appointments and maintaining a 4.5+ satisfaction score.",
                "challenge_type": ChallengeType.WEEKLY,
                "category": AchievementCategory.GROWTH_CHAMPION,
                "start_date": now,
                "end_date": now + timedelta(days=7),
                "objective": {
                    "type": "multi_goal",
                    "goals": [
                        {"type": "appointment_count", "count": 5},
                        {"type": "satisfaction_minimum", "score": 4.5}
                    ]
                },
                "target_value": 100.0,
                "measurement_criteria": {
                    "appointments_weight": 0.7,
                    "satisfaction_weight": 0.3
                },
                "difficulty_level": "easy",
                "is_team_challenge": False,
                "completion_rewards": {
                    "xp": 200,
                    "achievements": ["welcome_champion"],
                    "title": "Platform Explorer"
                },
                "sfb_principle": "professional_growth",
                "business_development_focus": "Platform adoption and engagement",
                "coaching_value": "Establishes foundation habits for success on the platform"
            },
            {
                "name": "revenue_booster_monthly",
                "title": "Monthly Revenue Booster",
                "description": "Increase your monthly revenue by 20% compared to your last month average.",
                "challenge_type": ChallengeType.MONTHLY,
                "category": AchievementCategory.REVENUE_MASTERY,
                "start_date": now.replace(day=1),  # Start of current month
                "end_date": (now.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1),  # End of current month
                "objective": {
                    "type": "revenue_growth",
                    "growth_percentage": 20
                },
                "target_value": 120.0,  # 120% of baseline
                "measurement_criteria": {
                    "baseline_period": "last_month",
                    "growth_calculation": "percentage"
                },
                "difficulty_level": "medium",
                "completion_rewards": {
                    "xp": 500,
                    "achievements": ["revenue_booster"],
                    "bonus_multiplier": 1.1
                },
                "sfb_principle": "revenue_optimization",
                "business_development_focus": "Revenue growth and optimization",
                "coaching_value": "Drives focus on value-based pricing and service excellence"
            },
            {
                "name": "client_satisfaction_excellence",
                "title": "Client Satisfaction Excellence",
                "description": "Achieve and maintain a 4.8+ average client satisfaction score for 30 days.",
                "challenge_type": ChallengeType.MONTHLY,
                "category": AchievementCategory.CLIENT_EXCELLENCE,
                "start_date": now,
                "end_date": now + timedelta(days=30),
                "objective": {
                    "type": "client_satisfaction",
                    "score": 4.8,
                    "minimum_services": 20
                },
                "target_value": 4.8,
                "measurement_criteria": {
                    "rolling_average": True,
                    "minimum_sample_size": 20
                },
                "difficulty_level": "hard",
                "completion_rewards": {
                    "xp": 750,
                    "achievements": ["satisfaction_master"],
                    "title": "Client Champion"
                },
                "sfb_principle": "client_value_maximization",
                "business_development_focus": "Service excellence and client relationships",
                "coaching_value": "Emphasizes the importance of exceptional service delivery"
            }
        ]
        
        try:
            for challenge_data in starter_challenges:
                try:
                    # Check if challenge already exists
                    existing = self.db.query(GamificationChallenge).filter(
                        GamificationChallenge.name == challenge_data["name"]
                    ).first()
                    
                    if existing:
                        # Update existing challenge if not started yet
                        if existing.start_date > now:
                            for key, value in challenge_data.items():
                                if key != "name" and hasattr(existing, key):
                                    setattr(existing, key, value)
                            existing.updated_at = utcnow()
                            results["updated"] += 1
                            logger.debug(f"Updated challenge: {challenge_data['name']}")
                    else:
                        # Create new challenge
                        challenge = GamificationChallenge(**challenge_data)
                        self.db.add(challenge)
                        results["created"] += 1
                        logger.debug(f"Created challenge: {challenge_data['name']}")
                        
                except Exception as e:
                    logger.error(f"Error processing challenge {challenge_data.get('name', 'unknown')}: {e}")
                    results["errors"] += 1
            
            logger.info(f"Challenge initialization: {results['created']} created, {results['updated']} updated, {results['errors']} errors")
            
        except Exception as e:
            logger.error(f"Error in challenge initialization: {e}")
            results["errors"] += 1
        
        return results
    
    def verify_initialization(self) -> dict:
        """
        Verify that the gamification system was initialized correctly.
        """
        verification = {
            "achievements_count": 0,
            "leaderboards_count": 0,
            "xp_profiles_count": 0,
            "challenges_count": 0,
            "active_users_count": 0,
            "all_checks_passed": False
        }
        
        try:
            # Count achievements
            verification["achievements_count"] = self.db.query(AchievementDefinition).filter(
                AchievementDefinition.is_active == True
            ).count()
            
            # Count leaderboards
            verification["leaderboards_count"] = self.db.query(Leaderboard).filter(
                Leaderboard.is_active == True
            ).count()
            
            # Count XP profiles
            verification["xp_profiles_count"] = self.db.query(UserXPProfile).count()
            
            # Count active challenges
            verification["challenges_count"] = self.db.query(GamificationChallenge).filter(
                GamificationChallenge.is_active == True
            ).count()
            
            # Count active users
            verification["active_users_count"] = self.db.query(User).filter(
                User.is_active == True
            ).count()
            
            # Check if all components are properly initialized
            verification["all_checks_passed"] = all([
                verification["achievements_count"] >= 20,  # At least 20 achievements
                verification["leaderboards_count"] >= 5,   # At least 5 leaderboards
                verification["xp_profiles_count"] >= verification["active_users_count"],  # XP profile for each user
                verification["challenges_count"] >= 2      # At least 2 challenges
            ])
            
            logger.info(f"Verification results: {verification}")
            
        except Exception as e:
            logger.error(f"Error during verification: {e}")
            verification["error"] = str(e)
        
        return verification


def main():
    """
    Main function to run the gamification initialization.
    """
    print("🎮 BookedBarber V2 Gamification System Initialization")
    print("=" * 60)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Initialize the gamification system
        initializer = GamificationInitializer(db)
        
        # Run initialization
        results = initializer.initialize_all()
        
        # Print results
        print("\n📊 Initialization Results:")
        print("-" * 30)
        
        if results["success"]:
            print("✅ Initialization completed successfully!")
            
            print(f"\n🏆 Achievements:")
            print(f"  • Created: {results['achievements']['created']}")
            print(f"  • Updated: {results['achievements']['updated']}")
            print(f"  • Errors: {results['achievements']['errors']}")
            
            print(f"\n📊 Leaderboards:")
            print(f"  • Created: {results['leaderboards']['created']}")
            print(f"  • Updated: {results['leaderboards']['updated']}")
            print(f"  • Errors: {results['leaderboards']['errors']}")
            
            print(f"\n⚡ XP Profiles:")
            print(f"  • Created: {results['xp_profiles']['created']}")
            print(f"  • Existing: {results['xp_profiles']['existing']}")
            print(f"  • Errors: {results['xp_profiles']['errors']}")
            
            print(f"\n🎯 Challenges:")
            print(f"  • Created: {results['challenges']['created']}")
            print(f"  • Updated: {results['challenges']['updated']}")
            print(f"  • Errors: {results['challenges']['errors']}")
            
            # Run verification
            print("\n🔍 Running verification...")
            verification = initializer.verify_initialization()
            
            if verification["all_checks_passed"]:
                print("✅ All verification checks passed!")
            else:
                print("⚠️  Some verification checks failed:")
                
            print(f"  • Achievements: {verification['achievements_count']}")
            print(f"  • Leaderboards: {verification['leaderboards_count']}")
            print(f"  • XP Profiles: {verification['xp_profiles_count']}")
            print(f"  • Challenges: {verification['challenges_count']}")
            print(f"  • Active Users: {verification['active_users_count']}")
            
        else:
            print("❌ Initialization failed!")
            print(f"Errors: {results['errors']}")
        
        print("\n🎉 Gamification system is ready!")
        print("Users can now start earning XP, unlocking achievements, and competing on leaderboards!")
        
    except Exception as e:
        logger.error(f"Fatal error during initialization: {e}")
        print(f"❌ Fatal error: {e}")
        return 1
    
    finally:
        db.close()
    
    return 0


if __name__ == "__main__":
    exit(main())