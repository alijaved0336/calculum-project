from sqlalchemy.orm import DeclarativeBase


class IngestionBase(DeclarativeBase):
    """Dedicated declarative base for tables **owned by this ingestion service**.

    Kept separate from the shared ``Base`` (which maps AI-Negotiation-owned tables like
    ``kb_documents``/``users``) so Alembic here can target ``IngestionBase.metadata`` and
    only ever see our own table — it can never autogenerate/drop the shared schema.
    """
