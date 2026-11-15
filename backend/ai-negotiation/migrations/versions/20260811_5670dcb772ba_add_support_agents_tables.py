"""add support agents tables

Revision ID: 5670dcb772ba
Revises: d5e6f7a8b9c0
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "5670dcb772ba"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def _has_column(table: str, column: str) -> bool:
    return column in {item["name"] for item in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    if not _has_table("video_kb_documents"):
        op.create_table(
            "video_kb_documents",
            sa.Column("uuid", sa.UUID(), nullable=False),
            sa.Column("uploaded_by_user_uuid", sa.UUID(), nullable=False),
            sa.Column("filename", sa.String(length=500), nullable=False),
            sa.Column("file_type", sa.String(length=30), nullable=True),
            sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
            sa.Column("page_count", sa.Integer(), nullable=True),
            sa.Column("storage_url", sa.Text(), nullable=True),
            sa.Column("media_type", sa.String(length=16), server_default=sa.text("'document'"), nullable=False),
            sa.Column("title", sa.String(length=500), nullable=True),
            sa.Column("status", sa.String(length=64), server_default=sa.text("'uploading'"), nullable=False),
            sa.Column("video_status", sa.String(length=32), nullable=True),
            sa.Column("transcript_status", sa.String(length=32), nullable=True),
            sa.Column("document_status", sa.String(length=32), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("is_already_uploaded", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("chunk_count", sa.Integer(), nullable=True),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("is_public", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.ForeignKeyConstraint(["uploaded_by_user_uuid"], ["users.uuid"], deferrable=True, initially="DEFERRED"),
            sa.PrimaryKeyConstraint("uuid"),
        )
    elif not _has_column("video_kb_documents", "is_public"):
        op.add_column(
            "video_kb_documents",
            sa.Column("is_public", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )

    if not _has_table("support_threads"):
        op.create_table(
            "support_threads",
            sa.Column("uuid", sa.UUID(), nullable=False),
            sa.Column("user_uuid", sa.UUID(), nullable=False),
            sa.Column("title", sa.String(), nullable=True),
            sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("uuid"),
        )
        op.create_index("ix_support_threads_user_uuid", "support_threads", ["user_uuid"])

    if not _has_table("support_messages"):
        op.create_table(
            "support_messages",
            sa.Column("uuid", sa.UUID(), nullable=False),
            sa.Column("thread_uuid", sa.UUID(), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["thread_uuid"], ["support_threads.uuid"]),
            sa.PrimaryKeyConstraint("uuid"),
        )
        op.create_index("ix_support_messages_thread_uuid", "support_messages", ["thread_uuid"])

    op.execute("DROP TABLE IF EXISTS ingestion_alembic_version")
    op.execute("DROP TABLE IF EXISTS support_alembic_version")


def downgrade() -> None:
    # These tables can predate this migration, so a rollback must never delete their data.
    pass
