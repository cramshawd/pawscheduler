from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from .. import schemas
from ..database import get_supabase
from ..auth import get_current_sitter, get_current_owner

router = APIRouter(prefix="/sitters", tags=["sitters"])


@router.get("/", response_model=list[schemas.SitterPublic])
def list_sitters(sb: Client = Depends(get_supabase)):
    result = sb.table("sitters").select("id,name,bio").eq("is_active", True).execute()
    return result.data


@router.get("/me", response_model=schemas.Sitter)
def get_me(sitter: dict = Depends(get_current_sitter)):
    return sitter


@router.put("/me", response_model=schemas.Sitter)
def update_me(
    body: schemas.SitterUpdate,
    sitter: dict = Depends(get_current_sitter),
    sb: Client = Depends(get_supabase),
):
    updates = body.model_dump(exclude_none=True)
    result = sb.table("sitters").update(updates).eq("id", sitter["id"]).execute()
    return result.data[0]


@router.get("/{sitter_id}", response_model=schemas.SitterPublic)
def get_sitter(sitter_id: str, sb: Client = Depends(get_supabase)):
    result = sb.table("sitters").select("id,name,bio").eq("id", sitter_id).eq("is_active", True).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Sitter not found")
    return result.data[0]


@router.get("/admin/all", response_model=list[schemas.Sitter])
def admin_list_all(
    owner: dict = Depends(get_current_owner),
    sb: Client = Depends(get_supabase),
):
    result = sb.table("sitters").select("*").execute()
    return result.data


@router.patch("/admin/{sitter_id}/deactivate", response_model=schemas.Sitter)
def deactivate_sitter(
    sitter_id: str,
    owner: dict = Depends(get_current_owner),
    sb: Client = Depends(get_supabase),
):
    result = sb.table("sitters").update({"is_active": False}).eq("id", sitter_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Sitter not found")
    return result.data[0]
