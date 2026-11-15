"""align_settings_tables_to_erd

Revision ID: e82429b6e72e
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12 14:48:48.446470+00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'e82429b6e72e'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

_tone_enum = postgresql.ENUM('collaborative', 'assertive', 'methodical', name='tone_enum', create_type=False)
_strategy_enum = postgresql.ENUM('term_extension', 'term_extension_scf', name='strategy_enum', create_type=False)
_message_role_enum = postgresql.ENUM('user', 'ai', name='message_role_enum', create_type=False)
_user_role_enum = postgresql.ENUM('global_platform_admin', 'admin', 'user', name='user_role_enum', create_type=False)


def upgrade() -> None:
    _user_role_enum.create(op.get_bind(), checkfirst=True)

    op.create_table('settings',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_uuid', sa.UUID(), nullable=True),
    sa.Column('enabled_tones', postgresql.ARRAY(_tone_enum), nullable=True),
    sa.Column('is_global', sa.Boolean(), nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('(is_global = true AND tenant_uuid IS NULL) OR (is_global = false AND tenant_uuid IS NOT NULL)', name='ck_settings_global_tenant_scope'),
    sa.ForeignKeyConstraint(['tenant_uuid'], ['tenants.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_index('uq_settings_platform_singleton', 'settings', ['is_global'], unique=True, postgresql_where=sa.text('is_global IS TRUE'))
    op.create_index('uq_settings_tenant', 'settings', ['tenant_uuid'], unique=True, postgresql_where=sa.text('is_global IS FALSE'))
    op.create_table('users',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_uuid', sa.UUID(), nullable=True),
    sa.Column('email', sa.String(length=160), nullable=False),
    sa.Column('display_name', sa.String(length=120), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=True),
    sa.Column('role', _user_role_enum, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("(role = 'global_platform_admin' AND tenant_uuid IS NULL) OR (role IN ('admin', 'user') AND tenant_uuid IS NOT NULL)", name='ck_users_role_tenant_scope'),
    sa.ForeignKeyConstraint(['tenant_uuid'], ['tenants.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_index('uq_users_platform_email', 'users', ['email'], unique=True, postgresql_where=sa.text("role = 'global_platform_admin'"))
    op.create_index('uq_users_tenant_email', 'users', ['tenant_uuid', 'email'], unique=True, postgresql_where=sa.text("role IN ('admin', 'user')"))
    op.create_table('prompt_instructions',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('settings_uuid', sa.UUID(), nullable=False),
    sa.Column('user_uuid', sa.UUID(), nullable=True),
    sa.Column('prompt', sa.Text(), nullable=True),
    sa.Column('is_conflicted', sa.Boolean(), nullable=False),
    sa.Column('is_enabled', sa.Boolean(), nullable=False),
    sa.Column('is_global', sa.Boolean(), nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['settings_uuid'], ['settings.uuid'], initially='deferred', deferrable=True),
    sa.ForeignKeyConstraint(['user_uuid'], ['users.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('tenant_strategy_availability',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_uuid', sa.UUID(), nullable=False),
    sa.Column('settings_uuid', sa.UUID(), nullable=False),
    sa.Column('is_global', sa.Boolean(), nullable=False),
    sa.Column('enabled_strategies', postgresql.ARRAY(_strategy_enum), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['settings_uuid'], ['settings.uuid'], initially='deferred', deferrable=True),
    sa.ForeignKeyConstraint(['tenant_uuid'], ['tenants.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid'),
    sa.UniqueConstraint('tenant_uuid', name='uq_tenant_strategy_availability_tenant')
    )
    op.create_table('tone_settings',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('is_global', sa.Boolean(), nullable=False),
    sa.Column('settings_uuid', sa.UUID(), nullable=False),
    sa.Column('strategy_name', _strategy_enum, nullable=True),
    sa.Column('tone', _tone_enum, nullable=True),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['settings_uuid'], ['settings.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid'),
    sa.UniqueConstraint('settings_uuid', 'strategy_name', name='uq_tone_settings_settings_strategy')
    )
    op.create_table('messages',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('thread_uuid', sa.UUID(), nullable=False),
    sa.Column('role', _message_role_enum, nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('tokens_in', sa.Integer(), nullable=True),
    sa.Column('tokens_out', sa.Integer(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['thread_uuid'], ['threads.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_index('idx_messages_thread_uuid', 'messages', ['thread_uuid'], unique=False)
    op.drop_constraint(op.f('threads_user_id_fkey'), 'threads', type_='foreignkey')
    op.drop_constraint(op.f('kb_documents_uploaded_by_user_id_fkey'), 'kb_documents', type_='foreignkey')
    op.drop_constraint(op.f('thread_playbooks_message_id_fkey'), 'thread_playbooks', type_='foreignkey')
    op.drop_constraint(op.f('thread_playbooks_thread_id_fkey'), 'thread_playbooks', type_='foreignkey')
    op.drop_table('global_tone_settings')
    op.drop_table('global_prompt_instructions')
    op.drop_table('tenant_prompt_instructions')
    op.drop_table('tenant_tone_settings')
    op.drop_table('tenant_settings')
    op.drop_table('global_settings')
    op.drop_index(op.f('idx_cm_thread_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_table('tenant_users')
    op.drop_table('global_users')
    op.create_foreign_key(None, 'buying_entities', 'buying_entity_ultimate_parents', ['ultimate_parent_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.add_column('kb_documents', sa.Column('uploaded_by_user_uuid', sa.UUID(), nullable=False))
    op.create_foreign_key(None, 'kb_documents', 'users', ['uploaded_by_user_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.drop_column('kb_documents', 'uploaded_by_user_id')
    op.create_foreign_key(None, 'spends', 'buying_entities', ['buying_entity_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.create_foreign_key(None, 'spends', 'spend_file_versions', ['spend_file_version_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.create_foreign_key(None, 'spends', 'suppliers', ['supplier_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.create_foreign_key(None, 'suppliers', 'supplier_ultimate_parents', ['ultimate_parent_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.add_column('thread_playbooks', sa.Column('thread_uuid', sa.UUID(), nullable=False))
    op.add_column('thread_playbooks', sa.Column('message_uuid', sa.UUID(), nullable=True))
    op.drop_index(op.f('idx_tp_thread_id'), table_name='thread_playbooks')
    op.create_index('idx_tp_thread_uuid', 'thread_playbooks', ['thread_uuid'], unique=False)
    op.create_foreign_key(None, 'thread_playbooks', 'messages', ['message_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.create_foreign_key(None, 'thread_playbooks', 'threads', ['thread_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.drop_column('thread_playbooks', 'thread_id')
    op.drop_column('thread_playbooks', 'message_id')
    op.add_column('thread_summaries', sa.Column('thread_uuid', sa.UUID(), nullable=False))
    op.drop_index(op.f('idx_ts_thread_id'), table_name='thread_summaries')
    op.create_index('idx_ts_thread_uuid', 'thread_summaries', ['thread_uuid'], unique=False)
    op.drop_constraint(op.f('thread_summaries_thread_id_fkey'), 'thread_summaries', type_='foreignkey')
    op.create_foreign_key(None, 'thread_summaries', 'threads', ['thread_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.drop_column('thread_summaries', 'thread_id')
    op.add_column('threads', sa.Column('supplier_uuid', sa.UUID(), nullable=False))
    op.add_column('threads', sa.Column('user_uuid', sa.UUID(), nullable=False))
    op.alter_column('threads', 'feedback',
               existing_type=sa.TEXT(),
               type_=sa.Boolean(),
               existing_nullable=True,
               postgresql_using='feedback::boolean')
    op.drop_index(op.f('idx_threads_supplier_id'), table_name='threads')
    op.drop_index(op.f('idx_threads_user_id'), table_name='threads')
    op.create_index('idx_threads_supplier_uuid', 'threads', ['supplier_uuid'], unique=False)
    op.create_index('idx_threads_user_uuid', 'threads', ['user_uuid'], unique=False)
    op.drop_constraint(op.f('threads_supplier_id_fkey'), 'threads', type_='foreignkey')
    op.create_foreign_key(None, 'threads', 'users', ['user_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.create_foreign_key(None, 'threads', 'suppliers', ['supplier_uuid'], ['uuid'], initially='deferred', deferrable=True)
    op.drop_column('threads', 'supplier_id')
    op.drop_column('threads', 'user_id')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('threads', sa.Column('user_id', sa.UUID(), autoincrement=False, nullable=False))
    op.add_column('threads', sa.Column('supplier_id', sa.UUID(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'threads', type_='foreignkey')
    op.drop_constraint(None, 'threads', type_='foreignkey')
    op.create_foreign_key(op.f('threads_user_id_fkey'), 'threads', 'tenant_users', ['user_id'], ['uuid'], initially='DEFERRED', deferrable=True)
    op.create_foreign_key(op.f('threads_supplier_id_fkey'), 'threads', 'suppliers', ['supplier_id'], ['uuid'], initially='DEFERRED', deferrable=True)
    op.drop_index('idx_threads_user_uuid', table_name='threads')
    op.drop_index('idx_threads_supplier_uuid', table_name='threads')
    op.create_index(op.f('idx_threads_user_id'), 'threads', ['user_id'], unique=False)
    op.create_index(op.f('idx_threads_supplier_id'), 'threads', ['supplier_id'], unique=False)
    op.alter_column('threads', 'feedback',
               existing_type=sa.Boolean(),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.drop_column('threads', 'user_uuid')
    op.drop_column('threads', 'supplier_uuid')
    op.add_column('thread_summaries', sa.Column('thread_id', sa.UUID(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'thread_summaries', type_='foreignkey')
    op.create_foreign_key(op.f('thread_summaries_thread_id_fkey'), 'thread_summaries', 'threads', ['thread_id'], ['uuid'], initially='DEFERRED', deferrable=True)
    op.drop_index('idx_ts_thread_uuid', table_name='thread_summaries')
    op.create_index(op.f('idx_ts_thread_id'), 'thread_summaries', ['thread_id'], unique=False)
    op.drop_column('thread_summaries', 'thread_uuid')
    op.add_column('thread_playbooks', sa.Column('message_id', sa.UUID(), autoincrement=False, nullable=True))
    op.add_column('thread_playbooks', sa.Column('thread_id', sa.UUID(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'thread_playbooks', type_='foreignkey')
    op.drop_constraint(None, 'thread_playbooks', type_='foreignkey')
    op.create_foreign_key(op.f('thread_playbooks_message_id_fkey'), 'thread_playbooks', 'chat_messages', ['message_id'], ['uuid'], initially='DEFERRED', deferrable=True)
    op.create_foreign_key(op.f('thread_playbooks_thread_id_fkey'), 'thread_playbooks', 'threads', ['thread_id'], ['uuid'], initially='DEFERRED', deferrable=True)
    op.drop_index('idx_tp_thread_uuid', table_name='thread_playbooks')
    op.create_index(op.f('idx_tp_thread_id'), 'thread_playbooks', ['thread_id'], unique=False)
    op.drop_column('thread_playbooks', 'message_uuid')
    op.drop_column('thread_playbooks', 'thread_uuid')
    op.drop_constraint(None, 'suppliers', type_='foreignkey')
    op.drop_constraint(None, 'spends', type_='foreignkey')
    op.drop_constraint(None, 'spends', type_='foreignkey')
    op.drop_constraint(None, 'spends', type_='foreignkey')
    op.add_column('kb_documents', sa.Column('uploaded_by_user_id', sa.UUID(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'kb_documents', type_='foreignkey')
    op.create_foreign_key(op.f('kb_documents_uploaded_by_user_id_fkey'), 'kb_documents', 'global_users', ['uploaded_by_user_id'], ['uuid'], initially='DEFERRED', deferrable=True)
    op.drop_column('kb_documents', 'uploaded_by_user_uuid')
    op.drop_constraint(None, 'buying_entities', type_='foreignkey')
    op.create_table('tenant_tone_settings',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('strategy_name', postgresql.ENUM('term_extension', 'term_extension_scf', name='strategy_enum'), autoincrement=False, nullable=True),
    sa.Column('settings_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('tone', postgresql.ENUM('collaborative', 'assertive', 'methodical', name='tone_enum'), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['settings_id'], ['tenant_settings.uuid'], name=op.f('tenant_tone_settings_settings_id_fkey'), initially='DEFERRED', deferrable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('tenant_tone_settings_pkey')),
    sa.UniqueConstraint('strategy_name', name=op.f('uq_tone_settings_strategy_name'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_table('chat_messages',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('thread_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('role', postgresql.ENUM('user', 'ai', name='message_role_enum'), autoincrement=False, nullable=False),
    sa.Column('content', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('tokens_in', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('tokens_out', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['thread_id'], ['threads.uuid'], name=op.f('chat_messages_thread_id_fkey'), initially='DEFERRED', deferrable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('chat_messages_pkey'))
    )
    op.create_index(op.f('idx_cm_thread_id'), 'chat_messages', ['thread_id'], unique=False)
    op.create_table('global_settings',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('enabled_tones', postgresql.ARRAY(postgresql.ENUM('collaborative', 'assertive', 'methodical', name='tone_enum')), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('global_settings_pkey'))
    )
    op.create_table('global_users',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('email', sa.VARCHAR(length=160), autoincrement=False, nullable=False),
    sa.Column('display_name', sa.VARCHAR(length=120), autoincrement=False, nullable=True),
    sa.Column('password_hash', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('global_users_pkey'))
    )
    op.create_table('tenant_prompt_instructions',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('prompt', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('settings_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['settings_id'], ['tenant_settings.uuid'], name=op.f('tenant_prompt_instructions_settings_id_fkey'), initially='DEFERRED', deferrable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('tenant_prompt_instructions_pkey'))
    )
    op.create_table('tenant_settings',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('tenant_uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('enabled_tones', postgresql.ARRAY(postgresql.ENUM('collaborative', 'assertive', 'methodical', name='tone_enum')), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['tenant_uuid'], ['tenants.uuid'], name=op.f('tenant_settings_tenant_uuid_fkey'), initially='DEFERRED', deferrable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('tenant_settings_pkey'))
    )
    op.create_table('global_prompt_instructions',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('global_prompt', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('settings_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['settings_id'], ['global_settings.uuid'], name=op.f('global_prompt_instructions_settings_id_fkey'), initially='DEFERRED', deferrable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('global_prompt_instructions_pkey'))
    )
    op.create_table('tenant_users',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('tenant_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('email', sa.VARCHAR(length=160), autoincrement=False, nullable=False),
    sa.Column('display_name', sa.VARCHAR(length=120), autoincrement=False, nullable=True),
    sa.Column('password_hash', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('role', sa.VARCHAR(length=30), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.uuid'], name=op.f('tenant_users_tenant_id_fkey'), initially='DEFERRED', deferrable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('tenant_users_pkey'))
    )
    op.create_table('global_tone_settings',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('strategy_name', postgresql.ENUM('term_extension', 'term_extension_scf', name='strategy_enum'), autoincrement=False, nullable=True),
    sa.Column('settings_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('tone', postgresql.ENUM('collaborative', 'assertive', 'methodical', name='tone_enum'), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['settings_id'], ['global_settings.uuid'], name=op.f('global_tone_settings_settings_id_fkey'), initially='DEFERRED', deferrable=True),
    sa.PrimaryKeyConstraint('uuid', name=op.f('global_tone_settings_pkey')),
    sa.UniqueConstraint('strategy_name', name=op.f('uq_global_tone_settings_strategy_name'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.drop_index('idx_messages_thread_uuid', table_name='messages')
    op.drop_table('messages')
    op.drop_table('tone_settings')
    op.drop_table('tenant_strategy_availability')
    op.drop_table('prompt_instructions')
    op.drop_index('uq_users_tenant_email', table_name='users', postgresql_where=sa.text("role IN ('admin', 'user')"))
    op.drop_index('uq_users_platform_email', table_name='users', postgresql_where=sa.text("role = 'global_platform_admin'"))
    op.drop_table('users')
    op.drop_index('uq_settings_tenant', table_name='settings', postgresql_where=sa.text('is_global IS FALSE'))
    op.drop_index('uq_settings_platform_singleton', table_name='settings', postgresql_where=sa.text('is_global IS TRUE'))
    op.drop_table('settings')
    # ### end Alembic commands ###
