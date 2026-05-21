"""
Parser para extratos do Bradesco exportados em OFX.

Formato OFX (Open Financial Exchange): XML simplificado usado
por bancos tradicionais. Cada transação fica em um bloco <STMTTRN>.

Como obter o arquivo:
    Internet Banking Bradesco → Extrato → Exportar → OFX

Convenção de amount no OFX do Bradesco (conta corrente):
    Positivo → entrada/crédito (income)
    Negativo → saída/débito (expense)

Tipos de transação OFX mapeados:
    CREDIT, DEP, INT  → income
    DEBIT, ATM, POS, PAYMENT, XFER, CHECK, FEE → expense
    (XFER entre contas próprias → transfer, tratado como expense por padrão
     já que não sabemos se é conta própria sem contexto extra)

Dependência: ofxparse
    pip install ofxparse
"""

from datetime import date
from decimal import Decimal
from typing import BinaryIO

from app.parsers.base import BaseParser, ParsedTransaction
from app.models.transaction import TransactionFlow

# Tipos OFX que representam entradas de dinheiro
_INCOME_TYPES = {"CREDIT", "DEP", "INT", "DIRECTDEP"}

# Tipos OFX que representam saídas
_EXPENSE_TYPES = {"DEBIT", "ATM", "POS", "PAYMENT", "XFER", "CHECK", "FEE", "SRVCHG"}


def _map_flow(trntype: str, amount: Decimal) -> TransactionFlow:
    """
    Mapeia o TRNTYPE do OFX para TransactionFlow.
    Usa o sinal do amount como fallback se o tipo for desconhecido.
    """
    trntype_upper = (trntype or "").upper().strip()

    if trntype_upper in _INCOME_TYPES:
        return TransactionFlow.income
    if trntype_upper in _EXPENSE_TYPES:
        return TransactionFlow.expense

    # Fallback pelo sinal — OFX garante amount negativo para débitos
    return TransactionFlow.income if amount > 0 else TransactionFlow.expense


class BradescoParser(BaseParser):
    """Parser para extratos OFX do Bradesco (conta corrente)."""

    PARSER_TYPE = "bradesco_ofx"

    def validate(self, file: BinaryIO) -> bool:
        """Verifica se o arquivo contém marcadores OFX."""
        try:
            header = file.read(512).decode("latin-1", errors="ignore").upper()
            file.seek(0)
            return "OFXHEADER" in header or "<OFX>" in header
        except Exception:
            return False

    def parse(self, file: BinaryIO) -> list[ParsedTransaction]:
        """
        Lê o OFX via ofxparse e retorna lista de ParsedTransaction.

        Raises:
            ImportError: se ofxparse não estiver instalado.
            ValueError: se o arquivo não puder ser parseado como OFX válido.
        """
        try:
            from ofxparse import OfxParser
        except ImportError as e:
            raise ImportError(
                "ofxparse não está instalado. "
                "Rode: pip install ofxparse"
            ) from e

        try:
            ofx = OfxParser.parse(file)
        except Exception as e:
            raise ValueError(f"Não foi possível ler o arquivo OFX: {e}") from e

        transactions: list[ParsedTransaction] = []

        for t in ofx.account.statement.transactions:
            try:
                amount = Decimal(str(t.amount))
                flow = _map_flow(getattr(t, "type", ""), amount)

                # OFX retorna datetime — convertemos para date
                txn_date = t.date.date() if hasattr(t.date, "date") else t.date

                description = (t.memo or t.payee or "").strip()
                if not description:
                    description = f"Transação {t.id}"

                transactions.append(
                    ParsedTransaction(
                        date=txn_date,
                        description=description,
                        amount=amount,
                        flow=flow,
                        raw={
                            "id": getattr(t, "id", None),
                            "type": getattr(t, "type", None),
                            "memo": getattr(t, "memo", None),
                            "payee": getattr(t, "payee", None),
                            "amount": str(t.amount),
                            "date": str(t.date),
                        },
                    )
                )
            except Exception as e:
                print(f"[BradescoParser] transação ignorada: {e}")
                continue

        return transactions
