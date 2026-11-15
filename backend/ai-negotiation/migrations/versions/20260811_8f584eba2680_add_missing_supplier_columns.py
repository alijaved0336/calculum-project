"""

Revision ID: 8f584eba2680
Revises: 5670dcb772ba
Create Date: 2026-08-11 13:45:44.204315+00:00
"""

from alembic import op
import sqlalchemy as sa


revision = '8f584eba2680'
down_revision = '5670dcb772ba'
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    return column_name in {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)
    }


def upgrade() -> None:
    for table_name in ("suppliers", "supplier_ultimate_parents"):
        if not _has_column(table_name, "nine_box_term_extension"):
            op.add_column(
                table_name,
                sa.Column("nine_box_term_extension", sa.Integer(), nullable=True),
            )


def downgrade() -> None:
    # This migration may run where these columns already existed, so do not drop them.
    pass
