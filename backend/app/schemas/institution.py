import datetime
from pydantic import BaseModel


class InstitutionBase(BaseModel):
    name: str
    slug: str
    parser_type: str


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    parser_type: str | None = None


class InstitutionResponse(InstitutionBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime | None

    model_config = {"from_attributes": True}
