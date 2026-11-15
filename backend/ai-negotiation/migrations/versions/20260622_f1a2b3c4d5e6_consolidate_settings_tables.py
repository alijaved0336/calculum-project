"""consolidate settings tables

Revision ID: f1a2b3c4d5e6
Revises: e82429b6e72e
Create Date: 2026-06-22 15:00:00.000000+00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f1a2b3c4d5e6"
down_revision = "e82429b6e72e"
branch_labels = None
depends_on = None

_strategy_enum = postgresql.ENUM(
    "term_extension", "term_extension_scf", name="strategy_enum", create_type=False
)


def upgrade() -> None:
    op.add_column(
        "settings",
        sa.Column("strategies", postgresql.ARRAY(_strategy_enum), nullable=True),
    )
    op.add_column(
        "settings",
        sa.Column("global_strategy", postgresql.ARRAY(_strategy_enum), nullable=True),
    )
    op.add_column(
        "settings",
        sa.Column("strategy_tone_map", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "settings",
        sa.Column("prompt_instructions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.drop_index(
        "uq_settings_platform_singleton",
        table_name="settings",
        postgresql_where=sa.text("is_global IS TRUE"),
    )
    op.drop_index(
        "uq_settings_tenant",
        table_name="settings",
        postgresql_where=sa.text("is_global IS FALSE"),
    )
    op.drop_constraint("ck_settings_global_tenant_scope", "settings", type_="check")
    op.drop_column("settings", "enabled_tones")
    op.drop_column("settings", "is_global")

    op.create_index(
        "uq_settings_platform_singleton",
        "settings",
        [sa.text("(1)")],
        unique=True,
        postgresql_where=sa.text("tenant_uuid IS NULL"),
    )
    op.create_index(
        "uq_settings_tenant",
        "settings",
        ["tenant_uuid"],
        unique=True,
        postgresql_where=sa.text("tenant_uuid IS NOT NULL"),
    )

    op.drop_table("tone_settings")
    op.drop_table("tenant_strategy_availability")
    op.drop_table("prompt_instructions")


def downgrade() -> None:
    _tone_enum = postgresql.ENUM(
        "collaborative", "assertive", "methodical", name="tone_enum", create_type=False
    )

    op.create_table(
        "prompt_instructions",
        sa.Column("uuid", sa.UUID(), nullable=False),
        sa.Column("settings_uuid", sa.UUID(), nullable=False),
        sa.Column("user_uuid", sa.UUID(), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("is_conflicted", sa.Boolean(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("is_global", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["settings_uuid"], ["settings.uuid"], initially="deferred", deferrable=True
        ),
        sa.ForeignKeyConstraint(
            ["user_uuid"], ["users.uuid"], initially="deferred", deferrable=True
        ),
        sa.PrimaryKeyConstraint("uuid"),
    )
    op.create_table(
        "tenant_strategy_availability",
        sa.Column("uuid", sa.UUID(), nullable=False),
        sa.Column("tenant_uuid", sa.UUID(), nullable=False),
        sa.Column("settings_uuid", sa.UUID(), nullable=False),
        sa.Column("is_global", sa.Boolean(), nullable=False),
        sa.Column("enabled_strategies", postgresql.ARRAY(_strategy_enum), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["settings_uuid"], ["settings.uuid"], initially="deferred", deferrable=True
        ),
        sa.ForeignKeyConstraint(
            ["tenant_uuid"], ["tenants.uuid"], initially="deferred", deferrable=True
        ),
        sa.PrimaryKeyConstraint("uuid"),
        sa.UniqueConstraint("tenant_uuid", name="uq_tenant_strategy_availability_tenant"),
    )
    op.create_table(
        "tone_settings",
        sa.Column("uuid", sa.UUID(), nullable=False),
        sa.Column("is_global", sa.Boolean(), nullable=False),
        sa.Column("settings_uuid", sa.UUID(), nullable=False),
        sa.Column("strategy_name", _strategy_enum, nullable=True),
        sa.Column("tone", _tone_enum, nullable=True),
        sa.Column("deleted_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["settings_uuid"], ["settings.uuid"], initially="deferred", deferrable=True
        ),
        sa.PrimaryKeyConstraint("uuid"),
        sa.UniqueConstraint(
            "settings_uuid", "strategy_name", name="uq_tone_settings_settings_strategy"
        ),
    )

    op.drop_index(
        "uq_settings_tenant",
        table_name="settings",
        postgresql_where=sa.text("tenant_uuid IS NOT NULL"),
    )
    op.drop_index(
        "uq_settings_platform_singleton",
        table_name="settings",
        postgresql_where=sa.text("tenant_uuid IS NULL"),
    )

    op.add_column("settings", sa.Column("is_global", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(
        "settings",
        sa.Column("enabled_tones", postgresql.ARRAY(_tone_enum), nullable=True),
    )
    op.alter_column("settings", "is_global", server_default=None)

    op.create_check_constraint(
        "ck_settings_global_tenant_scope",
        "settings",
        "(is_global = true AND tenant_uuid IS NULL) "
        "OR (is_global = false AND tenant_uuid IS NOT NULL)",
    )
    op.create_index(
        "uq_settings_platform_singleton",
        "settings",
        ["is_global"],
        unique=True,
        postgresql_where=sa.text("is_global IS TRUE"),
    )
    op.create_index(
        "uq_settings_tenant",
        "settings",
        ["tenant_uuid"],
        unique=True,
        postgresql_where=sa.text("is_global IS FALSE"),
    )

    op.drop_column("settings", "prompt_instructions")
    op.drop_column("settings", "strategy_tone_map")
    op.drop_column("settings", "global_strategy")
    op.drop_column("settings", "strategies")
