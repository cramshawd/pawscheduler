from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from .routers import sitters, clients, appointments, booking_requests, invites

app = FastAPI(title="DogSitter Calendar API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sitters.router)
app.include_router(clients.router)
app.include_router(appointments.router)
app.include_router(booking_requests.router)
app.include_router(invites.router)


@app.get("/health")
def health():
    return {"status": "ok"}
