"""add_entity_value_campaign_state_and_missing_tables

Revision ID: a3c91f4e8b12
Revises: 7da2835770bb
Create Date: 2026-04-09 04:30:00.000000

Covers all ORM models added since the last migration:
- analyst_verdicts: new entity_value column (indexed)
- registered_assets: new table
- hunt_queries: new table
- campaign_state: new table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c91f4e8b12'
down_revision: Union[str, Sequence[str], None] = '7da2835770bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ── 1. Add entity_value column to analyst_verdicts ──────────
    op.add_column(
        'analyst_verdicts',
        sa.Column('entity_value', sa.String(length=256), nullable=True),
    )
    op.create_index(
        op.f('ix_analyst_verdicts_entity_value'),
        'analyst_verdicts',
        ['entity_value'],
        unique=False,
    )

    # ── 2. registered_assets table ──────────────────────────────
    op.create_table(
        'registered_assets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('asset_name', sa.String(length=256), nullable=False),
        sa.Column('criticality_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_registered_assets_tenant_id'),
        'registered_assets',
        ['tenant_id'],
        unique=False,
    )
    op.create_index(
        'idx_registered_assets_name',
        'registered_assets',
        ['tenant_id', 'asset_name'],
        unique=True,
    )

    # ── 3. hunt_queries table ───────────────────────────────────
    op.create_table(
        'hunt_queries',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=128), nullable=False),
        sa.Column('query_text', sa.Text(), nullable=False),
        sa.Column('query_mode', sa.String(length=16), nullable=False),
        sa.Column('uql_output', sa.Text(), nullable=True),
        sa.Column('result_count', sa.Integer(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_hunt_queries_tenant_id'),
        'hunt_queries',
        ['tenant_id'],
        unique=False,
    )
    op.create_index(
        'idx_hunt_queries_user',
        'hunt_queries',
        ['tenant_id', 'user_id', 'executed_at'],
        unique=False,
    )

    # ── 4. campaign_state table ─────────────────────────────────
    op.create_table(
        'campaign_state',
        sa.Column('campaign_id', sa.String(length=64), nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('severity', sa.String(length=16), nullable=True),
        sa.Column('stage', sa.String(length=64), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True),
        sa.Column('affected_assets', sa.Integer(), nullable=True),
        sa.Column('meta_score', sa.Float(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('campaign_id'),
    )
    op.create_index(
        op.f('ix_campaign_state_tenant_id'),
        'campaign_state',
        ['tenant_id'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # campaign_state
    op.drop_index(op.f('ix_campaign_state_tenant_id'), table_name='campaign_state')
    op.drop_table('campaign_state')

    # hunt_queries
    op.drop_index('idx_hunt_queries_user', table_name='hunt_queries')
    op.drop_index(op.f('ix_hunt_queries_tenant_id'), table_name='hunt_queries')
    op.drop_table('hunt_queries')

    # registered_assets
    op.drop_index('idx_registered_assets_name', table_name='registered_assets')
    op.drop_index(op.f('ix_registered_assets_tenant_id'), table_name='registered_assets')
    op.drop_table('registered_assets')

    # entity_value column
    op.drop_index(op.f('ix_analyst_verdicts_entity_value'), table_name='analyst_verdicts')
    op.drop_column('analyst_verdicts', 'entity_value')
