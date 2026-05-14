from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_client, get_current_sitter

router = APIRouter(prefix="/booking-requests", tags=["booking-requests"])


# ── Client ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.BookingRequest, status_code=201)
def submit_request(
    body: schemas.BookingRequestCreate,
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")

    sitter = db.query(models.Sitter).filter(
        models.Sitter.id == body.sitter_id, models.Sitter.is_active == True
    ).first()
    if not sitter:
        raise HTTPException(status_code=404, detail="Sitter not found")

    req = models.BookingRequest(
        sitter_id=body.sitter_id,
        client_id=client.id,
        start_date=body.start_date,
        end_date=body.end_date,
        message=body.message,
    )
    if body.pet_ids:
        pets = db.query(models.Pet).filter(
            models.Pet.id.in_(body.pet_ids),
            models.Pet.client_id == client.id,
        ).all()
        req.pets = pets

    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/mine", response_model=list[schemas.BookingRequest])
def my_requests(
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.BookingRequest)
        .filter(models.BookingRequest.client_id == client.id)
        .order_by(models.BookingRequest.created_at.desc())
        .all()
    )


# ── Sitter ────────────────────────────────────────────────────────────────────

@router.get("/incoming", response_model=list[schemas.BookingRequest])
def incoming_requests(
    sitter: models.Sitter = Depends(get_current_sitter),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.BookingRequest)
        .filter(models.BookingRequest.sitter_id == sitter.id)
        .order_by(models.BookingRequest.created_at.desc())
        .all()
    )


@router.patch("/{request_id}", response_model=schemas.BookingRequest)
def respond_to_request(
    request_id: UUID,
    body: schemas.BookingRequestUpdate,
    sitter: models.Sitter = Depends(get_current_sitter),
    db: Session = Depends(get_db),
):
    if body.status not in ("confirmed", "declined"):
        raise HTTPException(status_code=422, detail="status must be confirmed or declined")

    req = db.query(models.BookingRequest).filter(
        models.BookingRequest.id == request_id,
        models.BookingRequest.sitter_id == sitter.id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = body.status

    if body.status == "confirmed":
        # Create the appointment and decline any other overlapping pending requests
        appt = models.Appointment(
            sitter_id=sitter.id,
            client_id=req.client_id,
            start_date=req.start_date,
            end_date=req.end_date,
            status="confirmed",
            notes=req.message,
        )
        appt.pets = req.pets
        db.add(appt)

    db.commit()
    db.refresh(req)
    return req
