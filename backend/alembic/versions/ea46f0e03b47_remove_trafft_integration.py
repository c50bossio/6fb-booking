"""remove_trafft_integration

Revision ID: ea46f0e03b47
Revises: 43d2ec34a8ad
Create Date: 2025-06-21 23:31:34.070107

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ea46f0e03b47'
down_revision = '43d2ec34a8ad'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # For SQLite, we need to check if columns exist before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Remove Trafft columns from barbers table
    columns = [col['name'] for col in inspector.get_columns('barbers')]
    with op.batch_alter_table('barbers', schema=None) as batch_op:
        if 'trafft_api_key' in columns:
            batch_op.drop_column('trafft_api_key')
        if 'trafft_subdomain' in columns:
            batch_op.drop_column('trafft_subdomain')
        if 'trafft_employee_id' in columns:
            batch_op.drop_column('trafft_employee_id')
        if 'trafft_employee_email' in columns:
            batch_op.drop_column('trafft_employee_email')
        if 'trafft_last_sync' in columns:
            batch_op.drop_column('trafft_last_sync')

    # Remove Trafft columns from locations table
    columns = [col['name'] for col in inspector.get_columns('locations')]
    with op.batch_alter_table('locations', schema=None) as batch_op:
        if 'trafft_location_id' in columns:
            batch_op.drop_column('trafft_location_id')
        if 'trafft_api_key' in columns:
            batch_op.drop_column('trafft_api_key')

    # Remove Trafft columns from clients table
    columns = [col['name'] for col in inspector.get_columns('clients')]
    with op.batch_alter_table('clients', schema=None) as batch_op:
        if 'trafft_customer_id' in columns:
            batch_op.drop_column('trafft_customer_id')

    # Remove Trafft columns from appointments table
    columns = [col['name'] for col in inspector.get_columns('appointments')]
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        if 'trafft_appointment_id' in columns:
            batch_op.drop_column('trafft_appointment_id')
        if 'trafft_booking_uuid' in columns:
            batch_op.drop_column('trafft_booking_uuid')
        if 'trafft_service_id' in columns:
            batch_op.drop_column('trafft_service_id')
        if 'trafft_employee_id' in columns:
            batch_op.drop_column('trafft_employee_id')
        if 'trafft_location_name' in columns:
            batch_op.drop_column('trafft_location_name')
        if 'trafft_sync_status' in columns:
            batch_op.drop_column('trafft_sync_status')
        if 'trafft_last_sync' in columns:
            batch_op.drop_column('trafft_last_sync')


def downgrade() -> None:
    # Add Trafft columns back to appointments table
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('trafft_last_sync', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('trafft_sync_status', sa.String(length=50), server_default='synced', nullable=True))
        batch_op.add_column(sa.Column('trafft_location_name', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('trafft_employee_id', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('trafft_service_id', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('trafft_booking_uuid', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('trafft_appointment_id', sa.String(length=100), nullable=True))

    # Add Trafft columns back to clients table
    with op.batch_alter_table('clients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('trafft_customer_id', sa.String(length=100), nullable=True))

    # Add Trafft columns back to locations table
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('trafft_api_key', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('trafft_location_id', sa.String(length=100), nullable=True))

    # Add Trafft columns back to barbers table
    with op.batch_alter_table('barbers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('trafft_last_sync', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('trafft_employee_email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('trafft_employee_id', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('trafft_subdomain', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('trafft_api_key', sa.String(length=500), nullable=True))