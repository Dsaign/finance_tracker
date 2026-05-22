import enum
import hashlib
import datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, Boolean, ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin
from .tag import transaction_tag


class TransactionFlow(str, enum.Enum):
    income = "income"       # Entrada (crédito na conta)
    expense = "expense"     # Saída (débito ou gasto no cartão)
    payment = "payment"     # Pagamento de fatura (cartão de crédito)
    transfer = "transfer"   # Transferência entre contas próprias


class Transaction(Base, TimestampMixin):
    """
    Transação financeira individual.

    Pode ser originada de uma importação (import_file_id preenchido)
    ou criada/editada manualmente (is_manual=True).

    hash: fingerprint de (account_id + date + description + amount) para
    deduplicação na reimportação. Gerado automaticamente antes do insert.

    flow: indica a natureza da movimentação. Para cartão de crédito:
      - expense: compra realizada (amount positivo no CSV do Nubank)
      - payment: pagamento da fatura (amount negativo no CSV do Nubank)
    """

    __tablename__ = "transaction"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("account.id"), nullable=False, index=True
    )
    import_file_id: Mapped[int | None] = mapped_column(
        ForeignKey("import_file.id"), nullable=True
    )
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2), nullable=False
    )
    flow: Mapped[TransactionFlow] = mapped_column(
        Enum(TransactionFlow), nullable=False
    )
    hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    external_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )
    is_manual: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Relacionamentos
    account: Mapped["Account"] = relationship(
        "Account", back_populates="transactions"
    )
    import_file: Mapped["ImportFile | None"] = relationship(
        "ImportFile", back_populates="transactions"
    )
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary=transaction_tag, back_populates="transactions"
    )

    __table_args__ = (
        # Índice composto para buscas por conta + período (mais comum no dashboard)
        Index("ix_transaction_account_date", "account_id", "date"),
    )

    @staticmethod
    def make_hash(account_id: int, date: datetime.date, description: str, amount: Decimal) -> str:
        """Gera fingerprint para deduplicação."""
        raw = f"{account_id}|{date.isoformat()}|{description.strip().lower()}|{amount}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def __repr__(self) -> str:
        return f"<Transaction {self.date} {self.description[:30]} {self.amount}>"
