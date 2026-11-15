"""add thread_name to thread_summaries

Revision ID: e9f0a1b2c3d4
Revises: cad835b6930e
Create Date: 2026-09-15 18:00:00.000000+00:00
"""

from alembic import op
import sqlalchemy as sa


revision = 'e9f0a1b2c3d4'
down_revision = 'cad835b6930e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'thread_summaries',
        sa.Column('thread_name', sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('thread_summaries', 'thread_name')
