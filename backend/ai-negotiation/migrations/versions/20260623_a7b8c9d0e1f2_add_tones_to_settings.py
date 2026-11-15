"""add tones to settings

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-06-23 10:00:00.000000+00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a7b8c9d0e1f2"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None

_tone_enum = postgresql.ENUM(
    "collaborative", "assertive", "methodical", name="tone_enum", create_type=False
)


def upgrade() -> None:
    op.add_column(
        "settings",
        sa.Column("tones", postgresql.ARRAY(_tone_enum), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE settings SET tones = ARRAY['collaborative', 'assertive', 'methodical']::tone_enum[] "
            "WHERE tones IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_column("settings", "tones")
