"""add_review_table_missing_columns

Revision ID: 9bae8df87db7
Revises: 7b5574b6ee67
Create Date: 2025-07-02 12:34:40.590516

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '9bae8df87db7'
down_revision: Union[str, Sequence[str], None] = '7b5574b6ee67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing columns to reviews table if they don't exist
    conn = op.get_bind()
    
    # Add comment column if missing
    if not column_exists('reviews', 'comment'):
        op.add_column('reviews', sa.Column('comment', sa.Text(), nullable=True))
    
    # Add external_id column if missing
    if not column_exists('reviews', 'external_id'):
        op.add_column('reviews', sa.Column('external_id', sa.String(length=255), nullable=True))
        op.create_index('idx_reviews_external_id', 'reviews', ['external_id'], unique=False)
    
    # Add source column if missing
    if not column_exists('reviews', 'source'):
        op.add_column('reviews', sa.Column('source', sa.String(length=50), nullable=True))
        op.create_index('idx_reviews_source', 'reviews', ['source'], unique=False)
    
    # Add status column if missing
    if not column_exists('reviews', 'status'):
        op.add_column('reviews', sa.Column('status', sa.String(length=50), nullable=True))
        op.create_index('idx_reviews_status', 'reviews', ['status'], unique=False)
    
    # Add integration_id column if missing
    if not column_exists('reviews', 'integration_id'):
        op.add_column('reviews', sa.Column('integration_id', sa.Integer(), nullable=True))
    
    # Add sentiment_label column if missing
    if not column_exists('reviews', 'sentiment_label'):
        op.add_column('reviews', sa.Column('sentiment_label', sa.String(length=50), nullable=True))
    
    # Add auto_response_sent column if missing
    if not column_exists('reviews', 'auto_response_sent'):
        op.add_column('reviews', sa.Column('auto_response_sent', sa.Boolean(), nullable=True, default=False))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the added columns
    op.drop_index('idx_reviews_status', 'reviews')
    op.drop_index('idx_reviews_source', 'reviews')
    op.drop_index('idx_reviews_external_id', 'reviews')
    
    op.drop_column('reviews', 'auto_response_sent')
    op.drop_column('reviews', 'sentiment_label')
    op.drop_column('reviews', 'integration_id')
    op.drop_column('reviews', 'status')
    op.drop_column('reviews', 'source')
    op.drop_column('reviews', 'external_id')
    op.drop_column('reviews', 'comment')