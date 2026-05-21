import datetime
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.tag import TagResponse


class SummaryResponse(BaseModel):
    date_from: datetime.date | None
    date_to: datetime.date | None
    account_ids: list[int]
    total_income: Decimal
    total_expense: Decimal
    total_payment: Decimal
    net: Decimal  # income - expense


class PeriodPoint(BaseModel):
    period: str        # "2026-05" (mês) ou "2026-21" (semana) ou "2026-05-19" (dia)
    income: Decimal
    expense: Decimal


class ByPeriodResponse(BaseModel):
    group_by: str      # "month" | "week" | "day"
    points: list[PeriodPoint]


class TagShare(BaseModel):
    tag: TagResponse
    total: Decimal
    percent: float


class ByTagResponse(BaseModel):
    total_tagged: Decimal
    shares: list[TagShare]


class MerchantRow(BaseModel):
    description: str
    total: Decimal
    count: int


class TopMerchantsResponse(BaseModel):
    merchants: list[MerchantRow]


class GoalProgress(BaseModel):
    id: int
    name: str
    goal_type: str
    status: str
    target_amount: Decimal
    deadline: datetime.date | None
    # Para savings/investment: soma dos saldos das contas vinculadas
    # Para debt_payoff: paid_amount e progress_percent da dívida
    current_amount: Decimal
    progress_percent: float
    debt_creditor: str | None = None
    debt_current_balance: Decimal | None = None
