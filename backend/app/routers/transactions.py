import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Account, Tag, Transaction
from app.models.transaction import TransactionFlow
from app.schemas.transaction import (
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])

_MAX_PAGE_SIZE = 200


def _base_query(db: Session):
    return db.query(Transaction).options(joinedload(Transaction.tags))


def _apply_filters(
    q,
    account_id: int | None,
    account_group_id: int | None,
    date_from: datetime.date | None,
    date_to: datetime.date | None,
    flow: TransactionFlow | None,
    search: str | None,
    tag_ids: list[int] | None,
    db: Session,
):
    if account_id is not None:
        q = q.filter(Transaction.account_id == account_id)

    if account_group_id is not None:
        account_ids = [
            row[0]
            for row in db.query(Account.id)
            .filter(Account.account_group_id == account_group_id)
            .all()
        ]
        q = q.filter(Transaction.account_id.in_(account_ids))

    if date_from is not None:
        q = q.filter(Transaction.date >= date_from)

    if date_to is not None:
        q = q.filter(Transaction.date <= date_to)

    if flow is not None:
        q = q.filter(Transaction.flow == flow)

    if search:
        q = q.filter(Transaction.description.ilike(f"%{search}%"))

    if tag_ids:
        # Retorna transações que possuem QUALQUER uma das tags informadas
        q = (
            q.join(Transaction.tags)
            .filter(Tag.id.in_(tag_ids))
            .distinct()
        )

    return q


@router.get("/", response_model=TransactionListResponse)
def list_transactions(
    account_id: int | None = Query(None),
    account_group_id: int | None = Query(None),
    date_from: datetime.date | None = Query(None),
    date_to: datetime.date | None = Query(None),
    flow: TransactionFlow | None = Query(None),
    search: str | None = Query(None, min_length=1),
    tag_ids: list[int] = Query(default=[]),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=_MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
):
    q = _apply_filters(
        _base_query(db),
        account_id,
        account_group_id,
        date_from,
        date_to,
        flow,
        search,
        tag_ids or None,
        db,
    )

    total = q.with_entities(func.count(Transaction.id.distinct())).scalar()

    items = (
        q.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    def _sum_flow(f: TransactionFlow) -> Decimal:
        return _apply_filters(
            db.query(func.sum(Transaction.amount)),
            account_id, account_group_id, date_from, date_to,
            f, search, tag_ids or None, db,
        ).scalar() or Decimal('0')

    return TransactionListResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_income=_sum_flow(TransactionFlow.income),
        total_expense=_sum_flow(TransactionFlow.expense),
    )


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    if not db.get(Account, payload.account_id):
        raise HTTPException(status_code=404, detail="Conta não encontrada.")

    tx_hash = Transaction.make_hash(
        payload.account_id, payload.date, payload.description, payload.amount
    )
    if db.query(Transaction).filter(Transaction.hash == tx_hash).first():
        raise HTTPException(status_code=409, detail="Transação duplicada (mesma conta, data, descrição e valor).")

    tags = _resolve_tags(payload.tag_ids, db)

    tx = Transaction(
        account_id=payload.account_id,
        date=payload.date,
        description=payload.description,
        amount=payload.amount,
        flow=payload.flow,
        hash=tx_hash,
        is_manual=True,
        tags=tags,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return _base_query(db).filter(Transaction.id == tx.id).one()


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    tx = _base_query(db).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")
    return tx


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
):
    tx = db.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

    for field, value in update_data.items():
        setattr(tx, field, value)

    # Recalcula hash se algum campo de identidade mudou
    if any(f in update_data for f in ("date", "description", "amount")):
        tx.hash = Transaction.make_hash(tx.account_id, tx.date, tx.description, tx.amount)

    if tag_ids is not None:
        tx.tags = _resolve_tags(tag_ids, db)

    db.commit()
    return _base_query(db).filter(Transaction.id == transaction_id).one()


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    tx = db.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")
    db.delete(tx)
    db.commit()


def _resolve_tags(tag_ids: list[int], db: Session) -> list[Tag]:
    if not tag_ids:
        return []
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    missing = set(tag_ids) - {t.id for t in tags}
    if missing:
        raise HTTPException(status_code=404, detail=f"Tags não encontradas: {sorted(missing)}")
    return tags
