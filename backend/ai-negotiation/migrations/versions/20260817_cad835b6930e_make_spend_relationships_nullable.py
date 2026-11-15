"""make spend relationships nullable

Revision ID: cad835b6930e
Revises: d88a66c579c5
Create Date: 2026-08-17 10:37:02.563257+00:00
"""

from alembic import op
import sqlalchemy as sa


revision = 'cad835b6930e'
down_revision = 'd88a66c579c5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('spends', 'spend_file_version_uuid',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('spends', 'supplier_uuid',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('spends', 'buying_entity_uuid',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('spend_file_versions', 'tenant_uuid',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('spend_file_versions', 'tenant_uuid',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('spends', 'buying_entity_uuid',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('spends', 'supplier_uuid',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('spends', 'spend_file_version_uuid',
               existing_type=sa.UUID(),
               nullable=False)
