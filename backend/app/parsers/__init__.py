"""
Registry central de parsers.

O parser_type cadastrado na tabela institution deve bater
exatamente com uma das chaves deste dicionário.

Para registrar um novo parser:
    1. Crie app/parsers/<nome>.py implementando BaseParser
    2. Adicione uma entrada aqui: "parser_type": NovoParser

Exemplo de uso:
    from app.parsers import get_parser
    parser = get_parser("nubank_csv")
    transactions = parser.parse(file)
"""

from app.parsers.base import BaseParser, ParsedTransaction
from app.parsers.nubank import NubankParser
from app.parsers.bradesco import BradescoParser
from app.parsers.bradesco_csv import BradescoCSVParser

PARSER_REGISTRY: dict[str, type[BaseParser]] = {
    NubankParser.PARSER_TYPE: NubankParser,
    BradescoParser.PARSER_TYPE: BradescoParser,
    BradescoCSVParser.PARSER_TYPE: BradescoCSVParser,
}


def get_parser(parser_type: str) -> BaseParser:
    """
    Retorna uma instância do parser para o parser_type informado.

    Raises:
        ValueError: se o parser_type não estiver registrado.
    """
    cls = PARSER_REGISTRY.get(parser_type)
    if cls is None:
        available = ", ".join(PARSER_REGISTRY.keys())
        raise ValueError(
            f"Parser '{parser_type}' não encontrado. "
            f"Disponíveis: {available}"
        )
    return cls()


__all__ = [
    "BaseParser",
    "ParsedTransaction",
    "NubankParser",
    "BradescoParser",
    "BradescoCSVParser",
    "PARSER_REGISTRY",
    "get_parser",
]
