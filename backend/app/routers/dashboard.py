import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Account, Transaction
from app.models.goal import Goal, GoalStatus, GoalType
from app.models.tag import Tag, transaction_tag
from app.models.transaction import TransactionFlow
from app.schemas.dashboard import (
    ByPeriodResponse,
    ByTagResponse,
    GoalProgress,
    MerchantRow,
    PeriodPoint,
    SummaryResponse,
    TagShare,
    TopMerchantsResponse,
)
from app.schemas.tag import TagResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_ZERO = Decimal("0")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_account_ids(
    account_ids: list[int],
    account_group_id: int | None,
    db: Session,
) -> list[int]:
    ids: set[int] = set(account_ids)
    if account_group_id is not None:
        group_ids = {
            row[0]
            for row in db.query(Account.id)
            .filter(Account.account_group_id == account_group_id)
            .all()
        }
        ids |= group_ids
    return list(ids)


def _base_filter(q, account_ids: list[int], date_from, date_to):
    if account_ids:
        q = q.filter(Transaction.account_id.in_(account_ids))
    if date_from:
        q = q.filter(Transaction.date >= date_from)
    if date_to:
        q = q.filter(Transaction.date <= date_to)
    return q


def _common_params(
    account_ids: list[int] = Query(default=[]),
    account_group_id: int | None = Query(None),
    date_from: datetime.date | None = Query(None),
    date_to: datetime.date | None = Query(None),
):
    return {
        "account_ids": account_ids,
        "account_group_id": account_group_id,
        "date_from": date_from,
        "date_to": date_to,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=SummaryResponse)
def summary(params: dict = Depends(_common_params), db: Session = Depends(get_db)):
    account_ids = _resolve_account_ids(params["account_ids"], params["account_group_id"], db)

    accounts = db.query(Account).filter(Account.id.in_(account_ids)).all() if account_ids else []
    opening_balance = sum((a.opening_balance for a in accounts), _ZERO)

    # Apply per-account opening_date cutoff via JOIN so older transactions don't skew the balance
    q = (
        db.query(Transaction.flow, func.sum(Transaction.amount).label("total"))
        .join(Account, Account.id == Transaction.account_id)
    )
    if account_ids:
        q = q.filter(Transaction.account_id.in_(account_ids))
    q = q.filter(or_(Account.opening_date.is_(None), Transaction.date >= Account.opening_date))
    if params["date_from"]:
        q = q.filter(Transaction.date >= params["date_from"])
    if params["date_to"]:
        q = q.filter(Transaction.date <= params["date_to"])
    rows = q.group_by(Transaction.flow).all()

    totals = {row.flow: row.total for row in rows}
    income = totals.get(TransactionFlow.income, _ZERO)
    expense = totals.get(TransactionFlow.expense, _ZERO)
    payment = totals.get(TransactionFlow.payment, _ZERO)

    return SummaryResponse(
        date_from=params["date_from"],
        date_to=params["date_to"],
        account_ids=account_ids,
        total_income=income,
        total_expense=expense,
        total_payment=payment,
        net=opening_balance + income - expense,
    )


@router.get("/by-period", response_model=ByPeriodResponse)
def by_period(
    group_by: str = Query("month", pattern="^(month|week|day)$"),
    params: dict = Depends(_common_params),
    db: Session = Depends(get_db),
):
    account_ids = _resolve_account_ids(params["account_ids"], params["account_group_id"], db)

    fmt = {"month": "%Y-%m", "week": "%Y-%u", "day": "%Y-%m-%d"}[group_by]
    period_col = func.date_format(Transaction.date, fmt).label("period")

    rows = _base_filter(
        db.query(period_col, Transaction.flow, func.sum(Transaction.amount).label("total")),
        account_ids,
        params["date_from"],
        params["date_to"],
    ).filter(
        Transaction.flow.in_([TransactionFlow.income, TransactionFlow.expense])
    ).group_by("period", Transaction.flow).order_by("period").all()

    # Agrupa em dict: period → {income, expense}
    points: dict[str, dict] = {}
    for row in rows:
        if row.period not in points:
            points[row.period] = {"income": _ZERO, "expense": _ZERO}
        points[row.period][row.flow.value] = row.total

    return ByPeriodResponse(
        group_by=group_by,
        points=[
            PeriodPoint(period=p, income=v["income"], expense=v["expense"])
            for p, v in sorted(points.items())
        ],
    )


@router.get("/by-tag", response_model=ByTagResponse)
def by_tag(params: dict = Depends(_common_params), db: Session = Depends(get_db)):
    account_ids = _resolve_account_ids(params["account_ids"], params["account_group_id"], db)

    rows = (
        _base_filter(
            db.query(Tag, func.sum(Transaction.amount).label("total"))
            .join(transaction_tag, Tag.id == transaction_tag.c.tag_id)
            .join(Transaction, Transaction.id == transaction_tag.c.transaction_id),
            account_ids,
            params["date_from"],
            params["date_to"],
        )
        .filter(Transaction.flow == TransactionFlow.expense)
        .group_by(Tag.id)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    total_tagged = sum(row.total for row in rows) or _ZERO

    shares = [
        TagShare(
            tag=TagResponse.model_validate(row.Tag),
            total=row.total,
            percent=float(row.total / total_tagged * 100) if total_tagged else 0.0,
        )
        for row in rows
    ]

    return ByTagResponse(total_tagged=total_tagged, shares=shares)


@router.get("/top-merchants", response_model=TopMerchantsResponse)
def top_merchants(
    limit: int = Query(10, ge=1, le=50),
    params: dict = Depends(_common_params),
    db: Session = Depends(get_db),
):
    account_ids = _resolve_account_ids(params["account_ids"], params["account_group_id"], db)

    rows = (
        _base_filter(
            db.query(
                Transaction.description,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            ),
            account_ids,
            params["date_from"],
            params["date_to"],
        )
        .filter(Transaction.flow == TransactionFlow.expense)
        .group_by(Transaction.description)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
        .all()
    )

    return TopMerchantsResponse(
        merchants=[
            MerchantRow(description=r.description, total=r.total, count=r.count)
            for r in rows
        ]
    )


@router.get("/goals", response_model=list[GoalProgress])
def goals_progress(db: Session = Depends(get_db)):
    goals = (
        db.query(Goal)
        .options(joinedload(Goal.goal_accounts), joinedload(Goal.debt))
        .filter(Goal.status == GoalStatus.active)
        .order_by(Goal.deadline.asc().nulls_last(), Goal.created_at.desc())
        .all()
    )

    result = []
    for goal in goals:
        if goal.goal_type == GoalType.debt_payoff and goal.debt:
            current = goal.debt.paid_amount
            percent = goal.debt.progress_percent
            creditor = goal.debt.creditor
            balance = goal.debt.current_balance
        else:
            # Soma o saldo das contas vinculadas: opening_balance + income − expense a partir de opening_date
            goal_account_ids = [ga.account_id for ga in goal.goal_accounts]
            current = _ZERO
            if goal_account_ids:
                accts = db.query(Account).filter(Account.id.in_(goal_account_ids)).all()
                current = sum((a.opening_balance for a in accts), _ZERO)
                rows = (
                    db.query(Transaction.flow, func.sum(Transaction.amount).label("total"))
                    .join(Account, Account.id == Transaction.account_id)
                    .filter(Transaction.account_id.in_(goal_account_ids))
                    .filter(or_(Account.opening_date.is_(None), Transaction.date >= Account.opening_date))
                    .filter(Transaction.flow.in_([TransactionFlow.income, TransactionFlow.expense]))
                    .group_by(Transaction.flow)
                    .all()
                )
                totals = {r.flow: r.total for r in rows}
                current += totals.get(TransactionFlow.income, _ZERO) - totals.get(TransactionFlow.expense, _ZERO)

            percent = float(current / goal.target_amount * 100) if goal.target_amount else 0.0
            percent = min(percent, 100.0)
            creditor = None
            balance = None

        result.append(
            GoalProgress(
                id=goal.id,
                name=goal.name,
                goal_type=goal.goal_type.value,
                status=goal.status.value,
                target_amount=goal.target_amount,
                deadline=goal.deadline,
                current_amount=current,
                progress_percent=round(percent, 2),
                debt_creditor=creditor,
                debt_current_balance=balance,
            )
        )

    return result
