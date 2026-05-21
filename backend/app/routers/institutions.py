from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import Institution
from app.schemas import InstitutionCreate, InstitutionUpdate, InstitutionResponse

router = APIRouter(prefix="/institutions", tags=["institutions"])


@router.get("/", response_model=list[InstitutionResponse])
def list_institutions(db: Session = Depends(get_db)):
    return db.query(Institution).order_by(Institution.name).all()


@router.post("/", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
def create_institution(payload: InstitutionCreate, db: Session = Depends(get_db)):
    institution = Institution(**payload.model_dump())
    db.add(institution)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Slug já cadastrado.")
    db.refresh(institution)
    return institution


@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution(institution_id: int, db: Session = Depends(get_db)):
    institution = db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Instituição não encontrada.")
    return institution


@router.patch("/{institution_id}", response_model=InstitutionResponse)
def update_institution(
    institution_id: int,
    payload: InstitutionUpdate,
    db: Session = Depends(get_db),
):
    institution = db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Instituição não encontrada.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(institution, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Slug já cadastrado.")
    db.refresh(institution)
    return institution


@router.delete("/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_institution(institution_id: int, db: Session = Depends(get_db)):
    institution = db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Instituição não encontrada.")
    db.delete(institution)
    db.commit()
