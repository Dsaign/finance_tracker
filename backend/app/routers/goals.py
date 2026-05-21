from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Account
from app.models.goal import Goal, GoalAccount, Debt, GoalStatus, GoalType
from app.schemas.goal import (
    DebtUpdate,
    GoalAccountsUpdate,
    GoalCreate,
    GoalResponse,
    GoalUpdate,
)

router = APIRouter(prefix="/goals", tags=["goals"])


def _load_goal(goal_id: int, db: Session) -> Goal:
    goal = (
        db.query(Goal)
        .options(
            joinedload(Goal.goal_accounts),
            joinedload(Goal.debt),
        )
        .filter(Goal.id == goal_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado.")
    return goal


def _resolve_accounts(account_ids: list[int], db: Session) -> list[Account]:
    if not account_ids:
        return []
    accounts = db.query(Account).filter(Account.id.in_(account_ids)).all()
    missing = set(account_ids) - {a.id for a in accounts}
    if missing:
        raise HTTPException(status_code=404, detail=f"Contas não encontradas: {sorted(missing)}")
    return accounts


def _build_response(goal: Goal) -> GoalResponse:
    goal.__dict__["account_ids"] = [ga.account_id for ga in goal.goal_accounts]
    return GoalResponse.model_validate(goal)


# ── Goals CRUD ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[GoalResponse])
def list_goals(
    goal_type: GoalType | None = Query(None),
    status: GoalStatus | None = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Goal)
        .options(joinedload(Goal.goal_accounts), joinedload(Goal.debt))
        .order_by(Goal.created_at.desc())
    )
    if goal_type is not None:
        q = q.filter(Goal.goal_type == goal_type)
    if status is not None:
        q = q.filter(Goal.status == status)

    return [_build_response(g) for g in q.all()]


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db)):
    accounts = _resolve_accounts(payload.account_ids, db)

    goal = Goal(
        name=payload.name,
        description=payload.description,
        goal_type=payload.goal_type,
        target_amount=payload.target_amount,
        deadline=payload.deadline,
        status=GoalStatus.active,
    )
    db.add(goal)
    db.flush()  # garante goal.id

    for account in accounts:
        db.add(GoalAccount(goal_id=goal.id, account_id=account.id))

    if payload.debt is not None:
        debt = Debt(
            goal_id=goal.id,
            **payload.debt.model_dump(),
        )
        db.add(debt)

    db.commit()
    return _build_response(_load_goal(goal.id, db))


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    return _build_response(_load_goal(goal_id, db))


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: int, payload: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    return _build_response(_load_goal(goal_id, db))


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado.")
    db.delete(goal)
    db.commit()


# ── Contas vinculadas ─────────────────────────────────────────────────────────

@router.put("/{goal_id}/accounts", response_model=GoalResponse)
def set_goal_accounts(goal_id: int, payload: GoalAccountsUpdate, db: Session = Depends(get_db)):
    """Substitui todas as contas vinculadas ao objetivo."""
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado.")

    _resolve_accounts(payload.account_ids, db)  # valida que existem

    db.query(GoalAccount).filter(GoalAccount.goal_id == goal_id).delete()
    for account_id in payload.account_ids:
        db.add(GoalAccount(goal_id=goal_id, account_id=account_id))

    db.commit()
    return _build_response(_load_goal(goal_id, db))


# ── Dívida ────────────────────────────────────────────────────────────────────

@router.patch("/{goal_id}/debt", response_model=GoalResponse)
def update_debt(goal_id: int, payload: DebtUpdate, db: Session = Depends(get_db)):
    """Atualiza os detalhes da dívida (principalmente current_balance após pagamentos)."""
    goal = _load_goal(goal_id, db)

    if goal.goal_type != GoalType.debt_payoff:
        raise HTTPException(
            status_code=422,
            detail="Apenas goals do tipo 'debt_payoff' possuem dívida."
        )
    if goal.debt is None:
        raise HTTPException(status_code=404, detail="Este objetivo não tem dívida cadastrada.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal.debt, field, value)

    db.commit()
    return _build_response(_load_goal(goal_id, db))
