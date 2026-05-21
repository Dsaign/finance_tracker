from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column, sessionmaker
from sqlalchemy import DateTime, func
from typing import Optional
import datetime


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Adiciona created_at e updated_at automaticamente."""

    created_at: MappedColumn[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: MappedColumn[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )
