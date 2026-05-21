"""initial_schema

Revision ID: 4c265bcc3438
Revises: 
Create Date: 2026-05-21 00:38:37.810811

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '4c265bcc3438'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Opções padrão de tabela para MySQL: charset utf8mb4 garante suporte
# a emojis e caracteres Unicode completos (incluindo U+202A e similares).
MYSQL_OPTS = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}


def upgrade() -> None:
    # Tabelas independentes (sem FK) — criadas primeiro
    op.create_table(
        "account_group",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "category_rule",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("keyword", sa.String(length=100), nullable=False),
        sa.Column("match_type", sa.Enum("contains", "starts_with", "exact", name="matchtype"), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "goal",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("goal_type", sa.Enum("savings", "debt_payoff", "investment", "spending_limit", name="goaltype"), nullable=False),
        sa.Column("target_amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("status", sa.Enum("active", "completed", "cancelled", "paused", name="goalstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "institution",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("parser_type", sa.String(length=50), nullable=False),
        sa.Column("logo_url", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "tag",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        **MYSQL_OPTS,
    )
    op.create_index(op.f("ix_tag_slug"), "tag", ["slug"], unique=True)

    # Tabelas com FK para as independentes
    op.create_table(
        "account",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("account_group_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.Enum("checking", "savings", "credit_card", "investment", name="accounttype"), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["account_group_id"], ["account_group.id"]),
        sa.ForeignKeyConstraint(["institution_id"], ["institution.id"]),
        sa.PrimaryKeyConstraint("id"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "category_rule_tag",
        sa.Column("rule_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["rule_id"], ["category_rule.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tag.id"]),
        sa.PrimaryKeyConstraint("rule_id", "tag_id"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "debt",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("creditor", sa.String(length=100), nullable=False),
        sa.Column("original_amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("current_balance", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("interest_rate", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("installments_total", sa.Integer(), nullable=True),
        sa.Column("installments_paid", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["goal_id"], ["goal.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("goal_id"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "goal_account",
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["account.id"]),
        sa.ForeignKeyConstraint(["goal_id"], ["goal.id"]),
        sa.PrimaryKeyConstraint("goal_id", "account_id"),
        **MYSQL_OPTS,
    )
    op.create_table(
        "import_file",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.Enum("pending", "processing", "processed", "error", name="importstatus"), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["account.id"]),
        sa.PrimaryKeyConstraint("id"),
        **MYSQL_OPTS,
    )
    op.create_index(op.f("ix_import_file_file_hash"), "import_file", ["file_hash"], unique=True)

    # transaction — depende de account e import_file
    op.create_table(
        "transaction",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("import_file_id", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("flow", sa.Enum("income", "expense", "payment", "transfer", name="transactionflow"), nullable=False),
        sa.Column("hash", sa.String(length=64), nullable=False),
        sa.Column("is_manual", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["account_id"], ["account.id"]),
        sa.ForeignKeyConstraint(["import_file_id"], ["import_file.id"]),
        sa.PrimaryKeyConstraint("id"),
        **MYSQL_OPTS,
    )
    op.create_index("ix_transaction_account_date", "transaction", ["account_id", "date"], unique=False)
    op.create_index(op.f("ix_transaction_account_id"), "transaction", ["account_id"], unique=False)
    op.create_index(op.f("ix_transaction_date"), "transaction", ["date"], unique=False)
    op.create_index(op.f("ix_transaction_hash"), "transaction", ["hash"], unique=False)

    # transaction_tag — depende de transaction e tag
    op.create_table(
        "transaction_tag",
        sa.Column("transaction_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["tag_id"], ["tag.id"]),
        sa.ForeignKeyConstraint(["transaction_id"], ["transaction.id"]),
        sa.PrimaryKeyConstraint("transaction_id", "tag_id"),
        **MYSQL_OPTS,
    )


def downgrade() -> None:
    # Ordem inversa respeitando FKs
    op.drop_table("transaction_tag")
    op.drop_index(op.f("ix_transaction_hash"), table_name="transaction")
    op.drop_index(op.f("ix_transaction_date"), table_name="transaction")
    op.drop_index(op.f("ix_transaction_account_id"), table_name="transaction")
    op.drop_index("ix_transaction_account_date", table_name="transaction")
    op.drop_table("transaction")
    op.drop_index(op.f("ix_import_file_file_hash"), table_name="import_file")
    op.drop_table("import_file")
    op.drop_table("goal_account")
    op.drop_table("debt")
    op.drop_table("category_rule_tag")
    op.drop_table("account")
    op.drop_index(op.f("ix_tag_slug"), table_name="tag")
    op.drop_table("tag")
    op.drop_table("institution")
    op.drop_table("goal")
    op.drop_table("category_rule")
    op.drop_table("account_group")
