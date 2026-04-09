"""add tenant and cep rule tables

Revision ID: b2c91f4e8b13
Revises: a3c91f4e8b12
Create Date: 2026-04-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c91f4e8b13'
down_revision: Union[str, None] = 'a3c91f4e8b12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create tenants table
    op.create_table(
        'tenants',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Create cep_rules table
    op.create_table(
        'cep_rules',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('description', sa.String(length=1024), nullable=False),
        sa.Column('stages_json', sa.String(length=4096), nullable=False),
        sa.Column('max_span_seconds', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(length=32), nullable=False, server_default='HIGH'),
        sa.Column('mitre_tactic', sa.String(length=32), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cep_rules_tenant_id', 'cep_rules', ['tenant_id'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_cep_rules_tenant_id', table_name='cep_rules')
    op.drop_table('cep_rules')
    op.drop_table('tenants')
