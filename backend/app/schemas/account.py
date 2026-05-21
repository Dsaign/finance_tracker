import datetime
from pydantic import BaseModel
from app.models.account import AccountType
from .institution import InstitutionResponse


class AccountGroupBase(BaseModel):
    name: str
    description: str | None = None


class AccountGroupCreate(AccountGroupBase):
    pass


class AccountGroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class AccountGroupResponse(AccountGroupBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class AccountBase(BaseModel):
    institution_id: int
    account_group_id: int | None = None
    name: str
    type: AccountType
    currency: str = "BRL"
    active: bool = True


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    institution_id: int | None = None
    account_group_id: int | None = None
    name: str | None = None
    type: AccountType | None = None
    currency: str | None = None
    active: bool | None = None


class AccountResponse(AccountBase):
    id: int
    institution: InstitutionResponse
    created_at: datetime.datetime
    updated_at: datetime.datetime | None

    model_config = {"from_attributes": True}
