from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from .. import schemas
from ..database import get_supabase
from ..auth import get_current_sitter, get_current_owner

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _attach_pets(sb: Client, appointments: list[dict]) -> list[dict]:
    if not appointments:
        return appointments
    appt_ids = [a["id"] for a in appointments]
    junc = sb.table("appointment_pets").select("appointment_id, pets(*)").in_("appointment_id", appt_ids).execute()
    pet_map: dict[str, list] = {}
    for row in junc.data:
        pet_map.setdefault(row["appointment_id"], []).append(row["pets"])
    for a in appointments:
        a["pets"] = pet_map.get(a["id"], [])
    return appointments


# ── Public ─────────────────────────────────────────────────────────────────────

@router.get("/public/{sitter_id}", response_model=list[schemas.AppointmentPublic])
def sitter_public_calendar(
    sitter_id: str,
    start: datetime = Query(...),
    end: datetime = Query(...),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("appointments")
        .select("id,start_date,end_date,status")
        .eq("sitter_id", sitter_id)
        .in_("status", ["confirmed", "blocked"])
        .lt("start_date", end.isoformat())
        .gt("end_date", start.isoformat())
        .execute()
    )
    return result.data


@router.get("/alternatives")
def suggest_alternatives(
    start: datetime = Query(...),
    end: datetime = Query(...),
    exclude_sitter_id: str = Query(...),
    sb: Client = Depends(get_supabase),
):
    sitters = (
        sb.table("sitters")
        .select("id,name,bio")
        .eq("is_active", True)
        .neq("id", exclude_sitter_id)
        .execute()
    ).data

    # Find sitters with conflicting appointments in the range
    booked_ids = set(
        row["sitter_id"]
        for row in sb.table("appointments")
        .select("sitter_id")
        .in_("status", ["confirmed", "blocked"])
        .lt("start_date", end.isoformat())
        .gt("end_date", start.isoformat())
        .execute()
        .data
    )

    return [{"sitter": s, "available": s["id"] not in booked_ids} for s in sitters]


# ── Sitter-authenticated ───────────────────────────────────────────────────────

@router.get("/mine", response_model=list[schemas.Appointment])
def list_my_appointments(
    start: datetime = Query(None),
    end: datetime = Query(None),
    sitter: dict = Depends(get_current_sitter),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("appointments").select("*").eq("sitter_id", sitter["id"])
    if start and end:
        q = q.lt("start_date", end.isoformat()).gt("end_date", start.isoformat())
    result = q.execute()
    return _attach_pets(sb, result.data)


@router.post("/", response_model=schemas.Appointment, status_code=201)
def create_appointment(
    body: schemas.AppointmentCreate,
    sitter: dict = Depends(get_current_sitter),
    sb: Client = Depends(get_supabase),
):
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")

    data = {
        "sitter_id": sitter["id"],
        "client_id": str(body.client_id) if body.client_id else None,
        "start_date": body.start_date.isoformat(),
        "end_date": body.end_date.isoformat(),
        "status": body.status,
        "notes": body.notes,
    }
    appt = sb.table("appointments").insert(data).execute().data[0]

    if body.pet_ids:
        sb.table("appointment_pets").insert(
            [{"appointment_id": appt["id"], "pet_id": str(pid)} for pid in body.pet_ids]
        ).execute()

    appt["pets"] = (
        [r["pets"] for r in sb.table("appointment_pets").select("pets(*)").eq("appointment_id", appt["id"]).execute().data]
        if body.pet_ids else []
    )
    return appt


@router.put("/{appt_id}", response_model=schemas.Appointment)
def update_appointment(
    appt_id: str,
    body: schemas.AppointmentUpdate,
    sitter: dict = Depends(get_current_sitter),
    sb: Client = Depends(get_supabase),
):
    existing = sb.table("appointments").select("id").eq("id", appt_id).eq("sitter_id", sitter["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Appointment not found")

    updates = body.model_dump(exclude_none=True)
    pet_ids = updates.pop("pet_ids", None)

    if updates:
        for key in ("start_date", "end_date"):
            if key in updates and isinstance(updates[key], datetime):
                updates[key] = updates[key].isoformat()
        sb.table("appointments").update(updates).eq("id", appt_id).execute()

    if pet_ids is not None:
        sb.table("appointment_pets").delete().eq("appointment_id", appt_id).execute()
        if pet_ids:
            sb.table("appointment_pets").insert(
                [{"appointment_id": appt_id, "pet_id": str(pid)} for pid in pet_ids]
            ).execute()

    appt = sb.table("appointments").select("*").eq("id", appt_id).execute().data[0]
    return _attach_pets(sb, [appt])[0]


@router.delete("/{appt_id}", status_code=204)
def delete_appointment(
    appt_id: str,
    sitter: dict = Depends(get_current_sitter),
    sb: Client = Depends(get_supabase),
):
    existing = sb.table("appointments").select("id").eq("id", appt_id).eq("sitter_id", sitter["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Appointment not found")
    sb.table("appointments").delete().eq("id", appt_id).execute()


@router.get("/admin/all", response_model=list[schemas.Appointment])
def admin_all_appointments(
    start: datetime = Query(None),
    end: datetime = Query(None),
    owner: dict = Depends(get_current_owner),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("appointments").select("*")
    if start and end:
        q = q.lt("start_date", end.isoformat()).gt("end_date", start.isoformat())
    result = q.execute()
    return _attach_pets(sb, result.data)
