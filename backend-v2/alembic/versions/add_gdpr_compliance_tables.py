"""add gdpr compliance tables

Revision ID: add_gdpr_compliance_tables
Revises: ed548ba61608
Create Date: 2025-01-02

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_gdpr_compliance_tables'
down_revision = 'ed548ba61608'
branch_labels = None
depends_on = None


def upgrade():
    # Check if we're using PostgreSQL to create enum types
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        # Create enum types for PostgreSQL
        op.execute("CREATE TYPE consenttype AS ENUM ('terms_of_service', 'privacy_policy', 'marketing_emails', 'marketing_sms', 'data_processing', 'third_party_sharing')")
        op.execute("CREATE TYPE consentstatus AS ENUM ('granted', 'denied', 'pending', 'withdrawn')")
        op.execute("CREATE TYPE cookiecategory AS ENUM ('functional', 'analytics', 'marketing', 'preferences')")
        op.execute("CREATE TYPE dataprocessingpurpose AS ENUM ('service_provision', 'analytics', 'marketing', 'legal_compliance', 'consent_management', 'data_export')")
        op.execute("CREATE TYPE exportstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired')")
    
    # Create user_consents table
    op.create_table('user_consents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('consent_type', sa.Enum('terms_of_service', 'privacy_policy', 'marketing_emails', 'marketing_sms', 'data_processing', 'third_party_sharing', name='consenttype'), nullable=False),
        sa.Column('status', sa.Enum('granted', 'denied', 'pending', 'withdrawn', name='consentstatus'), nullable=False),
        sa.Column('consent_date', sa.DateTime(), nullable=False),
        sa.Column('withdrawal_date', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('version', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create cookie_consents table
    op.create_table('cookie_consents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=False),
        sa.Column('functional', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('analytics', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('marketing', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('preferences', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('consent_date', sa.DateTime(), nullable=False),
        sa.Column('expiry_date', sa.DateTime(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create data_processing_logs table
    op.create_table('data_processing_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('purpose', sa.Enum('service_provision', 'analytics', 'marketing', 'legal_compliance', 'consent_management', 'data_export', name='dataprocessingpurpose'), nullable=False),
        sa.Column('operation', sa.String(length=255), nullable=False),
        sa.Column('data_categories', sa.JSON(), nullable=True),
        sa.Column('legal_basis', sa.String(length=255), nullable=True),
        sa.Column('retention_period_days', sa.Integer(), nullable=True),
        sa.Column('third_party_involved', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('third_party_details', sa.JSON(), nullable=True),
        sa.Column('processing_date', sa.DateTime(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create data_export_requests table
    op.create_table('data_export_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.String(length=255), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', 'expired', name='exportstatus'), nullable=False),
        sa.Column('requested_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('file_url', sa.Text(), nullable=True),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('data_categories', sa.JSON(), nullable=True),
        sa.Column('format', sa.String(length=50), nullable=True, server_default='json'),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create legal_consent_audit table
    op.create_table('legal_consent_audit',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('consent_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('consent_type', sa.String(length=100), nullable=True),
        sa.Column('old_status', sa.String(length=50), nullable=True),
        sa.Column('new_status', sa.String(length=50), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('audit_metadata', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('performed_by', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['performed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_user_consents_user_id'), 'user_consents', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_consents_consent_type'), 'user_consents', ['consent_type'], unique=False)
    op.create_index(op.f('ix_user_consents_status'), 'user_consents', ['status'], unique=False)
    op.create_index('ix_user_consents_user_type', 'user_consents', ['user_id', 'consent_type'], unique=True)
    
    op.create_index(op.f('ix_cookie_consents_user_id'), 'cookie_consents', ['user_id'], unique=False)
    op.create_index(op.f('ix_cookie_consents_session_id'), 'cookie_consents', ['session_id'], unique=False)
    
    op.create_index(op.f('ix_data_processing_logs_user_id'), 'data_processing_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_data_processing_logs_purpose'), 'data_processing_logs', ['purpose'], unique=False)
    op.create_index(op.f('ix_data_processing_logs_processing_date'), 'data_processing_logs', ['processing_date'], unique=False)
    
    op.create_index(op.f('ix_data_export_requests_user_id'), 'data_export_requests', ['user_id'], unique=False)
    op.create_index(op.f('ix_data_export_requests_request_id'), 'data_export_requests', ['request_id'], unique=True)
    op.create_index(op.f('ix_data_export_requests_status'), 'data_export_requests', ['status'], unique=False)
    
    op.create_index(op.f('ix_legal_consent_audit_user_id'), 'legal_consent_audit', ['user_id'], unique=False)
    op.create_index(op.f('ix_legal_consent_audit_consent_id'), 'legal_consent_audit', ['consent_id'], unique=False)
    op.create_index(op.f('ix_legal_consent_audit_timestamp'), 'legal_consent_audit', ['timestamp'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_legal_consent_audit_timestamp'), table_name='legal_consent_audit')
    op.drop_index(op.f('ix_legal_consent_audit_consent_id'), table_name='legal_consent_audit')
    op.drop_index(op.f('ix_legal_consent_audit_user_id'), table_name='legal_consent_audit')
    
    op.drop_index(op.f('ix_data_export_requests_status'), table_name='data_export_requests')
    op.drop_index(op.f('ix_data_export_requests_request_id'), table_name='data_export_requests')
    op.drop_index(op.f('ix_data_export_requests_user_id'), table_name='data_export_requests')
    
    op.drop_index(op.f('ix_data_processing_logs_processing_date'), table_name='data_processing_logs')
    op.drop_index(op.f('ix_data_processing_logs_purpose'), table_name='data_processing_logs')
    op.drop_index(op.f('ix_data_processing_logs_user_id'), table_name='data_processing_logs')
    
    op.drop_index(op.f('ix_cookie_consents_session_id'), table_name='cookie_consents')
    op.drop_index(op.f('ix_cookie_consents_user_id'), table_name='cookie_consents')
    
    op.drop_index('ix_user_consents_user_type', table_name='user_consents')
    op.drop_index(op.f('ix_user_consents_status'), table_name='user_consents')
    op.drop_index(op.f('ix_user_consents_consent_type'), table_name='user_consents')
    op.drop_index(op.f('ix_user_consents_user_id'), table_name='user_consents')
    
    # Drop tables
    op.drop_table('legal_consent_audit')
    op.drop_table('data_export_requests')
    op.drop_table('data_processing_logs')
    op.drop_table('cookie_consents')
    op.drop_table('user_consents')
    
    # Drop enum types (PostgreSQL only)
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        op.execute("DROP TYPE exportstatus")
        op.execute("DROP TYPE dataprocessingpurpose")
        op.execute("DROP TYPE cookiecategory")
        op.execute("DROP TYPE consentstatus")
        op.execute("DROP TYPE consenttype")