"""
Parser para extratos do Nubank exportados em CSV.

Formato esperado (cartão de crédito):
    date,title,amount
    2026-05-19,iFood - NuPay,51.44
    2026-05-05,Pagamento recebido,-9016.63
    2026-04-28,Casasbahiacom - Parcela 2/10,237.79

Como obter o arquivo:
    App Nubank → Meus extratos → Exportar → CSV

Convenção de amount no extrato do Nubank (cartão):
    Positivo → gasto (expense)
    Negativo → pagamento de fatura (payment) ou estorno/crédito (income)

Casos especiais tratados:
    - Compras parceladas: "Parcela X/Y" extraído e preservado
    - Pagamento de fatura: detectado pela descrição "Pagamento recebido"
    - Juros de rotativo: detectado pela descrição "Juros de pagamento"
      — tratado como expense (é um custo, não um crédito)
    - Estornos genéricos: amount negativo sem ser pagamento → income
"""

import csv
import io
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import BinaryIO

from app.parsers.base import BaseParser, ParsedTransaction
from app.models.transaction import TransactionFlow

# Header exato que o Nubank usa — usado na validação
_EXPECTED_HEADER = {"date", "title", "amount"}

# Regex para extrair número de parcela: "Parcela 2/10" → (2, 10)
_INSTALLMENT_RE = re.compile(r"[Pp]arcela\s+(\d+)/(\d+)")

# Descrições que indicam pagamento de fatura (amount negativo → payment)
_PAYMENT_KEYWORDS = ("pagamento recebido",)

# Descrições que indicam custo mesmo com amount negativo (juros, multa)
_COST_KEYWORDS = ("juros", "multa", "mora")


def _detect_flow(description: str, amount: Decimal) -> TransactionFlow:
    """
    Determina o TransactionFlow com base na descrição e no sinal do amount.

    Lógica para cartão de crédito Nubank:
      amount > 0 → sempre expense
      amount < 0 + "pagamento recebido" → payment
      amount < 0 + keyword de custo (juros, multa) → expense
        (o Nubank registra juros do rotativo como negativos,
         mas são um custo, não um crédito a receber)
      amount < 0 + outros → income (estorno, cashback, etc.)
    """
    desc_lower = description.lower()

    if amount > 0:
        return TransactionFlow.expense

    # amount < 0 a partir daqui
    if any(kw in desc_lower for kw in _PAYMENT_KEYWORDS):
        return TransactionFlow.payment

    if any(kw in desc_lower for kw in _COST_KEYWORDS):
        return TransactionFlow.expense

    return TransactionFlow.income


def _parse_installment(description: str) -> tuple[str, int | None, int | None]:
    """
    Extrai info de parcelamento da descrição, se presente.

    "Casasbahiacom - Parcela 2/10" →
        ("Casasbahiacom", 2, 10)

    "iFood - NuPay" →
        ("iFood - NuPay", None, None)
    """
    match = _INSTALLMENT_RE.search(description)
    if not match:
        return description, None, None

    current = int(match.group(1))
    total = int(match.group(2))

    # Remove " - Parcela X/Y" da descrição para deixá-la limpa
    clean = _INSTALLMENT_RE.sub("", description)
    clean = re.sub(r"\s+-\s*$", "", clean).strip()  # remove " - " sobrando no fim

    return clean, current, total


class NubankParser(BaseParser):
    """Parser para extratos CSV do cartão de crédito Nubank."""

    PARSER_TYPE = "nubank_csv"

    def validate(self, file: BinaryIO) -> bool:
        """Verifica se o header bate com o formato esperado do Nubank."""
        try:
            first_line = file.readline().decode("utf-8").strip()
            file.seek(0)
            headers = {h.strip().lower() for h in first_line.split(",")}
            return headers == _EXPECTED_HEADER
        except Exception:
            return False

    def parse(self, file: BinaryIO) -> list[ParsedTransaction]:
        """
        Lê o CSV e retorna lista de ParsedTransaction.

        Linhas com amount inválido são ignoradas com aviso no stderr
        para não interromper a importação inteira por um dado corrompido.
        """
        content = file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))

        transactions: list[ParsedTransaction] = []

        for i, row in enumerate(reader, start=2):  # linha 2 = primeira após header
            raw_date = row.get("date", "").strip()
            raw_title = row.get("title", "").strip()
            raw_amount = row.get("amount", "").strip()

            if not raw_date or not raw_title or not raw_amount:
                continue  # linha em branco ou incompleta

            try:
                parsed_date = date.fromisoformat(raw_date)
            except ValueError:
                print(f"[NubankParser] linha {i}: data inválida '{raw_date}', ignorada.")
                continue

            try:
                amount = Decimal(raw_amount)
            except InvalidOperation:
                print(f"[NubankParser] linha {i}: amount inválido '{raw_amount}', ignorada.")
                continue

            flow = _detect_flow(raw_title, amount)
            clean_description, installment_current, installment_total = _parse_installment(raw_title)

            transactions.append(
                ParsedTransaction(
                    date=parsed_date,
                    description=clean_description,
                    amount=amount,  # __post_init__ aplica abs()
                    flow=flow,
                    installment_current=installment_current,
                    installment_total=installment_total,
                    raw=dict(row),
                )
            )

        return transactions
