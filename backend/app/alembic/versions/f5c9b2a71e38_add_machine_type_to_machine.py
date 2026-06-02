"""add machine_type to machine

Revision ID: f5c9b2a71e38
Revises: a7f3d9c14e02
Create Date: 2026-06-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f5c9b2a71e38'
down_revision = 'a7f3d9c14e02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('machine', sa.Column('machine_type', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('machine', 'machine_type')
