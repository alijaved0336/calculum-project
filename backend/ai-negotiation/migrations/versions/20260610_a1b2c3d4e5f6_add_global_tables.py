"""add_global_tables

Revision ID: a1b2c3d4e5f6
Revises: 58e035b345d4
Create Date: 2026-06-10 16:00:00.000000+00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1b2c3d4e5f6'
down_revision = '58e035b345d4'
branch_labels = None
depends_on = None

_tone_enum = postgresql.ENUM('collaborative', 'assertive', 'methodical', name='tone_enum', create_type=False)
_strategy_enum = postgresql.ENUM('term_extension', 'term_extension_scf', name='strategy_enum', create_type=False)


def upgrade() -> None:
    op.create_table('global_settings',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('enabled_tones', postgresql.ARRAY(_tone_enum), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('global_users',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=160), nullable=False),
    sa.Column('display_name', sa.String(length=120), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('global_prompt_instructions',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('global_prompt', sa.Text(), nullable=True),
    sa.Column('settings_id', sa.UUID(), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['settings_id'], ['global_settings.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('global_tone_settings',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('strategy_name', _strategy_enum, nullable=True),
    sa.Column('settings_id', sa.UUID(), nullable=False),
    sa.Column('tone', _tone_enum, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['settings_id'], ['global_settings.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid'),
    sa.UniqueConstraint('strategy_name', name='uq_global_tone_settings_strategy_name')
    )
    op.create_table('kb_documents',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('uploaded_by_user_id', sa.UUID(), nullable=False),
    sa.Column('filename', sa.String(length=500), nullable=False),
    sa.Column('file_type', sa.String(length=30), nullable=True),
    sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
    sa.Column('page_count', sa.Integer(), nullable=True),
    sa.Column('storage_url', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=64), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('is_already_uploaded', sa.Boolean(), nullable=False),
    sa.Column('chunk_count', sa.Integer(), nullable=True),
    sa.Column('playbook_strategies', postgresql.ARRAY(_strategy_enum), nullable=True),
    sa.ForeignKeyConstraint(['uploaded_by_user_id'], ['global_users.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )


def downgrade() -> None:
    op.drop_table('kb_documents')
    op.drop_table('global_tone_settings')
    op.drop_table('global_prompt_instructions')
    op.drop_table('global_users')
    op.drop_table('global_settings')
