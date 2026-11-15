"""create support chat tables (support_threads, support_messages)

Revision ID: 0001_support_chat
Revises:
Create Date: 2026-07-22

Root of the support-chat lineage (down_revision = None) under the isolated
``support_alembic_version`` table — independent of the AI Negotiation / ingestion lineages.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_support_chat"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "support_threads",
        sa.Column("uuid", postgresql.UUID(as_uuid=True), primary_key=True),
        # Soft reference to the AI-Negotiation-owned `users` table (indexed, no hard FK —
        # avoids cross-lineage migration ordering; mirrors how UserReader references users).
        sa.Column("user_uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_support_threads_user_uuid", "support_threads", ["user_uuid"])

    op.create_table(
        "support_messages",
        sa.Column("uuid", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "thread_uuid",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("support_threads.uuid", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant')", name="ck_support_messages_role"),
    )
    op.create_index("ix_support_messages_thread_uuid", "support_messages", ["thread_uuid"])


def downgrade() -> None:
    op.drop_index("ix_support_messages_thread_uuid", table_name="support_messages")
    op.drop_table("support_messages")
    op.drop_index("ix_support_threads_user_uuid", table_name="support_threads")
    op.drop_table("support_threads")
