"""Performance indexes for the document/JSONB data layer.

The MongoRepository queries Document.data via jsonb_extract_path_text.
Without a GIN index on the JSONB column every query is a sequential scan.

Revision ID: 0002
Revises: 001
Create Date: 2026-09-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Frequently queried JSONB fields (used by MongoRepository predicates across
# route modules — identity, roles, workflow status, foreign references).
_HOT_FIELDS = [
    "email",
    "role",
    "status",
    "hospital_id",
    "user_id",
    "assignment_id",
    "created_at",
    "isVerified",
]


def _index_exists(bind, name: str) -> bool:
    result = bind.execute(
        sa.text("SELECT 1 FROM pg_indexes WHERE indexname = :name"),
        {"name": name},
    )
    return result.scalar() is not None


def upgrade() -> None:
    bind = op.get_bind()

    # Guard: documents table may not exist on brand-new deployments until
    # Base.metadata.create_all (dev) or the initial bootstrap runs. The 001
    # revision is a marker, so create the table here if it is missing.
    docs = bind.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'documents')"
        )
    ).scalar()
    if not docs:
        op.create_table(
            "documents",
            sa.Column("id", sa.String(length=40), primary_key=True),
            sa.Column("collection", sa.String(length=120), nullable=False, index=True),
            sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, index=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, index=True),
        )

    bind.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))

    if not _index_exists(bind, "ix_documents_collection_created_at"):
        bind.execute(
            sa.text(
                "CREATE INDEX ix_documents_collection_created_at "
                "ON documents (collection, created_at DESC)"
            )
        )

    if not _index_exists(bind, "ix_documents_data_gin"):
        bind.execute(sa.text("CREATE INDEX ix_documents_data_gin ON documents USING gin (data)"))

    for field in _HOT_FIELDS:
        name = f"ix_documents_data_{field}"
        if not _index_exists(bind, name):
            # expression index over the JSONB path — matches _json_path_expr usage
            bind.execute(
                sa.text(
                    f"CREATE INDEX {name} ON documents "
                    f"USING gin ((data -> '{field}') jsonb_path_ops)"
                )
            )

    if not _index_exists(bind, "ix_documents_email_trgm"):
        bind.execute(
            sa.text(
                "CREATE INDEX ix_documents_email_trgm ON documents "
                "USING gin ((data ->> 'email') gin_trgm_ops)"
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    for name in ["ix_documents_email_trgm", "ix_documents_data_gin"] + [
        f"ix_documents_data_{f}" for f in _HOT_FIELDS
    ] + ["ix_documents_collection_created_at"]:
        bind.execute(sa.text(f"DROP INDEX IF EXISTS {name}"))
