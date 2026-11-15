"""add is_public column to video_kb_documents

Revision ID: 0002_add_is_public
Revises: 0001_video_kb_documents
Create Date: 2026-07-29

Document visibility flag. Public documents are cited (and downloadable) for all users;
private ones only for admins. A nullable-free boolean with a ``false`` server default, so
every existing row becomes private without a backfill and existing code is unaffected.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_add_is_public"
down_revision = "0001_video_kb_documents"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "video_kb_documents",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("video_kb_documents", "is_public")
