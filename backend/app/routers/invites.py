import secrets
from datetime import datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_owner, get_current_user_id
from ..config import settings

router = APIRouter(prefix="/invites", tags=["invites"])

INVITE_TTL_DAYS = 7


def _make_invite_url(token: str) -> str:
    return f"{settings.frontend_url}/invite/{token}"


@router.post("/", response_model=schemas.InviteResponse, status_code=201)
def create_invite(
    body: schemas.InviteCreate,
    owner: models.Sitter = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    # Revoke any unused existing invite for this email
    db.query(models.Invite).filter(
        models.Invite.email == body.email,
        models.Invite.used_at == None,
    ).delete()

    token = secrets.token_urlsafe(32)
    invite = models.Invite(
        email=body.email,
        token=token,
        created_by=owner.id,
        expires_at=datetime.utcnow() + timedelta(days=INVITE_TTL_DAYS),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    return schemas.InviteResponse(
        id=invite.id,
        email=invite.email,
        expires_at=invite.expires_at,
        used_at=invite.used_at,
        invite_url=_make_invite_url(token),
    )


@router.get("/", response_model=list[schemas.InviteResponse])
def list_invites(
    owner: models.Sitter = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    invites = db.query(models.Invite).order_by(models.Invite.created_at.desc()).all()
    return [
        schemas.InviteResponse(
            id=i.id,
            email=i.email,
            expires_at=i.expires_at,
            used_at=i.used_at,
            invite_url=_make_invite_url(i.token),
        )
        for i in invites
    ]


@router.post("/accept/{token}", response_model=schemas.Sitter, status_code=201)
def accept_invite(
    token: str,
    body: schemas.SitterCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    invite = db.query(models.Invite).filter(models.Invite.token == token).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.used_at:
        raise HTTPException(status_code=409, detail="Invite already used")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Invite expired")

    existing = db.query(models.Sitter).filter(models.Sitter.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Sitter profile already exists")

    sitter = models.Sitter(**body.model_dump(), user_id=user_id, is_owner=False)
    db.add(sitter)

    invite.used_at = datetime.utcnow()
    db.commit()
    db.refresh(sitter)
    return sitter
