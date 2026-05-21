import hashlib
import io
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Account, ImportFile, Transaction
from app.models.import_file import ImportStatus
from app.parsers import get_parser
from app.schemas.import_file import ImportResponse, ImportResult

router = APIRouter(prefix="/imports", tags=["imports"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/", response_model=ImportResult, status_code=status.HTTP_201_CREATED)
async def import_file(
    account_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # ── 1. Lê o arquivo ───────────────────────────────────────────────────────
    raw_bytes = await file.read()
    if len(raw_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 10 MB.")
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    # ── 2. Deduplicação por MD5 (mesmo arquivo reimportado) ───────────────────
    file_hash = hashlib.md5(raw_bytes).hexdigest()
    if db.query(ImportFile).filter(ImportFile.file_hash == file_hash).first():
        raise HTTPException(status_code=409, detail="Este arquivo já foi importado anteriormente.")

    # ── 3. Valida conta e obtém parser ────────────────────────────────────────
    account = (
        db.query(Account)
        .options(joinedload(Account.institution))
        .filter(Account.id == account_id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")

    parser_type = account.institution.parser_type
    try:
        parser = get_parser(parser_type)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Parser '{parser_type}' não configurado para esta instituição.",
        )

    # ── 4. Valida o formato do arquivo ────────────────────────────────────────
    file_like = io.BytesIO(raw_bytes)
    if not parser.validate(file_like):
        raise HTTPException(
            status_code=422,
            detail=f"Formato de arquivo inválido para o parser '{parser_type}'.",
        )

    # ── 5. Registra o import (status=processing) ──────────────────────────────
    import_record = ImportFile(
        account_id=account_id,
        filename=file.filename or "extrato",
        file_hash=file_hash,
        status=ImportStatus.processing,
    )
    db.add(import_record)
    db.flush()  # garante import_record.id sem commitar ainda

    # ── 6. Parseia ────────────────────────────────────────────────────────────
    file_like.seek(0)
    try:
        parsed = parser.parse(file_like)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Erro ao processar o arquivo: {exc}")

    # ── 7. Insere transações (dedup por hash) ─────────────────────────────────
    inserted = 0
    skipped = 0

    # Carrega todos os hashes existentes da conta para checar dedup em memória
    existing_hashes: set[str] = {
        row[0]
        for row in db.query(Transaction.hash).filter(Transaction.account_id == account_id).all()
    }

    for pt in parsed:
        tx_hash = Transaction.make_hash(account_id, pt.date, pt.description, pt.amount)

        if tx_hash in existing_hashes:
            skipped += 1
            continue

        tx = Transaction(
            account_id=account_id,
            import_file_id=import_record.id,
            date=pt.date,
            description=pt.description,
            amount=pt.amount,
            flow=pt.flow,
            hash=tx_hash,
            is_manual=False,
        )
        db.add(tx)
        existing_hashes.add(tx_hash)  # evita duplicatas dentro do próprio arquivo
        inserted += 1

    # ── 8. Finaliza ───────────────────────────────────────────────────────────
    import_record.status = ImportStatus.processed
    db.commit()

    return ImportResult(
        import_file_id=import_record.id,
        filename=import_record.filename,
        total_parsed=len(parsed),
        total_inserted=inserted,
        total_skipped=skipped,
    )


@router.get("/", response_model=list[ImportResponse])
def list_imports(account_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(ImportFile).order_by(ImportFile.imported_at.desc())
    if account_id is not None:
        q = q.filter(ImportFile.account_id == account_id)
    return q.all()


@router.get("/{import_id}", response_model=ImportResponse)
def get_import(import_id: int, db: Session = Depends(get_db)):
    record = db.get(ImportFile, import_id)
    if not record:
        raise HTTPException(status_code=404, detail="Import não encontrado.")
    return record
