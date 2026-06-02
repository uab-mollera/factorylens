"""add entity_id to hierarchy_view

Revision ID: c3f81b2a9d47
Revises: ba212a2bf2e5
Create Date: 2026-05-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'c3f81b2a9d47'
down_revision = 'ba212a2bf2e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'hierarchyview',
        sa.Column('entity_id', sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f('ix_hierarchyview_entity_id'),
        'hierarchyview',
        ['entity_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_hierarchyview_entity_id'), table_name='hierarchyview')
    op.drop_column('hierarchyview', 'entity_id')
