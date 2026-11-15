"""add_adabot_ingestion_logs

Revision ID: d88a66c579c5
Revises: be2edb13406d
Create Date: 2026-08-12 14:35:31.527114+00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'd88a66c579c5'
down_revision = 'be2edb13406d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('adabot_ingestion_logs',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('started_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('completed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('logs', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('uuid')
    )


def downgrade() -> None:
    op.drop_table('adabot_ingestion_logs')
