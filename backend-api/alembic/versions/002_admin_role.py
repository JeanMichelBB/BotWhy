"""admin role and app settings

Revision ID: 002
Revises: 001
Create Date: 2026-07-05
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(20), nullable=False, server_default='user'))

    op.create_table(
        'app_settings',
        sa.Column('key', sa.String(64), primary_key=True),
        sa.Column('value', sa.String(255), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('app_settings')
    op.drop_column('users', 'role')
