"""Initial schema

Revision ID: 001
Revises: None
Create Date: 2026-08-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enterprise_users table (government + hospital auth)
    op.create_table(
        'enterprise_users',
        sa.Column('id', sa.String(128), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('portal_type', sa.String(50), nullable=False),
        sa.Column('organization_id', sa.String(128), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create predictions table
    op.create_table(
        'predictions',
        sa.Column('id', sa.String(128), primary_key=True),
        sa.Column('type', sa.String(100), nullable=False, index=True),
        sa.Column('result', sa.JSON, nullable=False),
        sa.Column('confidence', sa.Float, default=0.0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create audit_log table
    op.create_table(
        'audit_log',
        sa.Column('id', sa.String(128), primary_key=True),
        sa.Column('user_id', sa.String(128), nullable=True),
        sa.Column('action', sa.String(255), nullable=False),
        sa.Column('details', sa.JSON, nullable=True),
        sa.Column('hash', sa.String(64), nullable=False),
        sa.Column('prev_hash', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create patient_encounters table for FHIR
    op.create_table(
        'patient_encounters',
        sa.Column('id', sa.String(128), primary_key=True),
        sa.Column('patient_id', sa.String(128), nullable=False, index=True),
        sa.Column('hospital_id', sa.String(128), nullable=False),
        sa.Column('encounter_type', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('period_start', sa.DateTime, nullable=True),
        sa.Column('period_end', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create leave_requests table
    op.create_table(
        'leave_requests',
        sa.Column('id', sa.String(128), primary_key=True),
        sa.Column('hospital_id', sa.String(128), nullable=False, index=True),
        sa.Column('staff_id', sa.String(128), nullable=False),
        sa.Column('staff_name', sa.String(255), nullable=False),
        sa.Column('start_date', sa.String(50), nullable=False),
        sa.Column('end_date', sa.String(50), nullable=False),
        sa.Column('reason', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Create staff_schedule table
    op.create_table(
        'staff_schedule',
        sa.Column('id', sa.String(128), primary_key=True),
        sa.Column('hospital_id', sa.String(128), nullable=False, index=True),
        sa.Column('staff_id', sa.String(128), nullable=False),
        sa.Column('staff_name', sa.String(255), nullable=False),
        sa.Column('shift', sa.String(100), nullable=False),
        sa.Column('department', sa.String(100), nullable=False),
        sa.Column('date', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), default='scheduled'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('staff_schedule')
    op.drop_table('leave_requests')
    op.drop_table('patient_encounters')
    op.drop_table('audit_log')
    op.drop_table('predictions')
    op.drop_table('enterprise_users')
