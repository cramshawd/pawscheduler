from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_sitter, get_current_owner

router = APIRouter(prefix="/sitters", tags=["sitters"])


@router.get("/", response_model=list[schemas.SitterPublic])
def list_sitters(db: Session = Depends(get_db)):
    """Public endpoint — lists all active sitters for the embed view."""
    return db.query(models.Sitter).filter(models.Sitter.is_active == True).all()


@router.get("/me", response_model=schemas.Sitter)
def get_me(sitter: models.Sitter = Depends(get_current_sitter)):
    return sitter


@router.put("/me", response_model=schemas.Sitter)
def update_me(
    body: schemas.SitterUpdate,
    sitter: models.Sitter = Depends(get_current_sitter),
    db: Session = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(sitter, field, value)
    db.commit()
    db.refresh(sitter)
    return sitter


@router.get("/{sitter_id}", response_model=schemas.SitterPublic)
def get_sitter(sitter_id: UUID, db: Session = Depends(get_db)):
    sitter = db.query(models.Sitter).filter(
        models.Sitter.id == sitter_id, models.Sitter.is_active == True
    ).first()
    if not sitter:
        raise HTTPException(status_code=404, detail="Sitter not found")
    return sitter


# ── Admin-only ────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[schemas.Sitter])
def admin_list_all(owner: models.Sitter = Depends(get_current_owner), db: Session = Depends(get_db)):
    return db.query(models.Sitter).all()


@router.patch("/admin/{sitter_id}/deactivate", response_model=schemas.Sitter)
def deactivate_sitter(
    sitter_id: UUID,
    owner: models.Sitter = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    sitter = db.query(models.Sitter).filter(models.Sitter.id == sitter_id).first()
    if not sitter:
        raise HTTPException(status_code=404, detail="Sitter not found")
    sitter.is_active = False
    db.commit()
    db.refresh(sitter)
    return sitter
