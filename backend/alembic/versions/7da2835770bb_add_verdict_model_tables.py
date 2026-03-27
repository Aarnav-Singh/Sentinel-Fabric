"""add_verdict_model_tables

Revision ID: 7da2835770bb
Revises: 1fbcdc4642d4
Create Date: 2026-03-27 18:29:21.056484

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7da2835770bb'
down_revision: Union[str, Sequence[str], None] = '1fbcdc4642d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('verdict_buffer',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('finding_id', sa.String(length=36), nullable=False),
        sa.Column('features_json', sa.Text(), nullable=False),
        sa.Column('label', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_verdict_buffer_tenant_id'), 'verdict_buffer', ['tenant_id'], unique=False)
    
    op.create_table('model_versions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('version', sa.String(length=32), nullable=False),
        sa.Column('xgb_f1', sa.Float(), nullable=True),
        sa.Column('rf_f1', sa.Float(), nullable=True),
        sa.Column('previous_f1', sa.Float(), nullable=True),
        sa.Column('buffer_size', sa.Integer(), nullable=True),
        sa.Column('training_time_seconds', sa.Float(), nullable=True),
        sa.Column('trained_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_model_versions_tenant_id'), 'model_versions', ['tenant_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_model_versions_tenant_id'), table_name='model_versions')
    op.drop_table('model_versions')
    op.drop_index(op.f('ix_verdict_buffer_tenant_id'), table_name='verdict_buffer')
    op.drop_table('verdict_buffer')
