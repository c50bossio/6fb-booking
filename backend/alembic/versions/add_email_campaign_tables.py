"""Add email campaign and preferences tables

Revision ID: add_email_campaign_tables
Revises: add_communication_tables
Create Date: 2025-06-24 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_email_campaign_tables"
down_revision = "add_communication_tables"
branch_labels = None
depends_on = None


def upgrade():
    # Create email_preferences table
    op.create_table(
        "email_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("email_address", sa.String(length=255), nullable=False),
        sa.Column("is_subscribed", sa.Boolean(), nullable=False),
        sa.Column("subscription_source", sa.String(length=100), nullable=True),
        sa.Column("subscription_date", sa.DateTime(), nullable=True),
        sa.Column("unsubscribed_date", sa.DateTime(), nullable=True),
        sa.Column("unsubscribe_reason", sa.String(length=255), nullable=True),
        sa.Column("frequency_preference", sa.String(length=50), nullable=True),
        sa.Column("max_emails_per_week", sa.Integer(), nullable=True),
        sa.Column("campaign_preferences", sa.JSON(), nullable=True),
        sa.Column("segment_tags", sa.JSON(), nullable=True),
        sa.Column("client_tier", sa.String(length=50), nullable=True),
        sa.Column("preferred_time", sa.String(length=20), nullable=True),
        sa.Column("timezone", sa.String(length=50), nullable=True),
        sa.Column("unsubscribe_token", sa.String(length=64), nullable=False),
        sa.Column("preferences_token", sa.String(length=64), nullable=False),
        sa.Column("last_email_sent", sa.DateTime(), nullable=True),
        sa.Column("total_emails_sent", sa.Integer(), nullable=True),
        sa.Column("total_emails_opened", sa.Integer(), nullable=True),
        sa.Column("total_emails_clicked", sa.Integer(), nullable=True),
        sa.Column("bounce_count", sa.Integer(), nullable=True),
        sa.Column("complaint_count", sa.Integer(), nullable=True),
        sa.Column("last_bounce_date", sa.DateTime(), nullable=True),
        sa.Column("last_complaint_date", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("custom_fields", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id"),
        sa.UniqueConstraint("unsubscribe_token"),
        sa.UniqueConstraint("preferences_token"),
    )
    op.create_index(
        op.f("ix_email_preferences_id"), "email_preferences", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_email_preferences_email_address"),
        "email_preferences",
        ["email_address"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_preferences_unsubscribe_token"),
        "email_preferences",
        ["unsubscribe_token"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_preferences_preferences_token"),
        "email_preferences",
        ["preferences_token"],
        unique=False,
    )

    # Create email_delivery_log table
    op.create_table(
        "email_delivery_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("email_address", sa.String(length=255), nullable=False),
        sa.Column("campaign_id", sa.String(length=100), nullable=True),
        sa.Column("template_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("delivery_id", sa.String(length=100), nullable=False),
        sa.Column("external_message_id", sa.String(length=255), nullable=True),
        sa.Column("subject_line", sa.String(length=255), nullable=False),
        sa.Column("personalization_data", sa.JSON(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("opened_at", sa.DateTime(), nullable=True),
        sa.Column("first_clicked_at", sa.DateTime(), nullable=True),
        sa.Column("last_clicked_at", sa.DateTime(), nullable=True),
        sa.Column("bounced_at", sa.DateTime(), nullable=True),
        sa.Column("complained_at", sa.DateTime(), nullable=True),
        sa.Column("unsubscribed_at", sa.DateTime(), nullable=True),
        sa.Column("open_count", sa.Integer(), nullable=True),
        sa.Column("click_count", sa.Integer(), nullable=True),
        sa.Column("links_clicked", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("bounce_type", sa.String(length=50), nullable=True),
        sa.Column("bounce_reason", sa.String(length=255), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("location_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("delivery_id"),
    )
    op.create_index(
        op.f("ix_email_delivery_log_id"), "email_delivery_log", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_email_delivery_log_campaign_id"),
        "email_delivery_log",
        ["campaign_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_delivery_log_template_id"),
        "email_delivery_log",
        ["template_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_delivery_log_delivery_id"),
        "email_delivery_log",
        ["delivery_id"],
        unique=False,
    )

    # Create email_campaigns table
    op.create_table(
        "email_campaigns",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("campaign_type", sa.String(length=50), nullable=False),
        sa.Column("template_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("target_audience", sa.JSON(), nullable=True),
        sa.Column("scheduling", sa.JSON(), nullable=True),
        sa.Column("automation_triggers", sa.JSON(), nullable=True),
        sa.Column("personalization_rules", sa.JSON(), nullable=True),
        sa.Column("analytics_tracking", sa.JSON(), nullable=True),
        sa.Column("send_count", sa.Integer(), nullable=True),
        sa.Column("delivered_count", sa.Integer(), nullable=True),
        sa.Column("open_count", sa.Integer(), nullable=True),
        sa.Column("click_count", sa.Integer(), nullable=True),
        sa.Column("bounce_count", sa.Integer(), nullable=True),
        sa.Column("complaint_count", sa.Integer(), nullable=True),
        sa.Column("unsubscribe_count", sa.Integer(), nullable=True),
        sa.Column("open_rate", sa.Integer(), nullable=True),
        sa.Column("click_rate", sa.Integer(), nullable=True),
        sa.Column("bounce_rate", sa.Integer(), nullable=True),
        sa.Column("unsubscribe_rate", sa.Integer(), nullable=True),
        sa.Column("last_sent", sa.DateTime(), nullable=True),
        sa.Column("next_scheduled", sa.DateTime(), nullable=True),
        sa.Column("total_executions", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_campaigns_id"), "email_campaigns", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_email_campaigns_campaign_type"),
        "email_campaigns",
        ["campaign_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_campaigns_status"), "email_campaigns", ["status"], unique=False
    )

    # Create email_templates table
    op.create_table(
        "email_templates",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("html_content_path", sa.String(length=500), nullable=False),
        sa.Column("text_content_path", sa.String(length=500), nullable=True),
        sa.Column("campaign_type", sa.String(length=50), nullable=False),
        sa.Column("personalization_fields", sa.JSON(), nullable=True),
        sa.Column("required_fields", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("is_system_template", sa.Boolean(), nullable=True),
        sa.Column("version", sa.String(length=20), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=True),
        sa.Column("last_used", sa.DateTime(), nullable=True),
        sa.Column("average_open_rate", sa.Integer(), nullable=True),
        sa.Column("average_click_rate", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_templates_id"), "email_templates", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_email_templates_campaign_type"),
        "email_templates",
        ["campaign_type"],
        unique=False,
    )

    # Create email_segments table
    op.create_table(
        "email_segments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("criteria", sa.JSON(), nullable=False),
        sa.Column("is_dynamic", sa.Boolean(), nullable=True),
        sa.Column("client_count", sa.Integer(), nullable=True),
        sa.Column("average_open_rate", sa.Integer(), nullable=True),
        sa.Column("average_click_rate", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_segments_id"), "email_segments", ["id"], unique=False
    )

    # Create email_suppression_list table
    op.create_table(
        "email_suppression_list",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email_address", sa.String(length=255), nullable=False),
        sa.Column("suppression_type", sa.String(length=50), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("source_campaign_id", sa.String(length=100), nullable=True),
        sa.Column("bounce_type", sa.String(length=50), nullable=True),
        sa.Column("bounce_subtype", sa.String(length=100), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("suppressed_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
        ),
        sa.ForeignKeyConstraint(
            ["suppressed_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email_address"),
    )
    op.create_index(
        op.f("ix_email_suppression_list_id"),
        "email_suppression_list",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_suppression_list_email_address"),
        "email_suppression_list",
        ["email_address"],
        unique=False,
    )

    # Set default values for existing columns
    op.execute(
        "UPDATE email_preferences SET subscription_source = 'signup' WHERE subscription_source IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET frequency_preference = 'weekly' WHERE frequency_preference IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET max_emails_per_week = 3 WHERE max_emails_per_week IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET campaign_preferences = '{}' WHERE campaign_preferences IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET segment_tags = '[]' WHERE segment_tags IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET client_tier = 'standard' WHERE client_tier IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET preferred_time = 'morning' WHERE preferred_time IS NULL"
    )
    op.execute("UPDATE email_preferences SET timezone = 'UTC' WHERE timezone IS NULL")
    op.execute(
        "UPDATE email_preferences SET total_emails_sent = 0 WHERE total_emails_sent IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET total_emails_opened = 0 WHERE total_emails_opened IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET total_emails_clicked = 0 WHERE total_emails_clicked IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET bounce_count = 0 WHERE bounce_count IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET complaint_count = 0 WHERE complaint_count IS NULL"
    )
    op.execute(
        "UPDATE email_preferences SET custom_fields = '{}' WHERE custom_fields IS NULL"
    )

    op.execute("UPDATE email_delivery_log SET status = 'pending' WHERE status IS NULL")
    op.execute(
        "UPDATE email_delivery_log SET personalization_data = '{}' WHERE personalization_data IS NULL"
    )
    op.execute("UPDATE email_delivery_log SET open_count = 0 WHERE open_count IS NULL")
    op.execute(
        "UPDATE email_delivery_log SET click_count = 0 WHERE click_count IS NULL"
    )
    op.execute(
        "UPDATE email_delivery_log SET links_clicked = '[]' WHERE links_clicked IS NULL"
    )
    op.execute(
        "UPDATE email_delivery_log SET location_data = '{}' WHERE location_data IS NULL"
    )

    op.execute("UPDATE email_campaigns SET status = 'draft' WHERE status IS NULL")
    op.execute(
        "UPDATE email_campaigns SET target_audience = '{}' WHERE target_audience IS NULL"
    )
    op.execute("UPDATE email_campaigns SET scheduling = '{}' WHERE scheduling IS NULL")
    op.execute(
        "UPDATE email_campaigns SET automation_triggers = '[]' WHERE automation_triggers IS NULL"
    )
    op.execute(
        "UPDATE email_campaigns SET personalization_rules = '{}' WHERE personalization_rules IS NULL"
    )
    op.execute(
        "UPDATE email_campaigns SET analytics_tracking = '{}' WHERE analytics_tracking IS NULL"
    )
    op.execute("UPDATE email_campaigns SET send_count = 0 WHERE send_count IS NULL")
    op.execute(
        "UPDATE email_campaigns SET delivered_count = 0 WHERE delivered_count IS NULL"
    )
    op.execute("UPDATE email_campaigns SET open_count = 0 WHERE open_count IS NULL")
    op.execute("UPDATE email_campaigns SET click_count = 0 WHERE click_count IS NULL")
    op.execute("UPDATE email_campaigns SET bounce_count = 0 WHERE bounce_count IS NULL")
    op.execute(
        "UPDATE email_campaigns SET complaint_count = 0 WHERE complaint_count IS NULL"
    )
    op.execute(
        "UPDATE email_campaigns SET unsubscribe_count = 0 WHERE unsubscribe_count IS NULL"
    )
    op.execute("UPDATE email_campaigns SET open_rate = 0 WHERE open_rate IS NULL")
    op.execute("UPDATE email_campaigns SET click_rate = 0 WHERE click_rate IS NULL")
    op.execute("UPDATE email_campaigns SET bounce_rate = 0 WHERE bounce_rate IS NULL")
    op.execute(
        "UPDATE email_campaigns SET unsubscribe_rate = 0 WHERE unsubscribe_rate IS NULL"
    )
    op.execute(
        "UPDATE email_campaigns SET total_executions = 0 WHERE total_executions IS NULL"
    )

    op.execute(
        "UPDATE email_templates SET personalization_fields = '[]' WHERE personalization_fields IS NULL"
    )
    op.execute(
        "UPDATE email_templates SET required_fields = '[]' WHERE required_fields IS NULL"
    )
    op.execute("UPDATE email_templates SET is_active = true WHERE is_active IS NULL")
    op.execute(
        "UPDATE email_templates SET is_system_template = false WHERE is_system_template IS NULL"
    )
    op.execute("UPDATE email_templates SET version = '1.0' WHERE version IS NULL")
    op.execute("UPDATE email_templates SET usage_count = 0 WHERE usage_count IS NULL")
    op.execute(
        "UPDATE email_templates SET average_open_rate = 0 WHERE average_open_rate IS NULL"
    )
    op.execute(
        "UPDATE email_templates SET average_click_rate = 0 WHERE average_click_rate IS NULL"
    )

    op.execute("UPDATE email_segments SET is_dynamic = true WHERE is_dynamic IS NULL")
    op.execute("UPDATE email_segments SET client_count = 0 WHERE client_count IS NULL")
    op.execute(
        "UPDATE email_segments SET average_open_rate = 0 WHERE average_open_rate IS NULL"
    )
    op.execute(
        "UPDATE email_segments SET average_click_rate = 0 WHERE average_click_rate IS NULL"
    )


def downgrade():
    # Drop tables in reverse order
    op.drop_table("email_suppression_list")
    op.drop_table("email_segments")
    op.drop_table("email_templates")
    op.drop_table("email_campaigns")
    op.drop_table("email_delivery_log")
    op.drop_table("email_preferences")
