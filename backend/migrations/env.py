import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Garante que o pacote app/ seja encontrado pelo Python
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Carrega variáveis do .env
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Importa metadata com todos os models registrados
from app.models import Base

# Config do Alembic
config = context.config

# Logging via alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata alvo para autogenerate
target_metadata = Base.metadata

# Injeta a URL do banco a partir do .env (sobrescreve o alembic.ini)
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "Variável DATABASE_URL não encontrada. "
        "Defina-a no arquivo .env antes de rodar as migrations."
    )
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """
    Modo offline: gera SQL sem conectar ao banco.
    Útil para revisar o SQL antes de aplicar em produção.
    Execute com: alembic upgrade head --sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,       # detecta mudanças de tipo de coluna
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Modo online: conecta ao banco e aplica as migrations diretamente.
    Execute com: alembic upgrade head
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
