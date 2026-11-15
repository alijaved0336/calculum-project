"""initial_migration

Revision ID: 58e035b345d4
Revises:
Create Date: 2026-06-10 15:36:44.606103+00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '58e035b345d4'
down_revision = None
branch_labels = None
depends_on = None

_tone_enum = postgresql.ENUM('collaborative', 'assertive', 'methodical', name='tone_enum', create_type=False)
_strategy_enum = postgresql.ENUM('term_extension', 'term_extension_scf', name='strategy_enum', create_type=False)
_message_role_enum = postgresql.ENUM('user', 'ai', name='message_role_enum', create_type=False)


def upgrade() -> None:
    # Create enum types once
    _tone_enum.create(op.get_bind(), checkfirst=True)
    _strategy_enum.create(op.get_bind(), checkfirst=True)
    _message_role_enum.create(op.get_bind(), checkfirst=True)

    op.create_table('buying_entity_ultimate_parents',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.Text(), nullable=False),
    sa.Column('spend_file_version_uuid', sa.UUID(), nullable=True),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('country', sa.Text(), nullable=True),
    sa.Column('main_industry_code', sa.Text(), nullable=True),
    sa.Column('main_industry_name', sa.Text(), nullable=True),
    sa.Column('url', sa.Text(), nullable=True),
    sa.Column('company_size', sa.Text(), nullable=True),
    sa.Column('external_id', sa.Text(), nullable=True),
    sa.Column('ada_updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('feed_sync_state',
    sa.Column('feed', sa.Text(), nullable=False),
    sa.Column('updated_after', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('feed')
    )
    op.create_table('supplier_ultimate_parents',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.Text(), nullable=False),
    sa.Column('spend_file_version_uuid', sa.UUID(), nullable=True),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('received_name', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('phone_number', sa.Text(), nullable=True),
    sa.Column('ownership', sa.Text(), nullable=True),
    sa.Column('stock_ticker', sa.Text(), nullable=True),
    sa.Column('entity_type', sa.Text(), nullable=True),
    sa.Column('country', sa.Text(), nullable=True),
    sa.Column('country_rating', sa.Text(), nullable=True),
    sa.Column('credit_rating', sa.Text(), nullable=True),
    sa.Column('credit_rating_source', sa.Text(), nullable=True),
    sa.Column('main_industry_code', sa.Text(), nullable=True),
    sa.Column('main_industry_name', sa.Text(), nullable=True),
    sa.Column('url', sa.Text(), nullable=True),
    sa.Column('company_size', sa.Text(), nullable=True),
    sa.Column('external_id', sa.Text(), nullable=True),
    sa.Column('provided_internal_id', sa.Text(), nullable=True),
    sa.Column('cost_of_debt_spread', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('wacc_pre_tax', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('wacc_after_tax', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('supplier_financing_rate', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('scf_rate', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('ethnic_minority_owned_business', sa.Boolean(), nullable=True),
    sa.Column('woman_owned_business', sa.Boolean(), nullable=True),
    sa.Column('veteran_owned_business', sa.Boolean(), nullable=True),
    sa.Column('spend_volume', sa.Numeric(precision=20, scale=4), nullable=True),
    sa.Column('negotiation_status', sa.Text(), nullable=True),
    sa.Column('program_applied', sa.Text(), nullable=True),
    sa.Column('success_probability', sa.Text(), nullable=True),
    sa.Column('nine_box_term_extension', sa.Integer(), nullable=True),
    sa.Column('entity_buyer_leverage_level', sa.Text(), nullable=True),
    sa.Column('entity_supplier_leverage_level', sa.Text(), nullable=True),
    sa.Column('is_sme', sa.Boolean(), nullable=True),
    sa.Column('sme_source', sa.Text(), nullable=True),
    sa.Column('dso', sa.Integer(), nullable=True),
    sa.Column('target_opportunity_payment_terms', sa.Integer(), nullable=True),
    sa.Column('target_payment_terms', sa.Integer(), nullable=True),
    sa.Column('target_cash_flow', sa.Numeric(precision=20, scale=4), nullable=True),
    sa.Column('agreed_terms_without_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('agreed_terms_with_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('agreed_cash_discount_percentage', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('negotiation_strategy', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('ada_updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('tenants',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.Text(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('country', sa.Text(), nullable=False),
    sa.Column('ada_updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('uuid'),
    sa.UniqueConstraint('tenant_id')
    )
    op.create_table('buying_entities',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('ultimate_parent_uuid', sa.UUID(), nullable=True),
    sa.Column('tenant_id', sa.Text(), nullable=False),
    sa.Column('spend_file_version_uuid', sa.UUID(), nullable=True),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('country', sa.Text(), nullable=False),
    sa.Column('ada_updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['ultimate_parent_uuid'], ['buying_entity_ultimate_parents.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('spend_file_versions',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.Text(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=False),
    sa.Column('spend_volume', sa.Numeric(precision=20, scale=4), nullable=False),
    sa.Column('supplier_count', sa.Integer(), nullable=False),
    sa.Column('spend_count', sa.Integer(), nullable=False),
    sa.Column('ada_updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['tenant_uuid'], ['tenants.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('suppliers',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('ultimate_parent_uuid', sa.UUID(), nullable=True),
    sa.Column('tenant_id', sa.Text(), nullable=False),
    sa.Column('spend_file_version_uuid', sa.UUID(), nullable=True),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('received_name', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('phone_number', sa.Text(), nullable=True),
    sa.Column('ownership', sa.Text(), nullable=True),
    sa.Column('stock_ticker', sa.Text(), nullable=True),
    sa.Column('entity_type', sa.Text(), nullable=True),
    sa.Column('country', sa.Text(), nullable=True),
    sa.Column('country_rating', sa.Text(), nullable=True),
    sa.Column('credit_rating', sa.Text(), nullable=True),
    sa.Column('credit_rating_source', sa.Text(), nullable=True),
    sa.Column('main_industry_code', sa.Text(), nullable=True),
    sa.Column('main_industry_name', sa.Text(), nullable=True),
    sa.Column('url', sa.Text(), nullable=True),
    sa.Column('company_size', sa.Text(), nullable=True),
    sa.Column('external_id', sa.Text(), nullable=True),
    sa.Column('provided_internal_id', sa.Text(), nullable=True),
    sa.Column('cost_of_debt_spread', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('wacc_pre_tax', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('wacc_after_tax', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('supplier_financing_rate', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('scf_rate', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('ethnic_minority_owned_business', sa.Boolean(), nullable=True),
    sa.Column('woman_owned_business', sa.Boolean(), nullable=True),
    sa.Column('veteran_owned_business', sa.Boolean(), nullable=True),
    sa.Column('spend_volume', sa.Numeric(precision=20, scale=4), nullable=True),
    sa.Column('negotiation_status', sa.Text(), nullable=True),
    sa.Column('program_applied', sa.Text(), nullable=True),
    sa.Column('success_probability', sa.Text(), nullable=True),
    sa.Column('nine_box_term_extension', sa.Integer(), nullable=True),
    sa.Column('entity_buyer_leverage_level', sa.Text(), nullable=True),
    sa.Column('entity_supplier_leverage_level', sa.Text(), nullable=True),
    sa.Column('is_sme', sa.Boolean(), nullable=True),
    sa.Column('sme_source', sa.Text(), nullable=True),
    sa.Column('dso', sa.Integer(), nullable=True),
    sa.Column('target_opportunity_payment_terms', sa.Integer(), nullable=True),
    sa.Column('target_payment_terms', sa.Integer(), nullable=True),
    sa.Column('target_cash_flow', sa.Numeric(precision=20, scale=4), nullable=True),
    sa.Column('agreed_terms_without_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('agreed_terms_with_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('agreed_cash_discount_percentage', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('negotiation_strategy', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('ada_updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['ultimate_parent_uuid'], ['supplier_ultimate_parents.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('tenant_settings',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_uuid', sa.UUID(), nullable=False),
    sa.Column('enabled_tones', postgresql.ARRAY(_tone_enum), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['tenant_uuid'], ['tenants.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('tenant_users',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=160), nullable=False),
    sa.Column('display_name', sa.String(length=120), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=True),
    sa.Column('role', sa.String(length=30), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('spends',
    sa.Column('spend_uuid', sa.UUID(), nullable=False),
    sa.Column('spend_file_version_uuid', sa.UUID(), nullable=False),
    sa.Column('supplier_uuid', sa.UUID(), nullable=False),
    sa.Column('buying_entity_uuid', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.Text(), nullable=False),
    sa.Column('alias', sa.Text(), nullable=False),
    sa.Column('spend_volume', sa.Numeric(precision=20, scale=4), nullable=False),
    sa.Column('transaction_currency', sa.Text(), nullable=False),
    sa.Column('procurement_team', sa.Text(), nullable=False),
    sa.Column('commodity', sa.Text(), nullable=True),
    sa.Column('hs_code', sa.Text(), nullable=True),
    sa.Column('hs_description', sa.Text(), nullable=True),
    sa.Column('currently_on_scf', sa.Boolean(), nullable=False),
    sa.Column('currently_on_vcard', sa.Boolean(), nullable=False),
    sa.Column('program_applied', sa.Text(), nullable=True),
    sa.Column('base_rate', sa.Numeric(precision=10, scale=6), nullable=False),
    sa.Column('scf_rate', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('actual_payment_terms', sa.Integer(), nullable=False),
    sa.Column('term_description', sa.Text(), nullable=True),
    sa.Column('contractual_without_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('contractual_with_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('cash_discount_percentage', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('last_term_negotiation', sa.Date(), nullable=True),
    sa.Column('aggregated_lines_count', sa.Integer(), nullable=False),
    sa.Column('negotiation_status', sa.Text(), nullable=False),
    sa.Column('custom_data_points', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
    sa.Column('target_opportunity_payment_terms', sa.Integer(), nullable=True),
    sa.Column('target_payment_terms', sa.Integer(), nullable=True),
    sa.Column('target_cash_flow', sa.Numeric(precision=20, scale=4), nullable=True),
    sa.Column('agreed_terms_without_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('agreed_terms_with_cash_discounts', sa.Integer(), nullable=True),
    sa.Column('agreed_cash_discount_percentage', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('scf_accepted', sa.Boolean(), nullable=True),
    sa.Column('vcard_accepted', sa.Boolean(), nullable=True),
    sa.Column('negotiation_strategy', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('ada_updated_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['buying_entity_uuid'], ['buying_entities.uuid'], initially='deferred', deferrable=True),
    sa.ForeignKeyConstraint(['spend_file_version_uuid'], ['spend_file_versions.uuid'], initially='deferred', deferrable=True),
    sa.ForeignKeyConstraint(['supplier_uuid'], ['suppliers.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('spend_uuid')
    )
    op.create_table('tenant_prompt_instructions',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('prompt', sa.Text(), nullable=True),
    sa.Column('settings_id', sa.UUID(), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['settings_id'], ['tenant_settings.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_table('tenant_tone_settings',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('strategy_name', _strategy_enum, nullable=True),
    sa.Column('settings_id', sa.UUID(), nullable=False),
    sa.Column('tone', _tone_enum, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['settings_id'], ['tenant_settings.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid'),
    sa.UniqueConstraint('strategy_name', name='uq_tone_settings_strategy_name')
    )
    op.create_table('threads',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('supplier_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=100), nullable=False),
    sa.Column('tone', _tone_enum, nullable=True),
    sa.Column('reaction', sa.Boolean(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('feedback', sa.Text(), nullable=True),
    sa.Column('pinned', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.uuid'], initially='deferred', deferrable=True),
    sa.ForeignKeyConstraint(['user_id'], ['tenant_users.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_index('idx_threads_supplier_id', 'threads', ['supplier_id'], unique=False)
    op.create_index('idx_threads_user_id', 'threads', ['user_id'], unique=False)
    op.create_table('chat_messages',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('thread_id', sa.UUID(), nullable=False),
    sa.Column('role', _message_role_enum, nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('tokens_in', sa.Integer(), nullable=True),
    sa.Column('tokens_out', sa.Integer(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['thread_id'], ['threads.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_index('idx_cm_thread_id', 'chat_messages', ['thread_id'], unique=False)
    op.create_table('thread_summaries',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('thread_id', sa.UUID(), nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('token_count', sa.Integer(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['thread_id'], ['threads.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_index('idx_ts_thread_id', 'thread_summaries', ['thread_id'], unique=False)
    op.create_table('thread_playbooks',
    sa.Column('uuid', sa.UUID(), nullable=False),
    sa.Column('thread_id', sa.UUID(), nullable=False),
    sa.Column('url', sa.Text(), nullable=True),
    sa.Column('playbook_name', sa.String(length=100), nullable=True),
    sa.Column('message_id', sa.UUID(), nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['message_id'], ['chat_messages.uuid'], initially='deferred', deferrable=True),
    sa.ForeignKeyConstraint(['thread_id'], ['threads.uuid'], initially='deferred', deferrable=True),
    sa.PrimaryKeyConstraint('uuid')
    )
    op.create_index('idx_tp_thread_id', 'thread_playbooks', ['thread_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_tp_thread_id', table_name='thread_playbooks')
    op.drop_table('thread_playbooks')
    op.drop_index('idx_ts_thread_id', table_name='thread_summaries')
    op.drop_table('thread_summaries')
    op.drop_index('idx_cm_thread_id', table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index('idx_threads_user_id', table_name='threads')
    op.drop_index('idx_threads_supplier_id', table_name='threads')
    op.drop_table('threads')
    op.drop_table('tenant_tone_settings')
    op.drop_table('tenant_prompt_instructions')
    op.execute('DROP VIEW IF EXISTS api_attributes CASCADE')
    op.drop_table('spends')
    op.drop_table('tenant_users')
    op.drop_table('tenant_settings')
    op.drop_table('suppliers')
    op.drop_table('spend_file_versions')
    op.drop_table('buying_entities')
    op.drop_table('tenants')
    op.drop_table('supplier_ultimate_parents')
    op.drop_table('feed_sync_state')
    op.drop_table('buying_entity_ultimate_parents')
    _tone_enum.drop(op.get_bind(), checkfirst=True)
    _strategy_enum.drop(op.get_bind(), checkfirst=True)
    _message_role_enum.drop(op.get_bind(), checkfirst=True)
