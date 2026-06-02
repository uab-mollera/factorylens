"""add machine events

Revision ID: c8d3f1a29e57
Revises: f5c9b2a71e38
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "c8d3f1a29e57"
down_revision = "f5c9b2a71e38"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "machineevent",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "event_type",
            sa.String(length=50),
            nullable=False,
            server_default="operator_note",
        ),
        sa.Column(
            "severity",
            sa.String(length=20),
            nullable=False,
            server_default="info",
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "source",
            sa.String(length=20),
            nullable=False,
            server_default="operator",
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "related_action_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.ForeignKeyConstraint(
            ["machine_id"], ["machine.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["created_by"], ["user.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["related_action_id"], ["machineaction.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_machineevent_machine_id", "machineevent", ["machine_id"]
    )
    op.create_index(
        "ix_machineevent_timestamp", "machineevent", ["timestamp"]
    )


def downgrade() -> None:
    op.drop_index("ix_machineevent_timestamp", table_name="machineevent")
    op.drop_index("ix_machineevent_machine_id", table_name="machineevent")
    op.drop_table("machineevent")
