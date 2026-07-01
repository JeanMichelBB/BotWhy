"""credit schema

Revision ID: 001
Revises:
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('credit_balance_cents', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('deleted_at', sa.TIMESTAMP(), nullable=True))

    op.create_table(
        'credit_transactions',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('stripe_payment_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('credit_transactions')
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'is_deleted')
    op.drop_column('users', 'credit_balance_cents')
