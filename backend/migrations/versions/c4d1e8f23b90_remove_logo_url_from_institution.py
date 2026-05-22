"""remove logo_url from institution

Revision ID: c4d1e8f23b90
Revises: b7e3f2a91c05
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c4d1e8f23b90'
down_revision: Union[str, Sequence[str], None] = 'b7e3f2a91c05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('institution', 'logo_url')


def downgrade() -> None:
    op.add_column(
        'institution',
        sa.Column('logo_url', sa.String(length=255), nullable=True),
    )
