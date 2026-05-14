from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


# ── Pet ──────────────────────────────────────────────────────────────────────

class PetBase(BaseModel):
    name: str
    breed: Optional[str] = None
    diet_notes: Optional[str] = None
    medication_notes: Optional[str] = None
    behavioral_notes: Optional[str] = None

class PetCreate(PetBase):
    pass

class PetUpdate(PetBase):
    name: Optional[str] = None

class Pet(PetBase):
    id: UUID
    client_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Client ────────────────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class Client(ClientBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    pets: list[Pet] = []

    model_config = {"from_attributes": True}

class ClientPublic(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}


# ── Sitter ────────────────────────────────────────────────────────────────────

class SitterBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    bio: Optional[str] = None

class SitterCreate(SitterBase):
    pass

class SitterUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None

class Sitter(SitterBase):
    id: UUID
    user_id: UUID
    is_owner: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class SitterPublic(BaseModel):
    id: UUID
    name: str
    bio: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Appointment ───────────────────────────────────────────────────────────────

class AppointmentBase(BaseModel):
    start_date: datetime
    end_date: datetime
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    client_id: Optional[UUID] = None
    pet_ids: list[UUID] = []
    status: str = "confirmed"

class AppointmentUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    pet_ids: Optional[list[UUID]] = None

class Appointment(AppointmentBase):
    id: UUID
    sitter_id: UUID
    client_id: Optional[UUID] = None
    status: str
    pets: list[Pet] = []
    created_at: datetime

    model_config = {"from_attributes": True}

class AppointmentPublic(BaseModel):
    """Redacted view for the public embed — no client details."""
    id: UUID
    start_date: datetime
    end_date: datetime
    status: str

    model_config = {"from_attributes": True}


# ── Booking Request ───────────────────────────────────────────────────────────

class BookingRequestCreate(BaseModel):
    sitter_id: UUID
    start_date: datetime
    end_date: datetime
    pet_ids: list[UUID] = []
    message: Optional[str] = None

class BookingRequestUpdate(BaseModel):
    status: str  # confirmed | declined

class BookingRequest(BaseModel):
    id: UUID
    sitter_id: UUID
    client_id: UUID
    start_date: datetime
    end_date: datetime
    status: str
    message: Optional[str] = None
    pets: list[Pet] = []
    client: Optional[ClientPublic] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Invite ────────────────────────────────────────────────────────────────────

class InviteCreate(BaseModel):
    email: EmailStr

class InviteResponse(BaseModel):
    id: UUID
    email: str
    expires_at: datetime
    used_at: Optional[datetime] = None
    invite_url: str

    model_config = {"from_attributes": True}


# ── Availability / Suggestions ───────────────────────────────────────────────

class AvailabilityQuery(BaseModel):
    start_date: datetime
    end_date: datetime

class AlternativeSitter(BaseModel):
    sitter: SitterPublic
    available: bool
