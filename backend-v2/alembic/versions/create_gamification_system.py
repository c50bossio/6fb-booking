"""Create gamification system tables

Revision ID: create_gamification_system
Revises: aa1702ed4855
Create Date: 2025-01-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers
revision = 'create_gamification_system'
down_revision = 'aa1702ed4855'
branch_labels = None
depends_on = None


def upgrade():
    """Create gamification system tables"""
    
    # Create enum types
    op.execute(text("""
        CREATE TYPE achievementcategory AS ENUM (
            'revenue_mastery', 'client_excellence', 'efficiency_expert', 
            'growth_champion', 'service_mastery', 'brand_builder', 
            'innovation_leader', 'community_leader', 'consistency_king', 
            'premium_positioning'
        )
    """))
    
    op.execute(text("""
        CREATE TYPE achievementrarity AS ENUM (
            'common', 'uncommon', 'rare', 'epic', 'legendary'
        )
    """))
    
    op.execute(text("""
        CREATE TYPE achievementtype AS ENUM (
            'milestone', 'progressive', 'streak', 'competitive', 'seasonal', 'special'
        )
    """))
    
    op.execute(text("""
        CREATE TYPE xpsource AS ENUM (
            'appointment_completion', 'revenue_milestone', 'client_satisfaction',
            'tier_advancement', 'achievement_unlock', 'streak_maintenance',
            'efficiency_improvement', 'skill_development', 'client_retention',
            'upsell_success', 'referral_generation', 'professional_milestone'
        )
    """))
    
    op.execute(text("""
        CREATE TYPE notificationtype AS ENUM (
            'achievement_unlocked', 'level_up', 'milestone_reached', 'streak_bonus',
            'leaderboard_position', 'challenge_complete', 'tier_promotion', 'badge_earned'
        )
    """))
    
    op.execute(text("""
        CREATE TYPE challengetype AS ENUM (
            'daily', 'weekly', 'monthly', 'seasonal', 'milestone', 'community'
        )
    """))
    
    op.execute(text("""
        CREATE TYPE leaderboardtype AS ENUM (
            'overall_xp', 'monthly_revenue', 'client_satisfaction', 'efficiency_score',
            'achievement_count', 'streak_champion', 'growth_rate', 'tier_advancement'
        )
    """))
    
    # Create achievement_definitions table
    op.create_table('achievement_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', postgresql.ENUM('revenue_mastery', 'client_excellence', 'efficiency_expert', 'growth_champion', 'service_mastery', 'brand_builder', 'innovation_leader', 'community_leader', 'consistency_king', 'premium_positioning', name='achievementcategory'), nullable=False),
        sa.Column('rarity', postgresql.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary', name='achievementrarity'), nullable=False),
        sa.Column('achievement_type', postgresql.ENUM('milestone', 'progressive', 'streak', 'competitive', 'seasonal', 'special', name='achievementtype'), nullable=False),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('badge_design', sa.JSON(), nullable=True),
        sa.Column('color_scheme', sa.JSON(), nullable=True),
        sa.Column('requirements', sa.JSON(), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=True),
        sa.Column('measurement_criteria', sa.JSON(), nullable=True),
        sa.Column('sfb_principle', sa.String(), nullable=True),
        sa.Column('business_impact', sa.Text(), nullable=True),
        sa.Column('coaching_insight', sa.Text(), nullable=True),
        sa.Column('xp_reward', sa.Integer(), default=0),
        sa.Column('tier_boost_value', sa.Float(), default=0),
        sa.Column('special_rewards', sa.JSON(), nullable=True),
        sa.Column('prerequisite_achievements', sa.JSON(), nullable=True),
        sa.Column('next_level_achievement_id', sa.Integer(), nullable=True),
        sa.Column('progression_series', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_visible', sa.Boolean(), default=True),
        sa.Column('release_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('total_unlocks', sa.Integer(), default=0),
        sa.Column('completion_rate', sa.Float(), default=0),
        sa.Column('average_time_to_complete_days', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.ForeignKeyConstraint(['next_level_achievement_id'], ['achievement_definitions.id'], ),
    )
    op.create_index('idx_achievement_category_rarity', 'achievement_definitions', ['category', 'rarity'])
    op.create_index('idx_achievement_active_visible', 'achievement_definitions', ['is_active', 'is_visible'])
    op.create_index(op.f('ix_achievement_definitions_id'), 'achievement_definitions', ['id'])

    # Create user_achievements table
    op.create_table('user_achievements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('achievement_id', sa.Integer(), nullable=False),
        sa.Column('current_progress', sa.Float(), default=0),
        sa.Column('target_progress', sa.Float(), nullable=True),
        sa.Column('progress_percentage', sa.Float(), default=0),
        sa.Column('is_unlocked', sa.Boolean(), default=False),
        sa.Column('unlocked_at', sa.DateTime(), nullable=True),
        sa.Column('is_notified', sa.Boolean(), default=False),
        sa.Column('unlock_context', sa.JSON(), nullable=True),
        sa.Column('progress_history', sa.JSON(), nullable=True),
        sa.Column('milestone_snapshots', sa.JSON(), nullable=True),
        sa.Column('is_featured', sa.Boolean(), default=False),
        sa.Column('is_shared', sa.Boolean(), default=False),
        sa.Column('sharing_platforms', sa.JSON(), nullable=True),
        sa.Column('xp_awarded', sa.Integer(), default=0),
        sa.Column('xp_claimed_at', sa.DateTime(), nullable=True),
        sa.Column('rewards_claimed', sa.JSON(), nullable=True),
        sa.Column('first_progress_at', sa.DateTime(), nullable=True),
        sa.Column('last_progress_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['achievement_id'], ['achievement_definitions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )
    op.create_index('idx_user_achievement_user_unlocked', 'user_achievements', ['user_id', 'is_unlocked'])
    op.create_index('idx_user_achievement_unlocked_at', 'user_achievements', ['unlocked_at'])
    op.create_index(op.f('ix_user_achievements_achievement_id'), 'user_achievements', ['achievement_id'])
    op.create_index(op.f('ix_user_achievements_id'), 'user_achievements', ['id'])
    op.create_index(op.f('ix_user_achievements_user_id'), 'user_achievements', ['user_id'])

    # Create user_xp_profiles table
    op.create_table('user_xp_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_xp', sa.Integer(), default=0),
        sa.Column('current_level', sa.Integer(), default=1),
        sa.Column('xp_in_current_level', sa.Integer(), default=0),
        sa.Column('xp_needed_for_next_level', sa.Integer(), default=100),
        sa.Column('level_progress_percentage', sa.Float(), default=0),
        sa.Column('total_levels_gained', sa.Integer(), default=0),
        sa.Column('highest_level_achieved', sa.Integer(), default=1),
        sa.Column('xp_from_appointments', sa.Integer(), default=0),
        sa.Column('xp_from_achievements', sa.Integer(), default=0),
        sa.Column('xp_from_milestones', sa.Integer(), default=0),
        sa.Column('xp_from_streaks', sa.Integer(), default=0),
        sa.Column('xp_from_efficiency', sa.Integer(), default=0),
        sa.Column('xp_from_client_satisfaction', sa.Integer(), default=0),
        sa.Column('current_xp_multiplier', sa.Float(), default=1.0),
        sa.Column('streak_bonus_multiplier', sa.Float(), default=1.0),
        sa.Column('tier_bonus_multiplier', sa.Float(), default=1.0),
        sa.Column('premium_bonus_multiplier', sa.Float(), default=1.0),
        sa.Column('daily_xp_earned', sa.Integer(), default=0),
        sa.Column('weekly_xp_earned', sa.Integer(), default=0),
        sa.Column('monthly_xp_earned', sa.Integer(), default=0),
        sa.Column('last_xp_earned_at', sa.DateTime(), nullable=True),
        sa.Column('xp_milestones_reached', sa.JSON(), nullable=True),
        sa.Column('level_rewards_claimed', sa.JSON(), nullable=True),
        sa.Column('next_major_milestone', sa.Integer(), nullable=True),
        sa.Column('global_rank', sa.Integer(), nullable=True),
        sa.Column('regional_rank', sa.Integer(), nullable=True),
        sa.Column('tier_rank', sa.Integer(), nullable=True),
        sa.Column('last_rank_update', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )
    op.create_index('idx_xp_total_level', 'user_xp_profiles', ['total_xp', 'current_level'])
    op.create_index('idx_xp_daily_weekly', 'user_xp_profiles', ['daily_xp_earned', 'weekly_xp_earned'])
    op.create_index(op.f('ix_user_xp_profiles_id'), 'user_xp_profiles', ['id'])
    op.create_index(op.f('ix_user_xp_profiles_user_id'), 'user_xp_profiles', ['user_id'])

    # Create xp_transactions table
    op.create_table('xp_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('user_xp_profile_id', sa.Integer(), nullable=False),
        sa.Column('xp_amount', sa.Integer(), nullable=False),
        sa.Column('xp_source', postgresql.ENUM('appointment_completion', 'revenue_milestone', 'client_satisfaction', 'tier_advancement', 'achievement_unlock', 'streak_maintenance', 'efficiency_improvement', 'skill_development', 'client_retention', 'upsell_success', 'referral_generation', 'professional_milestone', name='xpsource'), nullable=False),
        sa.Column('source_description', sa.String(), nullable=True),
        sa.Column('related_achievement_id', sa.Integer(), nullable=True),
        sa.Column('related_appointment_id', sa.Integer(), nullable=True),
        sa.Column('related_metric_value', sa.Float(), nullable=True),
        sa.Column('base_xp', sa.Integer(), nullable=False),
        sa.Column('multiplier_applied', sa.Float(), default=1.0),
        sa.Column('bonus_reason', sa.String(), nullable=True),
        sa.Column('level_before', sa.Integer(), nullable=True),
        sa.Column('level_after', sa.Integer(), nullable=True),
        sa.Column('caused_level_up', sa.Boolean(), default=False),
        sa.Column('transaction_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['achievement_id'], ['achievement_definitions.id'], ),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_xp_profile_id'], ['user_xp_profiles.id'], ),
    )
    op.create_index('idx_xp_transaction_user_date', 'xp_transactions', ['user_id', 'transaction_date'])
    op.create_index('idx_xp_transaction_source', 'xp_transactions', ['xp_source', 'transaction_date'])
    op.create_index(op.f('ix_xp_transactions_id'), 'xp_transactions', ['id'])
    op.create_index(op.f('ix_xp_transactions_user_id'), 'xp_transactions', ['user_id'])

    # Create gamification_challenges table
    op.create_table('gamification_challenges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('challenge_type', postgresql.ENUM('daily', 'weekly', 'monthly', 'seasonal', 'milestone', 'community', name='challengetype'), nullable=False),
        sa.Column('category', postgresql.ENUM('revenue_mastery', 'client_excellence', 'efficiency_expert', 'growth_champion', 'service_mastery', 'brand_builder', 'innovation_leader', 'community_leader', 'consistency_king', 'premium_positioning', name='achievementcategory'), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('registration_deadline', sa.DateTime(), nullable=True),
        sa.Column('objective', sa.JSON(), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=True),
        sa.Column('measurement_criteria', sa.JSON(), nullable=False),
        sa.Column('difficulty_level', sa.String(), default='medium'),
        sa.Column('max_participants', sa.Integer(), nullable=True),
        sa.Column('current_participants', sa.Integer(), default=0),
        sa.Column('is_team_challenge', sa.Boolean(), default=False),
        sa.Column('team_size_limit', sa.Integer(), nullable=True),
        sa.Column('completion_rewards', sa.JSON(), nullable=True),
        sa.Column('ranking_rewards', sa.JSON(), nullable=True),
        sa.Column('participation_rewards', sa.JSON(), nullable=True),
        sa.Column('sfb_principle', sa.String(), nullable=True),
        sa.Column('business_development_focus', sa.String(), nullable=True),
        sa.Column('coaching_value', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_featured', sa.Boolean(), default=False),
        sa.Column('registration_required', sa.Boolean(), default=False),
        sa.Column('total_completions', sa.Integer(), default=0),
        sa.Column('completion_rate', sa.Float(), default=0),
        sa.Column('average_completion_time_hours', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_challenge_dates', 'gamification_challenges', ['start_date', 'end_date'])
    op.create_index('idx_challenge_type_active', 'gamification_challenges', ['challenge_type', 'is_active'])
    op.create_index(op.f('ix_gamification_challenges_id'), 'gamification_challenges', ['id'])

    # Create challenge_participations table
    op.create_table('challenge_participations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('challenge_id', sa.Integer(), nullable=False),
        sa.Column('registered_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('current_progress', sa.Float(), default=0),
        sa.Column('target_progress', sa.Float(), nullable=True),
        sa.Column('progress_percentage', sa.Float(), default=0),
        sa.Column('progress_history', sa.JSON(), nullable=True),
        sa.Column('final_score', sa.Float(), nullable=True),
        sa.Column('ranking_position', sa.Integer(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), default=False),
        sa.Column('completion_verified', sa.Boolean(), default=False),
        sa.Column('rewards_earned', sa.JSON(), nullable=True),
        sa.Column('xp_earned', sa.Integer(), default=0),
        sa.Column('achievements_unlocked', sa.JSON(), nullable=True),
        sa.Column('team_id', sa.String(), nullable=True),
        sa.Column('team_name', sa.String(), nullable=True),
        sa.Column('team_role', sa.String(), nullable=True),
        sa.Column('last_progress_update', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['challenge_id'], ['gamification_challenges.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )
    op.create_index('idx_participation_user_challenge', 'challenge_participations', ['user_id', 'challenge_id'])
    op.create_index('idx_participation_completed', 'challenge_participations', ['is_completed', 'completed_at'])
    op.create_index(op.f('ix_challenge_participations_challenge_id'), 'challenge_participations', ['challenge_id'])
    op.create_index(op.f('ix_challenge_participations_id'), 'challenge_participations', ['id'])
    op.create_index(op.f('ix_challenge_participations_user_id'), 'challenge_participations', ['user_id'])

    # Create leaderboards table
    op.create_table('leaderboards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('leaderboard_type', postgresql.ENUM('overall_xp', 'monthly_revenue', 'client_satisfaction', 'efficiency_score', 'achievement_count', 'streak_champion', 'growth_rate', 'tier_advancement', name='leaderboardtype'), nullable=False),
        sa.Column('scope', sa.String(), default='global'),
        sa.Column('filter_criteria', sa.JSON(), nullable=True),
        sa.Column('minimum_activity_threshold', sa.JSON(), nullable=True),
        sa.Column('ranking_metric', sa.String(), nullable=False),
        sa.Column('ranking_direction', sa.String(), default='desc'),
        sa.Column('ranking_period', sa.String(), default='all_time'),
        sa.Column('max_displayed_positions', sa.Integer(), default=100),
        sa.Column('update_frequency_minutes', sa.Integer(), default=60),
        sa.Column('last_updated', sa.DateTime(), nullable=True),
        sa.Column('next_update_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_public', sa.Boolean(), default=True),
        sa.Column('access_level', sa.String(), default='all'),
        sa.Column('sfb_principle', sa.String(), nullable=True),
        sa.Column('coaching_insight', sa.Text(), nullable=True),
        sa.Column('motivation_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('idx_leaderboard_type_active', 'leaderboards', ['leaderboard_type', 'is_active'])
    op.create_index('idx_leaderboard_update', 'leaderboards', ['next_update_at'])
    op.create_index(op.f('ix_leaderboards_id'), 'leaderboards', ['id'])

    # Create leaderboard_entries table
    op.create_table('leaderboard_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('leaderboard_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('current_position', sa.Integer(), nullable=False),
        sa.Column('previous_position', sa.Integer(), nullable=True),
        sa.Column('position_change', sa.Integer(), default=0),
        sa.Column('highest_position_ever', sa.Integer(), nullable=True),
        sa.Column('current_score', sa.Float(), nullable=False),
        sa.Column('previous_score', sa.Float(), nullable=True),
        sa.Column('score_change', sa.Float(), default=0),
        sa.Column('percentile_rank', sa.Float(), nullable=True),
        sa.Column('score_breakdown', sa.JSON(), nullable=True),
        sa.Column('contributing_factors', sa.JSON(), nullable=True),
        sa.Column('performance_trends', sa.JSON(), nullable=True),
        sa.Column('position_rewards_earned', sa.JSON(), nullable=True),
        sa.Column('milestone_rewards_earned', sa.JSON(), nullable=True),
        sa.Column('recognition_badges', sa.JSON(), nullable=True),
        sa.Column('entry_date', sa.DateTime(), nullable=True),
        sa.Column('last_score_update', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['leaderboard_id'], ['leaderboards.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )
    op.create_index('idx_leaderboard_entry_position', 'leaderboard_entries', ['leaderboard_id', 'current_position'])
    op.create_index('idx_leaderboard_entry_user', 'leaderboard_entries', ['user_id', 'current_position'])
    op.create_index('idx_leaderboard_entry_score', 'leaderboard_entries', ['current_score'])
    op.create_index(op.f('ix_leaderboard_entries_id'), 'leaderboard_entries', ['id'])
    op.create_index(op.f('ix_leaderboard_entries_leaderboard_id'), 'leaderboard_entries', ['leaderboard_id'])
    op.create_index(op.f('ix_leaderboard_entries_user_id'), 'leaderboard_entries', ['user_id'])

    # Create gamification_notifications table
    op.create_table('gamification_notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('notification_type', postgresql.ENUM('achievement_unlocked', 'level_up', 'milestone_reached', 'streak_bonus', 'leaderboard_position', 'challenge_complete', 'tier_promotion', 'badge_earned', name='notificationtype'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('related_achievement_id', sa.Integer(), nullable=True),
        sa.Column('related_challenge_id', sa.Integer(), nullable=True),
        sa.Column('related_xp_transaction_id', sa.Integer(), nullable=True),
        sa.Column('celebration_data', sa.JSON(), nullable=True),
        sa.Column('display_duration_seconds', sa.Integer(), default=5),
        sa.Column('priority_level', sa.String(), default='normal'),
        sa.Column('is_sent', sa.Boolean(), default=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('is_read', sa.Boolean(), default=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('is_dismissed', sa.Boolean(), default=False),
        sa.Column('dismissed_at', sa.DateTime(), nullable=True),
        sa.Column('show_in_app', sa.Boolean(), default=True),
        sa.Column('send_push_notification', sa.Boolean(), default=False),
        sa.Column('send_email', sa.Boolean(), default=False),
        sa.Column('click_count', sa.Integer(), default=0),
        sa.Column('first_click_at', sa.DateTime(), nullable=True),
        sa.Column('last_click_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['related_achievement_id'], ['achievement_definitions.id'], ),
        sa.ForeignKeyConstraint(['related_challenge_id'], ['gamification_challenges.id'], ),
        sa.ForeignKeyConstraint(['related_xp_transaction_id'], ['xp_transactions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )
    op.create_index('idx_notification_user_type', 'gamification_notifications', ['user_id', 'notification_type'])
    op.create_index('idx_notification_sent_read', 'gamification_notifications', ['is_sent', 'is_read'])
    op.create_index('idx_notification_expires', 'gamification_notifications', ['expires_at'])
    op.create_index(op.f('ix_gamification_notifications_id'), 'gamification_notifications', ['id'])
    op.create_index(op.f('ix_gamification_notifications_user_id'), 'gamification_notifications', ['user_id'])

    # Create gamification_analytics table
    op.create_table('gamification_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('analytics_date', sa.Date(), nullable=False),
        sa.Column('period_type', sa.String(), default='daily'),
        sa.Column('achievements_unlocked_count', sa.Integer(), default=0),
        sa.Column('total_xp_earned', sa.Integer(), default=0),
        sa.Column('challenges_participated', sa.Integer(), default=0),
        sa.Column('challenges_completed', sa.Integer(), default=0),
        sa.Column('level_progression', sa.Float(), default=0),
        sa.Column('tier_advancement_progress', sa.Float(), default=0),
        sa.Column('milestone_achievements', sa.Integer(), default=0),
        sa.Column('session_engagement_score', sa.Float(), default=0),
        sa.Column('feature_adoption_rate', sa.Float(), default=0),
        sa.Column('competitive_participation', sa.Float(), default=0),
        sa.Column('social_sharing_activity', sa.Integer(), default=0),
        sa.Column('revenue_correlation', sa.Float(), nullable=True),
        sa.Column('efficiency_correlation', sa.Float(), nullable=True),
        sa.Column('client_satisfaction_correlation', sa.Float(), nullable=True),
        sa.Column('retention_impact', sa.Float(), nullable=True),
        sa.Column('methodology_engagement_score', sa.Float(), default=0),
        sa.Column('principle_focus_distribution', sa.JSON(), nullable=True),
        sa.Column('coaching_goal_alignment', sa.Float(), default=0),
        sa.Column('achievement_category_breakdown', sa.JSON(), nullable=True),
        sa.Column('xp_source_breakdown', sa.JSON(), nullable=True),
        sa.Column('time_of_day_activity', sa.JSON(), nullable=True),
        sa.Column('device_usage_patterns', sa.JSON(), nullable=True),
        sa.Column('predicted_next_achievements', sa.JSON(), nullable=True),
        sa.Column('engagement_trend_prediction', sa.Float(), nullable=True),
        sa.Column('churn_risk_indicators', sa.JSON(), nullable=True),
        sa.Column('optimization_opportunities', sa.JSON(), nullable=True),
        sa.Column('calculated_at', sa.DateTime(), nullable=True),
        sa.Column('data_freshness_score', sa.Float(), default=100),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )
    op.create_index('idx_analytics_user_date', 'gamification_analytics', ['user_id', 'analytics_date'])
    op.create_index('idx_analytics_period_date', 'gamification_analytics', ['period_type', 'analytics_date'])
    op.create_index(op.f('ix_gamification_analytics_id'), 'gamification_analytics', ['id'])
    op.create_index(op.f('ix_gamification_analytics_user_id'), 'gamification_analytics', ['user_id'])


def downgrade():
    """Drop gamification system tables"""
    
    # Drop tables in reverse order
    op.drop_table('gamification_analytics')
    op.drop_table('gamification_notifications')
    op.drop_table('leaderboard_entries')
    op.drop_table('leaderboards')
    op.drop_table('challenge_participations')
    op.drop_table('gamification_challenges')
    op.drop_table('xp_transactions')
    op.drop_table('user_xp_profiles')
    op.drop_table('user_achievements')
    op.drop_table('achievement_definitions')
    
    # Drop enum types
    op.execute(text("DROP TYPE IF EXISTS leaderboardtype"))
    op.execute(text("DROP TYPE IF EXISTS challengetype"))
    op.execute(text("DROP TYPE IF EXISTS notificationtype"))
    op.execute(text("DROP TYPE IF EXISTS xpsource"))
    op.execute(text("DROP TYPE IF EXISTS achievementtype"))
    op.execute(text("DROP TYPE IF EXISTS achievementrarity"))
    op.execute(text("DROP TYPE IF EXISTS achievementcategory"))