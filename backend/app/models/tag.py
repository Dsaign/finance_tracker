import enum
from sqlalchemy import String, Integer, ForeignKey, Enum, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


# Tabela de junção: category_rule <-> tag
category_rule_tag = Table(
    "category_rule_tag",
    Base.metadata,
    Column("rule_id", Integer, ForeignKey("category_rule.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tag.id"), primary_key=True),
)

# Tabela de junção: transaction <-> tag
transaction_tag = Table(
    "transaction_tag",
    Base.metadata,
    Column("transaction_id", Integer, ForeignKey("transaction.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tag.id"), primary_key=True),
)


class Tag(Base):
    """
    Tag de categorização pesquisável.

    Uma transação pode ter múltiplas tags (ex: iFood → 'Alimentação' + 'Delivery').
    Tags são reutilizadas entre transações e entre regras de categorização.
    """

    __tablename__ = "tag"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)  # hex, ex: #FF5733

    # Relacionamentos
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", secondary=transaction_tag, back_populates="tags"
    )
    rules: Mapped[list["CategoryRule"]] = relationship(
        "CategoryRule", secondary=category_rule_tag, back_populates="tags"
    )

    def __repr__(self) -> str:
        return f"<Tag {self.name}>"


class MatchType(str, enum.Enum):
    contains = "contains"         # description contém o keyword (case-insensitive)
    starts_with = "starts_with"   # description começa com o keyword
    exact = "exact"               # match exato


class CategoryRule(Base):
    """
    Regra de categorização automática aplicada na importação.

    Exemplo: keyword='ifood', match_type='contains', tags=['Alimentação', 'Delivery']
    priority resolve conflitos quando múltiplas regras batem na mesma transação.
    Regra de maior priority vence (número maior = prioridade maior).
    """

    __tablename__ = "category_rule"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String(100), nullable=False)
    match_type: Mapped[MatchType] = mapped_column(
        Enum(MatchType), nullable=False, default=MatchType.contains
    )
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relacionamentos
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary=category_rule_tag, back_populates="rules"
    )

    def __repr__(self) -> str:
        return f"<CategoryRule '{self.keyword}' ({self.match_type.value})>"
