from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_client, get_current_user_id, get_current_owner

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("/", response_model=schemas.Client, status_code=201)
def register_client(
    body: schemas.ClientCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    existing = db.query(models.Client).filter(models.Client.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Client profile already exists")
    client = models.Client(**body.model_dump(), user_id=user_id)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/me", response_model=schemas.Client)
def get_me(client: models.Client = Depends(get_current_client)):
    return client


@router.put("/me", response_model=schemas.Client)
def update_me(
    body: schemas.ClientUpdate,
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


# ── Pets ──────────────────────────────────────────────────────────────────────

@router.post("/me/pets", response_model=schemas.Pet, status_code=201)
def add_pet(
    body: schemas.PetCreate,
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    pet = models.Pet(**body.model_dump(), client_id=client.id)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@router.put("/me/pets/{pet_id}", response_model=schemas.Pet)
def update_pet(
    pet_id: UUID,
    body: schemas.PetUpdate,
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    pet = db.query(models.Pet).filter(
        models.Pet.id == pet_id, models.Pet.client_id == client.id
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(pet, field, value)
    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/me/pets/{pet_id}", status_code=204)
def delete_pet(
    pet_id: UUID,
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    pet = db.query(models.Pet).filter(
        models.Pet.id == pet_id, models.Pet.client_id == client.id
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    db.delete(pet)
    db.commit()


# ── Admin-only ────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[schemas.Client])
def admin_list_clients(
    owner: models.Sitter = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    return db.query(models.Client).all()
