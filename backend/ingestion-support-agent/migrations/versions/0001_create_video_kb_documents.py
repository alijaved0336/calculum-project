"""create video_kb_documents (ingestion-owned tracking table)

Revision ID: 0001_video_kb_documents
Revises:
Create Date: 2026-07-13

Creates only this repo's own table. The FK targets the existing shared ``users`` table
(valid at DDL time since ``users`` already exists); nothing in the shared schema is altered.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_video_kb_documents"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "video_kb_documents",
        sa.Column("uuid", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("uploaded_by_user_uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("file_type", sa.String(30), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("storage_url", sa.Text(), nullable=True),
        sa.Column("media_type", sa.String(16), nullable=False, server_default="document"),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("status", sa.String(64), nullable=False, server_default="uploading"),
        sa.Column("video_status", sa.String(32), nullable=True),
        sa.Column("transcript_status", sa.String(32), nullable=True),
        sa.Column("document_status", sa.String(32), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_already_uploaded", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("chunk_count", sa.Integer(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at", postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by_user_uuid"], ["users.uuid"],
            name="fk_video_kb_documents_uploaded_by_users",
            deferrable=True, initially="DEFERRED",
        ),
    )


def downgrade() -> None:
    op.drop_table("video_kb_documents")
