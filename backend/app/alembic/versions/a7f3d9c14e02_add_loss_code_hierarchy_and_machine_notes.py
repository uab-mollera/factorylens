"""add loss code hierarchy and machine notes

Revision ID: a7f3d9c14e02
Revises: c3f81b2a9d47
Create Date: 2026-06-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'a7f3d9c14e02'
down_revision = 'c3f81b2a9d47'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- 1. Create losscodetype ---
    op.create_table(
        'losscodetype',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('key', sa.String(length=50), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )

    # Seed 3 fixed types
    shut_id = str(uuid.uuid4())
    slow_id = str(uuid.uuid4())
    normal_id = str(uuid.uuid4())

    op.execute(
        f"INSERT INTO losscodetype (id, key, label, color, display_order) VALUES "
        f"('{shut_id}', 'shut', 'Shut', '#ef4444', 0), "
        f"('{slow_id}', 'slow_production', 'Slow Production', '#eab308', 1), "
        f"('{normal_id}', 'normal_production', 'Normal Production', '#22c55e', 2)"
    )

    # --- 2. Create losscodecategory ---
    op.create_table(
        'losscodecategory',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['type_id'], ['losscodetype.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- 3. Add nullable category_id to losscode ---
    op.add_column('losscode', sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_losscode_category_id',
        'losscode', 'losscodecategory',
        ['category_id'], ['id'],
        ondelete='RESTRICT'
    )

    # --- 4. Data migration: create "General" category under "shut" for each existing category ---
    # Get all distinct category strings from existing loss codes
    connection = op.get_bind()

    # Create a "General" category under "shut" type for all existing loss codes
    general_cat_id = str(uuid.uuid4())
    connection.execute(
        sa.text(
            f"INSERT INTO losscodecategory (id, type_id, name, display_order) "
            f"VALUES ('{general_cat_id}', '{shut_id}', 'General', 0)"
        )
    )

    # Update all existing loss codes to point to "General" under "shut"
    connection.execute(
        sa.text(
            f"UPDATE losscode SET category_id = '{general_cat_id}'"
        )
    )

    # --- 5. Make category_id NOT NULL ---
    op.alter_column('losscode', 'category_id', nullable=False)

    # --- 6. Drop old category and color columns from losscode ---
    op.drop_column('losscode', 'category')
    op.drop_column('losscode', 'color')

    # --- 7. Create machinenote ---
    op.create_table(
        'machinenote',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('machine_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.String(length=5000), nullable=False),
        sa.Column('shift', sa.String(length=20), nullable=False),
        sa.Column('impact', sa.String(length=500), nullable=True),
        sa.Column('criticality', sa.String(length=20), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['machine_id'], ['machine.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['user.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_machinenote_machine_id', 'machinenote', ['machine_id'])

    # --- 8. Create machineaction ---
    op.create_table(
        'machineaction',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('machine_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('owner', sa.String(length=255), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['machine_id'], ['machine.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['user.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_machineaction_machine_id', 'machineaction', ['machine_id'])


def downgrade() -> None:
    op.drop_index('ix_machineaction_machine_id', 'machineaction')
    op.drop_table('machineaction')
    op.drop_index('ix_machinenote_machine_id', 'machinenote')
    op.drop_table('machinenote')

    # Restore category and color columns
    op.add_column('losscode', sa.Column('color', sa.String(length=20), nullable=True))
    op.add_column('losscode', sa.Column('category', sa.String(length=100), nullable=True))

    # Restore defaults
    op.execute("UPDATE losscode SET category = 'General', color = '#6B7280'")
    op.alter_column('losscode', 'category', nullable=False)
    op.alter_column('losscode', 'color', nullable=False)

    op.drop_constraint('fk_losscode_category_id', 'losscode', type_='foreignkey')
    op.drop_column('losscode', 'category_id')
    op.drop_table('losscodecategory')
    op.drop_table('losscodetype')
