import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from .. import schemas
from ..database import get_supabase
from ..auth import get_current_owner, get_current_user_id
from ..config import settings

router = APIRouter(prefix="/invites", tags=["invites"])

INVITE_TTL_DAYS = 7


def _make_invite_url(token: str) -> str:
    return f"{settings.frontend_url}/invite/{token}"


def _to_response(inv: dict) -> dict:
    return {**inv, "invite_url": _make_invite_url(inv["token"])}


@router.post("/", response_model=schemas.InviteResponse, status_code=201)
def create_invite(
    body: schemas.InviteCreate,
    owner: dict = Depends(get_current_owner),
    sb: Client = Depends(get_supabase),
):
    # Revoke any unused existing invite for this email
    sb.table("invites").delete().eq("email", body.email).is_("used_at", "null").execute()

    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(days=INVITE_TTL_DAYS)).isoformat()
    inv = sb.table("invites").insert({
        "email": body.email,
        "token": token,
        "created_by": owner["id"],
        "expires_at": expires,
    }).execute().data[0]
    return _to_response(inv)


@router.get("/", response_model=list[schemas.InviteResponse])
def list_invites(
    owner: dict = Depends(get_current_owner),
    sb: Client = Depends(get_supabase),
):
    result = sb.table("invites").select("*").order("created_at", desc=True).execute()
    return [_to_response(i) for i in result.data]


@router.post("/accept/{token}", response_model=schemas.Sitter, status_code=201)
def accept_invite(
    token: str,
    body: schemas.SitterCreate,
    user_id: str = Depends(get_current_user_id),
    sb: Client = Depends(get_supabase),
):
    inv_result = sb.table("invites").select("*").eq("token", token).execute()
    if not inv_result.data:
        raise HTTPException(status_code=404, detail="Invite not found")

    inv = inv_result.data[0]
    if inv.get("used_at"):
        raise HTTPException(status_code=409, detail="Invite already used")
    if datetime.fromisoformat(inv["expires_at"]) < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Invite expired")

    existing = sb.table("sitters").select("id").eq("user_id", user_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Sitter profile already exists")

    sitter = sb.table("sitters").insert({
        **body.model_dump(),
        "user_id": user_id,
        "is_owner": False,
    }).execute().data[0]

    sb.table("invites").update({"used_at": datetime.utcnow().isoformat()}).eq("id", inv["id"]).execute()
    return sitter
