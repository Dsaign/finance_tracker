from pydantic import BaseModel, field_validator
import re


class TagBase(BaseModel):
    name: str
    color: str | None = None

    @field_validator("color")
    @classmethod
    def valid_hex_color(cls, v: str | None) -> str | None:
        if v is not None and not re.fullmatch(r"#[0-9a-fA-F]{6}", v):
            raise ValueError("color deve ser um hex válido, ex: #FF5733")
        return v


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None

    @field_validator("color")
    @classmethod
    def valid_hex_color(cls, v: str | None) -> str | None:
        if v is not None and not re.fullmatch(r"#[0-9a-fA-F]{6}", v):
            raise ValueError("color deve ser um hex válido, ex: #FF5733")
        return v


class TagResponse(BaseModel):
    id: int
    name: str
    slug: str
    color: str | None

    model_config = {"from_attributes": True}


# ── Category Rules ────────────────────────────────────────────────────────────

class CategoryRuleBase(BaseModel):
    keyword: str
    match_type: str = "contains"
    priority: int = 0
    tag_ids: list[int] = []


class CategoryRuleCreate(CategoryRuleBase):
    pass


class CategoryRuleUpdate(BaseModel):
    keyword: str | None = None
    match_type: str | None = None
    priority: int | None = None
    tag_ids: list[int] | None = None


class CategoryRuleResponse(BaseModel):
    id: int
    keyword: str
    match_type: str
    priority: int
    tags: list[TagResponse]

    model_config = {"from_attributes": True}
