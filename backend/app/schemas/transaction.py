import datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.models.transaction import TransactionFlow


class TagResponse(BaseModel):
    id: int
    name: str
    slug: str
    color: str | None

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    import_file_id: int | None
    date: datetime.date
    description: str
    amount: Decimal
    flow: TransactionFlow
    external_id: str | None
    is_manual: bool
    competencia: str | None
    tags: list[TagResponse]
    created_at: datetime.datetime
    updated_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_income: Decimal = Decimal('0')
    total_expense: Decimal = Decimal('0')


class TransactionCreate(BaseModel):
    account_id: int
    date: datetime.date
    description: str
    amount: Decimal
    flow: TransactionFlow
    competencia: str | None = None
    tag_ids: list[int] = []

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount deve ser positivo.")
        return v


class TransactionUpdate(BaseModel):
    date: datetime.date | None = None
    description: str | None = None
    amount: Decimal | None = None
    flow: TransactionFlow | None = None
    competencia: str | None = None
    # None = não altera; [] = remove todas as tags
    tag_ids: list[int] | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("amount deve ser positivo.")
        return v
