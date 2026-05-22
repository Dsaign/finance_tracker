"""add opening_balance, opening_date to account; competencia to transaction

Revision ID: d2a3f1c89b47
Revises: c4d1e8f23b90
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd2a3f1c89b47'
down_revision: Union[str, Sequence[str], None] = 'c4d1e8f23b90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('account', sa.Column(
        'opening_balance',
        sa.Numeric(precision=15, scale=2),
        nullable=False,
        server_default='0.00',
    ))
    op.add_column('account', sa.Column(
        'opening_date',
        sa.Date(),
        nullable=True,
    ))
    op.add_column('transaction', sa.Column(
        'competencia',
        sa.String(length=7),
        nullable=True,
    ))


def downgrade() -> None:
    op.drop_column('transaction', 'competencia')
    op.drop_column('account', 'opening_date')
    op.drop_column('account', 'opening_balance')
