import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.tag import Tag, CategoryRule
from app.schemas.tag import (
    CategoryRuleCreate,
    CategoryRuleResponse,
    CategoryRuleUpdate,
    TagCreate,
    TagResponse,
    TagUpdate,
)

router = APIRouter(tags=["tags"])

tags_router = APIRouter(prefix="/tags")
rules_router = APIRouter(prefix="/category-rules")


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug.strip("-")


# ── Tags ──────────────────────────────────────────────────────────────────────

@tags_router.get("/", response_model=list[TagResponse])
def list_tags(search: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(Tag).order_by(Tag.name)
    if search:
        q = q.filter(Tag.name.ilike(f"%{search}%"))
    return q.all()


@tags_router.post("/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    slug = _slugify(payload.name)
    if db.query(Tag).filter(Tag.slug == slug).first():
        raise HTTPException(status_code=409, detail=f"Tag '{payload.name}' já existe.")
    tag = Tag(name=payload.name, slug=slug, color=payload.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@tags_router.get("/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag não encontrada.")
    return tag


@tags_router.patch("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: int, payload: TagUpdate, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag não encontrada.")
    if payload.name is not None:
        new_slug = _slugify(payload.name)
        conflict = db.query(Tag).filter(Tag.slug == new_slug, Tag.id != tag_id).first()
        if conflict:
            raise HTTPException(status_code=409, detail=f"Tag '{payload.name}' já existe.")
        tag.name = payload.name
        tag.slug = new_slug
    if payload.color is not None:
        tag.color = payload.color
    db.commit()
    db.refresh(tag)
    return tag


@tags_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag não encontrada.")
    db.delete(tag)
    db.commit()


# ── Category Rules ────────────────────────────────────────────────────────────

def _resolve_tags(tag_ids: list[int], db: Session) -> list[Tag]:
    if not tag_ids:
        return []
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    missing = set(tag_ids) - {t.id for t in tags}
    if missing:
        raise HTTPException(status_code=404, detail=f"Tags não encontradas: {sorted(missing)}")
    return tags


@rules_router.get("/", response_model=list[CategoryRuleResponse])
def list_rules(db: Session = Depends(get_db)):
    return (
        db.query(CategoryRule)
        .options(joinedload(CategoryRule.tags))
        .order_by(CategoryRule.priority.desc(), CategoryRule.keyword)
        .all()
    )


@rules_router.post("/", response_model=CategoryRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(payload: CategoryRuleCreate, db: Session = Depends(get_db)):
    tags = _resolve_tags(payload.tag_ids, db)
    rule = CategoryRule(
        keyword=payload.keyword,
        match_type=payload.match_type,
        priority=payload.priority,
        tags=tags,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return db.query(CategoryRule).options(joinedload(CategoryRule.tags)).filter(CategoryRule.id == rule.id).one()


@rules_router.get("/{rule_id}", response_model=CategoryRuleResponse)
def get_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = (
        db.query(CategoryRule)
        .options(joinedload(CategoryRule.tags))
        .filter(CategoryRule.id == rule_id)
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    return rule


@rules_router.patch("/{rule_id}", response_model=CategoryRuleResponse)
def update_rule(rule_id: int, payload: CategoryRuleUpdate, db: Session = Depends(get_db)):
    rule = db.get(CategoryRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

    for field, value in update_data.items():
        setattr(rule, field, value)

    if tag_ids is not None:
        rule.tags = _resolve_tags(tag_ids, db)

    db.commit()
    return db.query(CategoryRule).options(joinedload(CategoryRule.tags)).filter(CategoryRule.id == rule_id).one()


@rules_router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(CategoryRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    db.delete(rule)
    db.commit()


router.include_router(tags_router)
router.include_router(rules_router)
