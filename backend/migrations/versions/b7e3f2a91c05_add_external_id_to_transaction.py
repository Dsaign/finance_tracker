"""add external_id to transaction

Revision ID: b7e3f2a91c05
Revises: 4c265bcc3438
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b7e3f2a91c05'
down_revision: Union[str, Sequence[str], None] = '4c265bcc3438'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transaction',
        sa.Column('external_id', sa.String(length=100), nullable=True),
    )
    op.create_index('ix_transaction_external_id', 'transaction', ['external_id'])


def downgrade() -> None:
    op.drop_index('ix_transaction_external_id', table_name='transaction')
    op.drop_column('transaction', 'external_id')
