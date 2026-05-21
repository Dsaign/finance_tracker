"""
Models do Finance Tracker.

Importar daqui garante que todos os models estejam registrados
no metadata do SQLAlchemy antes de criar as tabelas ou rodar migrations.

Uso:
    from app.models import Base, Institution, Account, Transaction, ...
"""

from .base import Base, TimestampMixin
from .institution import Institution
from .account import AccountGroup, Account, AccountType
from .import_file import ImportFile, ImportStatus
from .tag import Tag, CategoryRule, MatchType, transaction_tag, category_rule_tag
from .transaction import Transaction, TransactionFlow
from .goal import Goal, GoalAccount, Debt, GoalType, GoalStatus

__all__ = [
    "Base",
    "TimestampMixin",
    "Institution",
    "AccountGroup",
    "Account",
    "AccountType",
    "ImportFile",
    "ImportStatus",
    "Tag",
    "CategoryRule",
    "MatchType",
    "transaction_tag",
    "category_rule_tag",
    "Transaction",
    "TransactionFlow",
    "Goal",
    "GoalAccount",
    "Debt",
    "GoalType",
    "GoalStatus",
]
