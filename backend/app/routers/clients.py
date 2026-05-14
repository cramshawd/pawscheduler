from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from .. import schemas
from ..database import get_supabase
from ..auth import get_current_client, get_current_user_id, get_current_owner

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("/", response_model=schemas.Client, status_code=201)
def register_client(
    body: schemas.ClientCreate,
    user_id: str = Depends(get_current_user_id),
    sb: Client = Depends(get_supabase),
):
    existing = sb.table("clients").select("id").eq("user_id", user_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Client profile already exists")
    data = body.model_dump()
    data["user_id"] = user_id
    result = sb.table("clients").insert(data).execute()
    row = result.data[0]
    row["pets"] = []
    return row


@router.get("/me", response_model=schemas.Client)
def get_me(client: dict = Depends(get_current_client)):
    return client


@router.put("/me", response_model=schemas.Client)
def update_me(
    body: schemas.ClientUpdate,
    client: dict = Depends(get_current_client),
    sb: Client = Depends(get_supabase),
):
    updates = body.model_dump(exclude_none=True)
    sb.table("clients").update(updates).eq("id", client["id"]).execute()
    result = sb.table("clients").select("*, pets(*)").eq("id", client["id"]).execute()
    return result.data[0]


# ── Pets ──────────────────────────────────────────────────────────────────────

@router.post("/me/pets", response_model=schemas.Pet, status_code=201)
def add_pet(
    body: schemas.PetCreate,
    client: dict = Depends(get_current_client),
    sb: Client = Depends(get_supabase),
):
    data = body.model_dump()
    data["client_id"] = client["id"]
    result = sb.table("pets").insert(data).execute()
    return result.data[0]


@router.put("/me/pets/{pet_id}", response_model=schemas.Pet)
def update_pet(
    pet_id: str,
    body: schemas.PetUpdate,
    client: dict = Depends(get_current_client),
    sb: Client = Depends(get_supabase),
):
    existing = sb.table("pets").select("id").eq("id", pet_id).eq("client_id", client["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Pet not found")
    updates = body.model_dump(exclude_none=True)
    result = sb.table("pets").update(updates).eq("id", pet_id).execute()
    return result.data[0]


@router.delete("/me/pets/{pet_id}", status_code=204)
def delete_pet(
    pet_id: str,
    client: dict = Depends(get_current_client),
    sb: Client = Depends(get_supabase),
):
    existing = sb.table("pets").select("id").eq("id", pet_id).eq("client_id", client["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Pet not found")
    sb.table("pets").delete().eq("id", pet_id).execute()


@router.get("/admin/all", response_model=list[schemas.Client])
def admin_list_clients(
    owner: dict = Depends(get_current_owner),
    sb: Client = Depends(get_supabase),
):
    result = sb.table("clients").select("*, pets(*)").execute()
    return result.data
