import enum
import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Boolean, Date, ForeignKey, Enum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class AccountType(str, enum.Enum):
    checking = "checking"          # Conta corrente
    savings = "savings"            # Poupança
    credit_card = "credit_card"    # Cartão de crédito
    investment = "investment"      # Investimento


class AccountGroup(Base, TimestampMixin):
    """
    Agrupamento de contas para visão consolidada.
    Exemplo: 'Pessoa Jurídica', 'Pessoa Física', 'Reserva de emergência'.
    Uma conta pode pertencer a no máximo um grupo.
    """

    __tablename__ = "account_group"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relacionamentos
    accounts: Mapped[list["Account"]] = relationship(
        "Account", back_populates="group"
    )

    def __repr__(self) -> str:
        return f"<AccountGroup {self.name}>"


class Account(Base, TimestampMixin):
    """
    Conta bancária de uma instituição.

    Para cartão de crédito (credit_card), transações positivas = gastos,
    negativas = pagamentos de fatura. O parser trata esse fluxo corretamente.
    """

    __tablename__ = "account"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institution.id"), nullable=False
    )
    account_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("account_group.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[AccountType] = mapped_column(
        Enum(AccountType), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="BRL"
    )
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2), nullable=False, default=Decimal("0.00")
    )
    opening_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    # Relacionamentos
    institution: Mapped["Institution"] = relationship(
        "Institution", back_populates="accounts"
    )
    group: Mapped["AccountGroup | None"] = relationship(
        "AccountGroup", back_populates="accounts"
    )
    import_files: Mapped[list["ImportFile"]] = relationship(
        "ImportFile", back_populates="account"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="account"
    )
    goal_accounts: Mapped[list["GoalAccount"]] = relationship(
        "GoalAccount", back_populates="account"
    )

    def __repr__(self) -> str:
        return f"<Account {self.name} ({self.type.value})>"
