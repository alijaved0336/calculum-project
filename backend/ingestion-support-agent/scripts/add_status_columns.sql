-- Local-dev bootstrap: add the granular status columns to kb_documents.
--
-- The canonical schema is owned by the AI Negotiation repo (alembic). This
-- idempotent script lets this service self-provision the two new columns on a
-- local/dev database so tests and manual runs aren't blocked on that repo.
--
-- Apply:  psql "$DATABASE_URL" -f scripts/add_status_columns.sql
--   or:   PGPASSWORD=calculum psql -h 127.0.0.1 -U calculum -d calculum -f scripts/add_status_columns.sql

ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS video_status      VARCHAR(32);
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS transcript_status VARCHAR(32);
