from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_sitter, get_current_owner

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _overlaps(model, start: datetime, end: datetime):
    return and_(model.start_date < end, model.end_date > start)


# ── Public ─────────────────────────────────────────────────────────────────────

@router.get("/public/{sitter_id}", response_model=list[schemas.AppointmentPublic])
def sitter_public_calendar(
    sitter_id: UUID,
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: Session = Depends(get_db),
):
    """Returns confirmed/blocked slots for a sitter — no client data exposed."""
    return (
        db.query(models.Appointment)
        .filter(
            models.Appointment.sitter_id == sitter_id,
            models.Appointment.status.in_(["confirmed", "blocked"]),
            _overlaps(models.Appointment, start, end),
        )
        .all()
    )


@router.get("/alternatives")
def suggest_alternatives(
    start: datetime = Query(...),
    end: datetime = Query(...),
    exclude_sitter_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Returns all active sitters with availability flag for the given range."""
    sitters = (
        db.query(models.Sitter)
        .filter(models.Sitter.is_active == True, models.Sitter.id != exclude_sitter_id)
        .all()
    )
    result = []
    for sitter in sitters:
        conflict = (
            db.query(models.Appointment)
            .filter(
                models.Appointment.sitter_id == sitter.id,
                models.Appointment.status.in_(["confirmed", "blocked"]),
                _overlaps(models.Appointment, start, end),
            )
            .first()
        )
        result.append({"sitter": sitter, "available": conflict is None})
    return result


# ── Sitter-authenticated ───────────────────────────────────────────────────────

@router.get("/mine", response_model=list[schemas.Appointment])
def list_my_appointments(
    start: datetime = Query(None),
    end: datetime = Query(None),
    sitter: models.Sitter = Depends(get_current_sitter),
    db: Session = Depends(get_db),
):
    q = db.query(models.Appointment).filter(models.Appointment.sitter_id == sitter.id)
    if start and end:
        q = q.filter(_overlaps(models.Appointment, start, end))
    return q.all()


@router.post("/", response_model=schemas.Appointment, status_code=201)
def create_appointment(
    body: schemas.AppointmentCreate,
    sitter: models.Sitter = Depends(get_current_sitter),
    db: Session = Depends(get_db),
):
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")

    appt = models.Appointment(
        sitter_id=sitter.id,
        client_id=body.client_id,
        start_date=body.start_date,
        end_date=body.end_date,
        status=body.status,
        notes=body.notes,
    )
    if body.pet_ids:
        pets = db.query(models.Pet).filter(models.Pet.id.in_(body.pet_ids)).all()
        appt.pets = pets

    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


@router.put("/{appt_id}", response_model=schemas.Appointment)
def update_appointment(
    appt_id: UUID,
    body: schemas.AppointmentUpdate,
    sitter: models.Sitter = Depends(get_current_sitter),
    db: Session = Depends(get_db),
):
    appt = db.query(models.Appointment).filter(
        models.Appointment.id == appt_id,
        models.Appointment.sitter_id == sitter.id,
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    data = body.model_dump(exclude_none=True)
    pet_ids = data.pop("pet_ids", None)
    for field, value in data.items():
        setattr(appt, field, value)
    if pet_ids is not None:
        appt.pets = db.query(models.Pet).filter(models.Pet.id.in_(pet_ids)).all()

    db.commit()
    db.refresh(appt)
    return appt


@router.delete("/{appt_id}", status_code=204)
def delete_appointment(
    appt_id: UUID,
    sitter: models.Sitter = Depends(get_current_sitter),
    db: Session = Depends(get_db),
):
    appt = db.query(models.Appointment).filter(
        models.Appointment.id == appt_id,
        models.Appointment.sitter_id == sitter.id,
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[schemas.Appointment])
def admin_all_appointments(
    start: datetime = Query(None),
    end: datetime = Query(None),
    owner: models.Sitter = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    q = db.query(models.Appointment)
    if start and end:
        q = q.filter(_overlaps(models.Appointment, start, end))
    return q.all()
