-- Run this in your Supabase SQL editor or against your PostgreSQL database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sitters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    phone       TEXT,
    bio         TEXT,
    is_owner    BOOLEAN DEFAULT FALSE,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    phone       TEXT,
    address     TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    breed               TEXT,
    diet_notes          TEXT,
    medication_notes    TEXT,
    behavioral_notes    TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sitter_id   UUID NOT NULL REFERENCES sitters(id),
    client_id   UUID REFERENCES clients(id),
    start_date  TIMESTAMPTZ NOT NULL,
    end_date    TIMESTAMPTZ NOT NULL,
    status      TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'blocked')),
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_pets (
    appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE,
    pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
    PRIMARY KEY (appointment_id, pet_id)
);

CREATE TABLE IF NOT EXISTS booking_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sitter_id   UUID NOT NULL REFERENCES sitters(id),
    client_id   UUID NOT NULL REFERENCES clients(id),
    start_date  TIMESTAMPTZ NOT NULL,
    end_date    TIMESTAMPTZ NOT NULL,
    status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    message     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_request_pets (
    request_id  UUID REFERENCES booking_requests(id) ON DELETE CASCADE,
    pet_id      UUID REFERENCES pets(id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, pet_id)
);

CREATE TABLE IF NOT EXISTS invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    token       TEXT UNIQUE NOT NULL,
    created_by  UUID NOT NULL REFERENCES sitters(id),
    used_at     TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the owner sitter record after you create your Supabase auth user.
-- Replace the UUID with your actual Supabase user ID.
-- INSERT INTO sitters (user_id, name, email, is_owner)
-- VALUES ('<your-supabase-user-id>', 'Your Name', 'you@example.com', TRUE);
