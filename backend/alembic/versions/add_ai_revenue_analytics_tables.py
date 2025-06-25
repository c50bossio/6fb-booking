"""Add AI revenue analytics tables

Revision ID: add_ai_revenue_analytics
Revises: ea46f0e03b47
Create Date: 2025-06-25 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_ai_revenue_analytics"
down_revision = "cfbfc06f2b2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create revenue_patterns table
    op.create_table(
        "revenue_patterns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("pattern_type", sa.String(50), nullable=False),
        sa.Column("pattern_name", sa.String(100), nullable=False),
        sa.Column("confidence_score", sa.Float(), default=0.0),
        sa.Column("pattern_data", sa.JSON(), nullable=True),
        sa.Column("avg_revenue_impact", sa.Float(), nullable=True),
        sa.Column("frequency", sa.String(50), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("model_version", sa.String(20), nullable=True),
        sa.Column(
            "last_updated",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_revenue_patterns_barber_type",
        "revenue_patterns",
        ["barber_id", "pattern_type"],
        unique=False,
    )
    op.create_index(
        "idx_revenue_patterns_confidence",
        "revenue_patterns",
        ["confidence_score"],
        unique=False,
    )

    # Create revenue_predictions table
    op.create_table(
        "revenue_predictions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("prediction_date", sa.Date(), nullable=False),
        sa.Column("prediction_type", sa.String(20), nullable=True),
        sa.Column("predicted_revenue", sa.Float(), nullable=False),
        sa.Column("confidence_interval_low", sa.Float(), nullable=True),
        sa.Column("confidence_interval_high", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("predicted_appointments", sa.Integer(), nullable=True),
        sa.Column("predicted_new_clients", sa.Integer(), nullable=True),
        sa.Column("predicted_avg_ticket", sa.Float(), nullable=True),
        sa.Column("factors_data", sa.JSON(), nullable=True),
        sa.Column("model_version", sa.String(20), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("barber_id", "prediction_date", "prediction_type"),
    )
    op.create_index(
        "idx_predictions_barber_date",
        "revenue_predictions",
        ["barber_id", "prediction_date"],
        unique=False,
    )

    # Create pricing_optimizations table
    op.create_table(
        "pricing_optimizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("service_name", sa.String(200), nullable=True),
        sa.Column("current_price", sa.Float(), nullable=False),
        sa.Column("recommended_price", sa.Float(), nullable=False),
        sa.Column("price_elasticity", sa.Float(), nullable=True),
        sa.Column("expected_revenue_change", sa.Float(), nullable=True),
        sa.Column("expected_demand_change", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("recommendation_reason", sa.Text(), nullable=True),
        sa.Column("market_analysis", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), default="pending"),
        sa.Column("implemented_date", sa.DateTime(), nullable=True),
        sa.Column("actual_impact", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_pricing_barber_status",
        "pricing_optimizations",
        ["barber_id", "status"],
        unique=False,
    )

    # Create client_segments table
    op.create_table(
        "client_segments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("segment_name", sa.String(100), nullable=False),
        sa.Column("segment_type", sa.String(50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("characteristics", sa.JSON(), nullable=True),
        sa.Column("size", sa.Integer(), nullable=True),
        sa.Column("avg_lifetime_value", sa.Float(), nullable=True),
        sa.Column("avg_visit_frequency", sa.Float(), nullable=True),
        sa.Column("avg_ticket_size", sa.Float(), nullable=True),
        sa.Column("engagement_strategy", sa.Text(), nullable=True),
        sa.Column("recommended_services", sa.JSON(), nullable=True),
        sa.Column("recommended_promotions", sa.JSON(), nullable=True),
        sa.Column("revenue_contribution", sa.Float(), nullable=True),
        sa.Column("growth_rate", sa.Float(), nullable=True),
        sa.Column("churn_risk", sa.Float(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create revenue_insights table
    op.create_table(
        "revenue_insights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("insight_type", sa.String(50), nullable=False),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("potential_impact", sa.Float(), nullable=True),
        sa.Column("priority", sa.String(20), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("recommendations", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), default="new"),
        sa.Column("viewed_at", sa.DateTime(), nullable=True),
        sa.Column("implemented_at", sa.DateTime(), nullable=True),
        sa.Column(
            "valid_from", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column("valid_until", sa.DateTime(), nullable=True),
        sa.Column("actual_impact", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_insights_barber_status",
        "revenue_insights",
        ["barber_id", "status"],
        unique=False,
    )
    op.create_index(
        "idx_insights_priority", "revenue_insights", ["priority"], unique=False
    )

    # Create performance_benchmarks table
    op.create_table(
        "performance_benchmarks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("period_type", sa.String(20), nullable=True),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("total_revenue", sa.Float(), nullable=False),
        sa.Column("total_appointments", sa.Integer(), nullable=True),
        sa.Column("avg_ticket", sa.Float(), nullable=True),
        sa.Column("client_retention_rate", sa.Float(), nullable=True),
        sa.Column("booking_utilization", sa.Float(), nullable=True),
        sa.Column("revenue_percentile", sa.Float(), nullable=True),
        sa.Column("efficiency_percentile", sa.Float(), nullable=True),
        sa.Column("growth_percentile", sa.Float(), nullable=True),
        sa.Column("retention_percentile", sa.Float(), nullable=True),
        sa.Column("peer_group_size", sa.Integer(), nullable=True),
        sa.Column("peer_avg_revenue", sa.Float(), nullable=True),
        sa.Column("peer_avg_appointments", sa.Integer(), nullable=True),
        sa.Column("revenue_growth_rate", sa.Float(), nullable=True),
        sa.Column("appointment_growth_rate", sa.Float(), nullable=True),
        sa.Column("new_client_acquisition_rate", sa.Float(), nullable=True),
        sa.Column("improvement_areas", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("barber_id", "period_type", "period_start"),
    )
    op.create_index(
        "idx_benchmarks_barber_period",
        "performance_benchmarks",
        ["barber_id", "period_start"],
        unique=False,
    )

    # Create revenue_optimization_goals table
    op.create_table(
        "revenue_optimization_goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("goal_type", sa.String(50), nullable=True),
        sa.Column("goal_name", sa.String(200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("current_value", sa.Float(), nullable=False),
        sa.Column("target_value", sa.Float(), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("recommended_actions", sa.JSON(), nullable=True),
        sa.Column("estimated_difficulty", sa.String(20), nullable=True),
        sa.Column("success_probability", sa.Float(), nullable=True),
        sa.Column("progress_percentage", sa.Float(), default=0.0),
        sa.Column("last_updated_value", sa.Float(), nullable=True),
        sa.Column(
            "last_updated",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("status", sa.String(20), default="active"),
        sa.Column("achieved_date", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_goals_barber_status",
        "revenue_optimization_goals",
        ["barber_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    # Drop all tables in reverse order
    op.drop_table("revenue_optimization_goals")
    op.drop_table("performance_benchmarks")
    op.drop_table("revenue_insights")
    op.drop_table("client_segments")
    op.drop_table("pricing_optimizations")
    op.drop_table("revenue_predictions")
    op.drop_table("revenue_patterns")
