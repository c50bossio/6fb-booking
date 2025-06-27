"""Add Local SEO management models

Revision ID: add_local_seo_models
Revises:
Create Date: 2025-06-27 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_local_seo_models"
down_revision = None  # Replace with the latest revision in your system
branch_labels = None
depends_on = None


def upgrade():
    # Google Business Profiles table
    op.create_table(
        "google_business_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("google_place_id", sa.String(length=255), nullable=True),
        sa.Column("business_name", sa.String(length=255), nullable=False),
        sa.Column("business_description", sa.Text(), nullable=True),
        sa.Column("business_phone", sa.String(length=50), nullable=True),
        sa.Column("business_website", sa.String(length=255), nullable=True),
        sa.Column("business_address", sa.Text(), nullable=True),
        sa.Column("business_city", sa.String(length=100), nullable=True),
        sa.Column("business_state", sa.String(length=50), nullable=True),
        sa.Column("business_zip", sa.String(length=20), nullable=True),
        sa.Column("business_country", sa.String(length=50), nullable=True),
        sa.Column("primary_category", sa.String(length=100), nullable=True),
        sa.Column("secondary_categories", sa.JSON(), nullable=True),
        sa.Column("business_hours", sa.JSON(), nullable=True),
        sa.Column("special_hours", sa.JSON(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=True),
        sa.Column("verification_method", sa.String(length=50), nullable=True),
        sa.Column("verification_date", sa.DateTime(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=True),
        sa.Column("total_reviews", sa.Integer(), nullable=True),
        sa.Column("average_rating", sa.Float(), nullable=True),
        sa.Column("monthly_views", sa.Integer(), nullable=True),
        sa.Column("monthly_searches", sa.Integer(), nullable=True),
        sa.Column("monthly_calls", sa.Integer(), nullable=True),
        sa.Column("monthly_directions", sa.Integer(), nullable=True),
        sa.Column("profile_photo_url", sa.String(length=500), nullable=True),
        sa.Column("cover_photo_url", sa.String(length=500), nullable=True),
        sa.Column("additional_photos", sa.JSON(), nullable=True),
        sa.Column("google_access_token", sa.Text(), nullable=True),
        sa.Column("google_refresh_token", sa.Text(), nullable=True),
        sa.Column("api_last_sync", sa.DateTime(), nullable=True),
        sa.Column("api_sync_errors", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("google_place_id"),
    )
    op.create_index(
        op.f("ix_google_business_profiles_google_place_id"),
        "google_business_profiles",
        ["google_place_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_google_business_profiles_id"),
        "google_business_profiles",
        ["id"],
        unique=False,
    )

    # SEO Optimizations table
    op.create_table(
        "seo_optimizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("google_profile_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("optimization_category", sa.String(length=100), nullable=False),
        sa.Column("optimization_item", sa.String(length=255), nullable=False),
        sa.Column("optimization_description", sa.Text(), nullable=True),
        sa.Column("optimization_priority", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING",
                "IN_PROGRESS",
                "COMPLETED",
                "NEEDS_ATTENTION",
                name="optimizationstatus",
            ),
            nullable=True,
        ),
        sa.Column("completion_percentage", sa.Integer(), nullable=True),
        sa.Column("impact_score", sa.Integer(), nullable=True),
        sa.Column("difficulty_score", sa.Integer(), nullable=True),
        sa.Column("estimated_time_hours", sa.Float(), nullable=True),
        sa.Column("implementation_steps", sa.JSON(), nullable=True),
        sa.Column("helpful_resources", sa.JSON(), nullable=True),
        sa.Column("started_date", sa.DateTime(), nullable=True),
        sa.Column("completed_date", sa.DateTime(), nullable=True),
        sa.Column("last_checked_date", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["google_profile_id"],
            ["google_business_profiles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_seo_optimizations_id"), "seo_optimizations", ["id"], unique=False
    )

    # Keyword Rankings table
    op.create_table(
        "keyword_rankings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("google_profile_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("keyword", sa.String(length=255), nullable=False),
        sa.Column(
            "keyword_difficulty",
            sa.Enum("EASY", "MEDIUM", "HARD", "VERY_HARD", name="keyworddifficulty"),
            nullable=True,
        ),
        sa.Column("monthly_search_volume", sa.Integer(), nullable=True),
        sa.Column("competition_level", sa.Float(), nullable=True),
        sa.Column("current_rank", sa.Integer(), nullable=True),
        sa.Column("previous_rank", sa.Integer(), nullable=True),
        sa.Column("best_rank", sa.Integer(), nullable=True),
        sa.Column("worst_rank", sa.Integer(), nullable=True),
        sa.Column("is_target_keyword", sa.Boolean(), nullable=True),
        sa.Column("tracking_start_date", sa.Date(), nullable=True),
        sa.Column("last_checked_date", sa.Date(), nullable=True),
        sa.Column("check_frequency_days", sa.Integer(), nullable=True),
        sa.Column("device_type", sa.String(length=20), nullable=True),
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("location_state", sa.String(length=50), nullable=True),
        sa.Column("average_rank_30days", sa.Float(), nullable=True),
        sa.Column("rank_change_30days", sa.Integer(), nullable=True),
        sa.Column("visibility_score", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["google_profile_id"],
            ["google_business_profiles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_keyword_rankings_id"), "keyword_rankings", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_keyword_rankings_keyword"),
        "keyword_rankings",
        ["keyword"],
        unique=False,
    )

    # Keyword Ranking History table
    op.create_table(
        "keyword_ranking_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("keyword_ranking_id", sa.Integer(), nullable=False),
        sa.Column("check_date", sa.Date(), nullable=False),
        sa.Column("rank_position", sa.Integer(), nullable=True),
        sa.Column("search_volume", sa.Integer(), nullable=True),
        sa.Column("competition_score", sa.Float(), nullable=True),
        sa.Column("search_engine", sa.String(length=20), nullable=True),
        sa.Column("device_type", sa.String(length=20), nullable=True),
        sa.Column("location_identifier", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(
            ["keyword_ranking_id"],
            ["keyword_rankings.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_keyword_ranking_history_check_date"),
        "keyword_ranking_history",
        ["check_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_keyword_ranking_history_id"),
        "keyword_ranking_history",
        ["id"],
        unique=False,
    )

    # Business Citations table
    op.create_table(
        "business_citations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("google_profile_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("directory_name", sa.String(length=100), nullable=False),
        sa.Column("directory_url", sa.String(length=500), nullable=True),
        sa.Column("directory_authority_score", sa.Integer(), nullable=True),
        sa.Column("directory_category", sa.String(length=100), nullable=True),
        sa.Column("listing_url", sa.String(length=500), nullable=True),
        sa.Column("business_name_listed", sa.String(length=255), nullable=True),
        sa.Column("phone_listed", sa.String(length=50), nullable=True),
        sa.Column("address_listed", sa.Text(), nullable=True),
        sa.Column("website_listed", sa.String(length=255), nullable=True),
        sa.Column(
            "citation_status",
            sa.Enum(
                "VERIFIED",
                "UNVERIFIED",
                "INCONSISTENT",
                "MISSING",
                name="citationstatus",
            ),
            nullable=True,
        ),
        sa.Column("accuracy_score", sa.Float(), nullable=True),
        sa.Column("inconsistencies_found", sa.JSON(), nullable=True),
        sa.Column("last_verified_date", sa.Date(), nullable=True),
        sa.Column("verification_notes", sa.Text(), nullable=True),
        sa.Column("is_claimed", sa.Boolean(), nullable=True),
        sa.Column("claim_url", sa.String(length=500), nullable=True),
        sa.Column("submission_priority", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["google_profile_id"],
            ["google_business_profiles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_business_citations_id"), "business_citations", ["id"], unique=False
    )

    # Review Management table
    op.create_table(
        "review_management",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("google_profile_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "platform",
            sa.Enum(
                "GOOGLE",
                "YELP",
                "FACEBOOK",
                "FOURSQUARE",
                "YELLOW_PAGES",
                name="reviewplatform",
            ),
            nullable=False,
        ),
        sa.Column("review_id", sa.String(length=255), nullable=False),
        sa.Column("reviewer_name", sa.String(length=255), nullable=True),
        sa.Column("reviewer_profile_url", sa.String(length=500), nullable=True),
        sa.Column("review_text", sa.Text(), nullable=True),
        sa.Column("review_rating", sa.Float(), nullable=True),
        sa.Column("review_date", sa.DateTime(), nullable=True),
        sa.Column("business_response", sa.Text(), nullable=True),
        sa.Column("response_date", sa.DateTime(), nullable=True),
        sa.Column("response_author", sa.String(length=255), nullable=True),
        sa.Column("needs_response", sa.Boolean(), nullable=True),
        sa.Column("response_priority", sa.Integer(), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("sentiment_keywords", sa.JSON(), nullable=True),
        sa.Column("review_categories", sa.JSON(), nullable=True),
        sa.Column("is_flagged", sa.Boolean(), nullable=True),
        sa.Column("flagged_reason", sa.String(length=255), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("follow_up_required", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["google_profile_id"],
            ["google_business_profiles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_review_management_id"), "review_management", ["id"], unique=False
    )

    # SEO Analytics table
    op.create_table(
        "seo_analytics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("google_profile_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("analytics_date", sa.Date(), nullable=False),
        sa.Column("period_type", sa.String(length=20), nullable=True),
        sa.Column("total_impressions", sa.Integer(), nullable=True),
        sa.Column("total_clicks", sa.Integer(), nullable=True),
        sa.Column("average_ctr", sa.Float(), nullable=True),
        sa.Column("average_position", sa.Float(), nullable=True),
        sa.Column("local_pack_impressions", sa.Integer(), nullable=True),
        sa.Column("local_pack_clicks", sa.Integer(), nullable=True),
        sa.Column("local_pack_position", sa.Float(), nullable=True),
        sa.Column("profile_views", sa.Integer(), nullable=True),
        sa.Column("profile_searches", sa.Integer(), nullable=True),
        sa.Column("profile_calls", sa.Integer(), nullable=True),
        sa.Column("profile_directions", sa.Integer(), nullable=True),
        sa.Column("profile_website_clicks", sa.Integer(), nullable=True),
        sa.Column("new_reviews_count", sa.Integer(), nullable=True),
        sa.Column("total_reviews", sa.Integer(), nullable=True),
        sa.Column("average_rating", sa.Float(), nullable=True),
        sa.Column("review_response_rate", sa.Float(), nullable=True),
        sa.Column("competitor_visibility_score", sa.Float(), nullable=True),
        sa.Column("market_share_percentage", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["google_profile_id"],
            ["google_business_profiles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_seo_analytics_analytics_date"),
        "seo_analytics",
        ["analytics_date"],
        unique=False,
    )
    op.create_index(op.f("ix_seo_analytics_id"), "seo_analytics", ["id"], unique=False)

    # Schema Markup table
    op.create_table(
        "schema_markup",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("google_profile_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("schema_type", sa.String(length=100), nullable=False),
        sa.Column("page_url", sa.String(length=500), nullable=False),
        sa.Column("schema_json", sa.JSON(), nullable=False),
        sa.Column("is_valid", sa.Boolean(), nullable=True),
        sa.Column("validation_errors", sa.JSON(), nullable=True),
        sa.Column("last_validated", sa.DateTime(), nullable=True),
        sa.Column("is_implemented", sa.Boolean(), nullable=True),
        sa.Column("implementation_method", sa.String(length=50), nullable=True),
        sa.Column("implementation_date", sa.DateTime(), nullable=True),
        sa.Column("rich_results_eligible", sa.Boolean(), nullable=True),
        sa.Column("rich_results_types", sa.JSON(), nullable=True),
        sa.Column("search_console_impressions", sa.Integer(), nullable=True),
        sa.Column("search_console_clicks", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["google_profile_id"],
            ["google_business_profiles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_schema_markup_id"), "schema_markup", ["id"], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_index(op.f("ix_schema_markup_id"), table_name="schema_markup")
    op.drop_table("schema_markup")

    op.drop_index(op.f("ix_seo_analytics_analytics_date"), table_name="seo_analytics")
    op.drop_index(op.f("ix_seo_analytics_id"), table_name="seo_analytics")
    op.drop_table("seo_analytics")

    op.drop_index(op.f("ix_review_management_id"), table_name="review_management")
    op.drop_table("review_management")

    op.drop_index(op.f("ix_business_citations_id"), table_name="business_citations")
    op.drop_table("business_citations")

    op.drop_index(
        op.f("ix_keyword_ranking_history_check_date"),
        table_name="keyword_ranking_history",
    )
    op.drop_index(
        op.f("ix_keyword_ranking_history_id"), table_name="keyword_ranking_history"
    )
    op.drop_table("keyword_ranking_history")

    op.drop_index(op.f("ix_keyword_rankings_keyword"), table_name="keyword_rankings")
    op.drop_index(op.f("ix_keyword_rankings_id"), table_name="keyword_rankings")
    op.drop_table("keyword_rankings")

    op.drop_index(op.f("ix_seo_optimizations_id"), table_name="seo_optimizations")
    op.drop_table("seo_optimizations")

    op.drop_index(
        op.f("ix_google_business_profiles_google_place_id"),
        table_name="google_business_profiles",
    )
    op.drop_index(
        op.f("ix_google_business_profiles_id"), table_name="google_business_profiles"
    )
    op.drop_table("google_business_profiles")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS reviewplatform")
    op.execute("DROP TYPE IF EXISTS citationstatus")
    op.execute("DROP TYPE IF EXISTS keyworddifficulty")
    op.execute("DROP TYPE IF EXISTS optimizationstatus")
