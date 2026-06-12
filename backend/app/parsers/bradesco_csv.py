"""
Parser para extratos do Bradesco exportados em CSV pelo app.

Formato (conta corrente):
    Extrato de: Ag: XXX | Conta: XXXXXX-X;;;;;
    Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
    30/04/2026;PIX RECEBIDO;1018266;70,00; ;149,76
    04/05/2026;PIX ENVIADO;1636116; ;750,00;4.987,95
    ;;;;;

Como obter o arquivo:
    App Bradesco → Extrato → Período → Exportar → CSV

Convenção de colunas:
    Crédito (R$) preenchido → income
    Débito (R$) preenchido  → expense
    Linhas com ambas as colunas zeradas/vazias são ignoradas.

Encoding: UTF-8 com BOM (utf-8-sig)
"""

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import BinaryIO

from app.parsers.base import BaseParser, ParsedTransaction
from app.models.transaction import TransactionFlow


def _parse_brl(raw: str) -> Decimal | None:
    """Converte valor no formato brasileiro (1.234,56) para Decimal. Retorna None se vazio ou zero."""
    clean = raw.strip().replace(".", "").replace(",", ".")
    if not clean:
        return None
    try:
        value = Decimal(clean)
        return value if value > 0 else None
    except InvalidOperation:
        return None


class BradescoCSVParser(BaseParser):
    """Parser para extratos CSV do Bradesco (conta corrente, exportado pelo app)."""

    PARSER_TYPE = "bradesco_csv"

    def validate(self, file: BinaryIO) -> bool:
        try:
            raw = file.read(512)
            file.seek(0)
            text = raw.decode("utf-8-sig", errors="replace").lower()
            return "extrato de:" in text and "data;hist" in text
        except Exception:
            return False

    def parse(self, file: BinaryIO) -> list[ParsedTransaction]:
        raw = file.read()
        try:
            content = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            content = raw.decode("latin-1")

        transactions: list[ParsedTransaction] = []
        in_data = False

        for line_no, line in enumerate(content.splitlines(), start=1):
            # Aguarda a linha de cabeçalho de colunas para começar a ler dados
            if not in_data:
                if line.lower().startswith("data;"):
                    in_data = True
                continue

            # Fim da seção de dados: linha vazia ou composta só por separadores
            if not line.strip().replace(";", ""):
                break

            cols = line.split(";")
            if len(cols) < 5:
                continue

            raw_date  = cols[0].strip()
            raw_desc  = cols[1].strip()
            raw_docto = cols[2].strip()
            raw_credit = cols[3].strip()
            raw_debit  = cols[4].strip()

            # Linha de rodapé sem data no formato esperado
            if len(raw_date) != 10:
                break

            try:
                txn_date = datetime.strptime(raw_date, "%d/%m/%Y").date()
            except ValueError:
                print(f"[BradescoCSVParser] linha {line_no}: data inválida '{raw_date}', ignorada.")
                continue

            credit = _parse_brl(raw_credit)
            debit  = _parse_brl(raw_debit)

            if credit is None and debit is None:
                continue  # linha zerada (ex: saldo de abertura)

            if credit is not None:
                amount = credit
                flow = TransactionFlow.income
            else:
                amount = debit  # type: ignore[assignment]
                flow = TransactionFlow.expense

            external_id = raw_docto if (raw_docto and raw_docto != "0") else None

            transactions.append(ParsedTransaction(
                date=txn_date,
                description=raw_desc,
                amount=amount,
                flow=flow,
                external_id=external_id,
                raw={
                    "date": raw_date,
                    "description": raw_desc,
                    "docto": raw_docto,
                    "credit": raw_credit,
                    "debit": raw_debit,
                },
            ))

        return transactions
