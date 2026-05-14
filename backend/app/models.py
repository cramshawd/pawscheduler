import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, ForeignKey, Table
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base


appointment_pets = Table(
    "appointment_pets",
    Base.metadata,
    Column("appointment_id", UUID(as_uuid=True), ForeignKey("appointments.id"), primary_key=True),
    Column("pet_id", UUID(as_uuid=True), ForeignKey("pets.id"), primary_key=True),
)

booking_request_pets = Table(
    "booking_request_pets",
    Base.metadata,
    Column("request_id", UUID(as_uuid=True), ForeignKey("booking_requests.id"), primary_key=True),
    Column("pet_id", UUID(as_uuid=True), ForeignKey("pets.id"), primary_key=True),
)


class Sitter(Base):
    __tablename__ = "sitters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    bio = Column(Text)
    is_owner = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointments = relationship("Appointment", back_populates="sitter")
    booking_requests = relationship("BookingRequest", back_populates="sitter")
    sent_invites = relationship("Invite", back_populates="created_by_sitter")


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    address = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    pets = relationship("Pet", back_populates="client", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="client")
    booking_requests = relationship("BookingRequest", back_populates="client")


class Pet(Base):
    __tablename__ = "pets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    breed = Column(String)
    diet_notes = Column(Text)
    medication_notes = Column(Text)
    behavioral_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="pets")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sitter_id = Column(UUID(as_uuid=True), ForeignKey("sitters.id"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    # confirmed | blocked (owner-created blocker, no client)
    status = Column(String, default="confirmed")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    sitter = relationship("Sitter", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")
    pets = relationship("Pet", secondary=appointment_pets)


class BookingRequest(Base):
    __tablename__ = "booking_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sitter_id = Column(UUID(as_uuid=True), ForeignKey("sitters.id"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    # pending | confirmed | declined
    status = Column(String, default="pending")
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    sitter = relationship("Sitter", back_populates="booking_requests")
    client = relationship("Client", back_populates="booking_requests")
    pets = relationship("Pet", secondary=booking_request_pets)


class Invite(Base):
    __tablename__ = "invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("sitters.id"), nullable=False)
    used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    created_by_sitter = relationship("Sitter", back_populates="sent_invites")
