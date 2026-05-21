from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Account, AccountGroup
from app.schemas import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountGroupCreate,
    AccountGroupUpdate,
    AccountGroupResponse,
)

router = APIRouter(tags=["accounts"])


# ── Account Groups ────────────────────────────────────────────────────────────

groups_router = APIRouter(prefix="/account-groups")


@groups_router.get("/", response_model=list[AccountGroupResponse])
def list_groups(db: Session = Depends(get_db)):
    return db.query(AccountGroup).order_by(AccountGroup.name).all()


@groups_router.post("/", response_model=AccountGroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(payload: AccountGroupCreate, db: Session = Depends(get_db)):
    group = AccountGroup(**payload.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@groups_router.get("/{group_id}", response_model=AccountGroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.get(AccountGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    return group


@groups_router.patch("/{group_id}", response_model=AccountGroupResponse)
def update_group(group_id: int, payload: AccountGroupUpdate, db: Session = Depends(get_db)):
    group = db.get(AccountGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return group


@groups_router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = db.get(AccountGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    db.delete(group)
    db.commit()


# ── Accounts ──────────────────────────────────────────────────────────────────

accounts_router = APIRouter(prefix="/accounts")


def _get_account_query(db: Session):
    return db.query(Account).options(joinedload(Account.institution))


@accounts_router.get("/", response_model=list[AccountResponse])
def list_accounts(active_only: bool = False, db: Session = Depends(get_db)):
    q = _get_account_query(db)
    if active_only:
        q = q.filter(Account.active == True)
    return q.order_by(Account.name).all()


@accounts_router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    account = Account(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return _get_account_query(db).filter(Account.id == account.id).one()


@accounts_router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, db: Session = Depends(get_db)):
    account = _get_account_query(db).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    return account


@accounts_router.patch("/{account_id}", response_model=AccountResponse)
def update_account(account_id: int, payload: AccountUpdate, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    return _get_account_query(db).filter(Account.id == account_id).one()


@accounts_router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    db.delete(account)
    db.commit()


# Registra ambos no router principal
router.include_router(groups_router)
router.include_router(accounts_router)
