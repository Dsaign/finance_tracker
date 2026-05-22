from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class Institution(Base, TimestampMixin):
    """
    Instituição financeira (Nubank, Bradesco, etc).

    parser_type define qual módulo de importação será usado.
    Exemplos: 'nubank_csv', 'bradesco_ofx'
    """

    __tablename__ = "institution"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    parser_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Relacionamentos
    accounts: Mapped[list["Account"]] = relationship(
        "Account", back_populates="institution"
    )

    def __repr__(self) -> str:
        return f"<Institution {self.slug}>"
