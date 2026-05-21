import enum
from sqlalchemy import String, ForeignKey, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


class ImportStatus(str, enum.Enum):
    pending = "pending"       # Aguardando processamento
    processing = "processing" # Em processamento
    processed = "processed"   # Concluído com sucesso
    error = "error"           # Falhou


class ImportFile(Base):
    """
    Registro de cada arquivo importado.

    file_hash (MD5 do conteúdo) impede reimportação acidental do mesmo arquivo.
    Mantém rastreabilidade: é possível saber de qual importação veio cada transação.
    """

    __tablename__ = "import_file"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("account.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    status: Mapped[ImportStatus] = mapped_column(
        Enum(ImportStatus), nullable=False, default=ImportStatus.pending
    )
    imported_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relacionamentos
    account: Mapped["Account"] = relationship(
        "Account", back_populates="import_files"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="import_file"
    )

    def __repr__(self) -> str:
        return f"<ImportFile {self.filename} ({self.status.value})>"
