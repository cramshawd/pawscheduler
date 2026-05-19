from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from .. import schemas
from ..database import get_supabase
from ..auth import get_current_client, get_current_sitter, get_current_owner

router = APIRouter(prefix="/booking-requests", tags=["booking-requests"])


def _attach_pets(sb: Client, requests: list[dict]) -> list[dict]:
    if not requests:
        return requests
    req_ids = [r["id"] for r in requests]
    junc = sb.table("booking_request_pets").select("request_id, pets(*)").in_("request_id", req_ids).execute()
    pet_map: dict[str, list] = {}
    for row in junc.data:
        pet_map.setdefault(row["request_id"], []).append(row["pets"])
    for r in requests:
        r["pets"] = pet_map.get(r["id"], [])
        if "client" not in r:
            r["client"] = None
    return requests


def _attach_clients(sb: Client, requests: list[dict]) -> list[dict]:
    if not requests:
        return requests
    client_ids = list({r["client_id"] for r in requests})
    clients = sb.table("clients").select("id,name").in_("id", client_ids).execute().data
    client_map = {c["id"]: c for c in clients}
    for r in requests:
        r["client"] = client_map.get(r["client_id"])
    return requests


# ── Client ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.BookingRequest, status_code=201)
def submit_request(
    body: schemas.BookingRequestCreate,
    client: dict = Depends(get_current_client),
    sb: Client = Depends(get_supabase),
):
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")

    sitter = sb.table("sitters").select("id").eq("id", str(body.sitter_id)).eq("is_active", True).execute()
    if not sitter.data:
        raise HTTPException(status_code=404, detail="Sitter not found")

    data = {
        "sitter_id": str(body.sitter_id),
        "client_id": client["id"],
        "start_date": body.start_date.isoformat(),
        "end_date": body.end_date.isoformat(),
        "message": body.message,
    }
    req = sb.table("booking_requests").insert(data).execute().data[0]

    if body.pet_ids:
        pet_ids = [str(pid) for pid in body.pet_ids]
        valid_pets = sb.table("pets").select("id").in_("id", pet_ids).eq("client_id", client["id"]).execute().data
        if valid_pets:
            sb.table("booking_request_pets").insert(
                [{"request_id": req["id"], "pet_id": p["id"]} for p in valid_pets]
            ).execute()

    req["pets"] = []
    req["client"] = None
    return req


@router.get("/mine", response_model=list[schemas.BookingRequest])
def my_requests(
    client: dict = Depends(get_current_client),
    sb: Client = Depends(get_supabase),
):
    result = sb.table("booking_requests").select("*").eq("client_id", client["id"]).order("created_at", desc=True).execute()
    requests = _attach_pets(sb, result.data)
    for r in requests:
        r["client"] = None
    return requests


# ── Sitter ────────────────────────────────────────────────────────────────────

@router.get("/incoming", response_model=list[schemas.BookingRequest])
def incoming_requests(
    sitter: dict = Depends(get_current_sitter),
    sb: Client = Depends(get_supabase),
):
    result = sb.table("booking_requests").select("*").eq("sitter_id", sitter["id"]).order("created_at", desc=True).execute()
    requests = _attach_pets(sb, result.data)
    return _attach_clients(sb, requests)


@router.patch("/{request_id}", response_model=schemas.BookingRequest)
def respond_to_request(
    request_id: str,
    body: schemas.BookingRequestUpdate,
    sitter: dict = Depends(get_current_sitter),
    sb: Client = Depends(get_supabase),
):
    if body.status not in ("confirmed", "declined"):
        raise HTTPException(status_code=422, detail="status must be confirmed or declined")

    req_result = sb.table("booking_requests").select("*").eq("id", request_id).eq("sitter_id", sitter["id"]).execute()
    if not req_result.data:
        raise HTTPException(status_code=404, detail="Request not found")

    req = req_result.data[0]
    sb.table("booking_requests").update({"status": body.status}).eq("id", request_id).execute()

    if body.status == "confirmed":
        appt = sb.table("appointments").insert({
            "sitter_id": sitter["id"],
            "client_id": req["client_id"],
            "start_date": req["start_date"],
            "end_date": req["end_date"],
            "status": "confirmed",
            "notes": req.get("message"),
        }).execute().data[0]

        # Copy pets from the booking request to the appointment
        pet_rows = sb.table("booking_request_pets").select("pet_id").eq("request_id", request_id).execute().data
        if pet_rows:
            sb.table("appointment_pets").insert(
                [{"appointment_id": appt["id"], "pet_id": r["pet_id"]} for r in pet_rows]
            ).execute()

    req["status"] = body.status
    req["pets"] = [r["pets"] for r in sb.table("booking_request_pets").select("pets(*)").eq("request_id", request_id).execute().data]
    req["client"] = None
    return req


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[schemas.BookingRequest])
def admin_all_requests(
    status: str = Query(None),
    owner: dict = Depends(get_current_owner),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("booking_requests").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    result = q.execute()
    requests = _attach_pets(sb, result.data)
    return _attach_clients(sb, requests)
