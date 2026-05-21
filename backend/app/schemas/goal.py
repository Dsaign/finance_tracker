import datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator, model_validator
from app.models.goal import GoalType, GoalStatus


# ── Debt ─────────────────────────────────────────────────────────────────────

class DebtCreate(BaseModel):
    creditor: str
    original_amount: Decimal
    current_balance: Decimal
    interest_rate: Decimal | None = None
    installments_total: int | None = None
    installments_paid: int | None = None
    start_date: datetime.date | None = None
    due_date: datetime.date | None = None

    @field_validator("original_amount", "current_balance")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Valores monetários não podem ser negativos.")
        return v


class DebtUpdate(BaseModel):
    creditor: str | None = None
    current_balance: Decimal | None = None
    interest_rate: Decimal | None = None
    installments_paid: int | None = None
    due_date: datetime.date | None = None

    @field_validator("current_balance")
    @classmethod
    def positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < 0:
            raise ValueError("current_balance não pode ser negativo.")
        return v


class DebtResponse(BaseModel):
    id: int
    creditor: str
    original_amount: Decimal
    current_balance: Decimal
    interest_rate: Decimal | None
    installments_total: int | None
    installments_paid: int | None
    start_date: datetime.date | None
    due_date: datetime.date | None
    paid_amount: Decimal
    progress_percent: float

    model_config = {"from_attributes": True}


# ── Goal ──────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    name: str
    description: str | None = None
    goal_type: GoalType = GoalType.savings
    target_amount: Decimal
    deadline: datetime.date | None = None
    account_ids: list[int] = []
    debt: DebtCreate | None = None

    @field_validator("target_amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("target_amount deve ser positivo.")
        return v

    @model_validator(mode="after")
    def debt_only_for_debt_payoff(self) -> "GoalCreate":
        if self.debt is not None and self.goal_type != GoalType.debt_payoff:
            raise ValueError("O campo 'debt' só é válido para goals do tipo 'debt_payoff'.")
        return self


class GoalUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    goal_type: GoalType | None = None
    target_amount: Decimal | None = None
    deadline: datetime.date | None = None
    status: GoalStatus | None = None

    @field_validator("target_amount")
    @classmethod
    def positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("target_amount deve ser positivo.")
        return v


class GoalAccountsUpdate(BaseModel):
    account_ids: list[int]


class GoalResponse(BaseModel):
    id: int
    name: str
    description: str | None
    goal_type: GoalType
    target_amount: Decimal
    deadline: datetime.date | None
    status: GoalStatus
    account_ids: list[int]
    debt: DebtResponse | None
    created_at: datetime.datetime
    updated_at: datetime.datetime | None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, "goal_accounts"):
            obj.__dict__["account_ids"] = [ga.account_id for ga in obj.goal_accounts]
        return super().model_validate(obj, **kwargs)
