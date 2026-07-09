"""provider generation id for cost reconciliation

Revision ID: 003
Revises: 002
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('credit_transactions', sa.Column('provider_generation_id', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('credit_transactions', 'provider_generation_id')
