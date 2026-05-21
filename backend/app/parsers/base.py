from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import BinaryIO

from app.models.transaction import TransactionFlow


@dataclass
class ParsedTransaction:
    """
    Transação normalizada produzida por qualquer parser.

    Todos os parsers retornam uma lista desta classe —
    o serviço de importação não precisa saber nada sobre
    o formato de origem.
    """

    date: date
    description: str
    amount: Decimal          # sempre positivo — o flow indica a direção
    flow: TransactionFlow

    # Campos opcionais extraídos quando o formato os fornece
    installment_current: int | None = None   # ex: 2  (de "Parcela 2/6")
    installment_total: int | None = None     # ex: 6
    raw: dict = field(default_factory=dict)  # linha original para debug

    def __post_init__(self):
        # Garante que amount é sempre positivo
        self.amount = abs(self.amount)


class BaseParser(ABC):
    """
    Interface que todo parser de extrato deve implementar.

    Para adicionar uma nova instituição:
    1. Crie app/parsers/<nome>.py
    2. Herde de BaseParser e implemente parse()
    3. Cadastre a instituição no banco com parser_type=<nome>

    O parser_type no banco deve bater exatamente com a chave
    registrada em PARSER_REGISTRY (app/parsers/__init__.py).
    """

    @abstractmethod
    def parse(self, file: BinaryIO) -> list[ParsedTransaction]:
        """
        Lê o arquivo e retorna a lista de transações normalizadas.

        Args:
            file: objeto file-like aberto em modo binário.
                  O parser é responsável por detectar encoding se necessário.

        Returns:
            Lista de ParsedTransaction, uma por linha/registro do extrato.
            Linhas inválidas ou em branco devem ser ignoradas silenciosamente.

        Raises:
            ValueError: se o arquivo não estiver no formato esperado.
        """
        ...

    @abstractmethod
    def validate(self, file: BinaryIO) -> bool:
        """
        Verifica rapidamente se o arquivo parece ser do formato correto.
        Usado antes do parse para dar feedback útil ao usuário.

        Deve ser rápido — apenas lê o header/primeiras linhas.
        Não deve consumir o arquivo inteiro (use file.seek(0) ao final).
        """
        ...
