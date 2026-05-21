import enum
import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Numeric, Date, ForeignKey, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class GoalType(str, enum.Enum):
    savings = "savings"          # Poupança / reserva
    debt_payoff = "debt_payoff"  # Quitação de dívida
    investment = "investment"    # Objetivo de investimento
    spending_limit = "spending_limit"  # Limite de gasto por categoria


class GoalStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
    paused = "paused"


class Goal(Base, TimestampMixin):
    """
    Objetivo financeiro.

    Para dívidas: goal_type=debt_payoff, com um Debt vinculado.
    target_amount é o valor-alvo (quanto poupar, ou o saldo original da dívida).
    O progresso é sempre calculado dinamicamente — nunca armazenado aqui.
    """

    __tablename__ = "goal"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal_type: Mapped[GoalType] = mapped_column(
        Enum(GoalType), nullable=False, default=GoalType.savings
    )
    target_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2), nullable=False
    )
    deadline: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    status: Mapped[GoalStatus] = mapped_column(
        Enum(GoalStatus), nullable=False, default=GoalStatus.active
    )

    # Relacionamentos
    goal_accounts: Mapped[list["GoalAccount"]] = relationship(
        "GoalAccount", back_populates="goal"
    )
    debt: Mapped["Debt | None"] = relationship(
        "Debt", back_populates="goal", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Goal '{self.name}' ({self.goal_type.value})>"


class GoalAccount(Base):
    """
    Associação entre Goal e Account (many-to-many).

    Permite que um objetivo monitore múltiplas contas:
    ex: 'Reserva de emergência' somando conta corrente + poupança.
    """

    __tablename__ = "goal_account"

    goal_id: Mapped[int] = mapped_column(
        ForeignKey("goal.id"), primary_key=True
    )
    account_id: Mapped[int] = mapped_column(
        ForeignKey("account.id"), primary_key=True
    )

    # Relacionamentos
    goal: Mapped["Goal"] = relationship("Goal", back_populates="goal_accounts")
    account: Mapped["Account"] = relationship("Account", back_populates="goal_accounts")


class Debt(Base, TimestampMixin):
    """
    Detalhamento de uma dívida vinculada a um Goal do tipo debt_payoff.

    current_balance deve ser atualizado manualmente conforme pagamentos são feitos.
    installments_total / installments_paid para dívidas parceladas.
    interest_rate em percentual ao mês (ex: 2.5 = 2,5% a.m.).
    """

    __tablename__ = "debt"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("goal.id"), unique=True, nullable=False
    )
    creditor: Mapped[str] = mapped_column(String(100), nullable=False)
    original_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2), nullable=False
    )
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2), nullable=False
    )
    interest_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=5, scale=2), nullable=True
    )
    installments_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installments_paid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    # Relacionamentos
    goal: Mapped["Goal"] = relationship("Goal", back_populates="debt")

    @property
    def paid_amount(self) -> Decimal:
        return self.original_amount - self.current_balance

    @property
    def progress_percent(self) -> float:
        if self.original_amount == 0:
            return 0.0
        return float(self.paid_amount / self.original_amount * 100)

    def __repr__(self) -> str:
        return f"<Debt '{self.creditor}' saldo={self.current_balance}>"
