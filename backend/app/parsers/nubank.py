"""
Parser para extratos do Nubank exportados em CSV.

Suporta dois formatos:

Formato A — Cartão de crédito:
    date,title,amount
    2026-05-19,iFood - NuPay,51.44
    2026-05-05,Pagamento recebido,-9016.63

Formato B — Conta corrente:
    Data,Valor,Identificador,Descrição
    01/05/2026,-55.72,69f4e734-...,Transferência enviada pelo Pix - ...
    02/05/2026,70.00,69f681fb-...,Transferência recebida pelo Pix - ...

Detecção automática pelo header do CSV.
"""

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import BinaryIO

from app.parsers.base import BaseParser, ParsedTransaction
from app.models.transaction import TransactionFlow

# Headers reconhecidos
_CREDIT_HEADER = {"date", "title", "amount"}
_CHECKING_HEADER = {"data", "valor", "identificador", "descrição"}

_INSTALLMENT_RE = re.compile(r"[Pp]arcela\s+(\d+)/(\d+)")
_PAYMENT_KEYWORDS_CREDIT = ("pagamento recebido",)
_COST_KEYWORDS = ("juros", "multa", "mora")
_PAYMENT_KEYWORDS_CHECKING = ("pagamento de fatura",)


def _detect_flow_credit(description: str, amount: Decimal) -> TransactionFlow:
    desc_lower = description.lower()
    if amount > 0:
        return TransactionFlow.expense
    if any(kw in desc_lower for kw in _PAYMENT_KEYWORDS_CREDIT):
        return TransactionFlow.payment
    if any(kw in desc_lower for kw in _COST_KEYWORDS):
        return TransactionFlow.expense
    return TransactionFlow.income


def _detect_flow_checking(description: str, amount: Decimal) -> TransactionFlow:
    desc_lower = description.lower()
    if any(kw in desc_lower for kw in _PAYMENT_KEYWORDS_CHECKING):
        return TransactionFlow.payment
    return TransactionFlow.income if amount > 0 else TransactionFlow.expense


def _parse_installment(description: str) -> tuple[str, int | None, int | None]:
    match = _INSTALLMENT_RE.search(description)
    if not match:
        return description, None, None
    current = int(match.group(1))
    total = int(match.group(2))
    clean = _INSTALLMENT_RE.sub("", description)
    clean = re.sub(r"\s+-\s*$", "", clean).strip()
    return clean, current, total


def _read_header_set(file: BinaryIO) -> set[str]:
    first_line = file.readline().decode("utf-8-sig").strip()
    file.seek(0)
    return {h.strip().lower() for h in first_line.split(",")}


class NubankParser(BaseParser):
    """Parser para extratos CSV do Nubank (cartão de crédito e conta corrente)."""

    PARSER_TYPE = "nubank_csv"

    def validate(self, file: BinaryIO) -> bool:
        try:
            headers = _read_header_set(file)
            return headers == _CREDIT_HEADER or headers == _CHECKING_HEADER
        except Exception:
            return False

    def parse(self, file: BinaryIO) -> list[ParsedTransaction]:
        content = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        headers = {h.strip().lower() for h in (reader.fieldnames or [])}

        if headers == _CHECKING_HEADER:
            return self._parse_checking(reader)
        return self._parse_credit(reader)

    # ── Formato A: cartão de crédito ──────────────────────────────────────────

    def _parse_credit(self, reader) -> list[ParsedTransaction]:
        transactions: list[ParsedTransaction] = []
        for i, row in enumerate(reader, start=2):
            raw_date = row.get("date", "").strip()
            raw_title = row.get("title", "").strip()
            raw_amount = row.get("amount", "").strip()

            if not raw_date or not raw_title or not raw_amount:
                continue

            try:
                parsed_date = date.fromisoformat(raw_date)
            except ValueError:
                print(f"[NubankParser/credit] linha {i}: data inválida '{raw_date}', ignorada.")
                continue

            try:
                amount = Decimal(raw_amount)
            except InvalidOperation:
                print(f"[NubankParser/credit] linha {i}: amount inválido '{raw_amount}', ignorada.")
                continue

            flow = _detect_flow_credit(raw_title, amount)
            clean_description, installment_current, installment_total = _parse_installment(raw_title)

            transactions.append(ParsedTransaction(
                date=parsed_date,
                description=clean_description,
                amount=amount,
                flow=flow,
                installment_current=installment_current,
                installment_total=installment_total,
                raw=dict(row),
            ))
        return transactions

    # ── Formato B: conta corrente ─────────────────────────────────────────────

    def _parse_checking(self, reader) -> list[ParsedTransaction]:
        transactions: list[ParsedTransaction] = []
        for i, row in enumerate(reader, start=2):
            # Normaliza chaves para lower sem BOM
            norm = {k.strip().lower(): v for k, v in row.items()}
            raw_date = norm.get("data", "").strip()
            raw_amount = norm.get("valor", "").strip()
            raw_id = norm.get("identificador", "").strip() or None
            raw_desc = norm.get("descrição", "").strip()

            if not raw_date or not raw_amount or not raw_desc:
                continue

            try:
                parsed_date = datetime.strptime(raw_date, "%d/%m/%Y").date()
            except ValueError:
                print(f"[NubankParser/checking] linha {i}: data inválida '{raw_date}', ignorada.")
                continue

            try:
                amount = Decimal(raw_amount.replace(",", "."))
            except InvalidOperation:
                print(f"[NubankParser/checking] linha {i}: amount inválido '{raw_amount}', ignorada.")
                continue

            flow = _detect_flow_checking(raw_desc, amount)

            transactions.append(ParsedTransaction(
                date=parsed_date,
                description=raw_desc,
                amount=amount,
                flow=flow,
                external_id=raw_id,
                raw=dict(row),
            ))
        return transactions
