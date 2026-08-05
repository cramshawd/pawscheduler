# PawScheduler — Dog Sitter Calendar App

A calendar application for managing dog sitter bookings. Embeds into any website via `<iframe>`. Supports an owner/admin, multiple sitters (invite-only), and clients with pet profiles.

---

## Summit integration

I've added a webhook for Summit Cognitive to see how the API works

## Architecture

| Layer | Tech | Hosting |
|---|---|---|
| Frontend | React + Vite + TypeScript | Vercel |
| Backend | FastAPI (Python) | Railway |
| Database + Auth | PostgreSQL + Auth | Supabase |

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `backend/migrations/001_initial.sql`
3. Note your **Project URL**, **Anon Key**, **JWT Secret**, and **Database connection string** (under Settings → Database → Connection string → URI)
4. After creating your Supabase auth account, insert the owner row into the `sitters` table:
   ```sql
   INSERT INTO sitters (user_id, name, email, is_owner)
   VALUES ('<your-supabase-user-uuid>', 'Your Name', 'you@example.com', TRUE);
   ```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in .env with your Supabase values

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL

npm install
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Deployment

### Backend → Railway

1. Push the `backend/` directory to a GitHub repo (or use a monorepo)
2. Create a new Railway project and connect the repo
3. Set environment variables in Railway's dashboard (same as `.env`)
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

1. Push the `frontend/` directory to GitHub
2. Import into Vercel, set root to `frontend/`
3. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (your Railway URL)

---

## Embedding in an existing website

Once deployed, add this anywhere in the existing site's HTML:

```html
<iframe
  src="https://your-vercel-app.vercel.app/embed"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 12px; border: 1px solid #e5e7eb;"
></iframe>
```

The `/embed` route is the public-facing client view. It requires no login to browse availability, but prompts for sign-in when a client wants to submit a booking request.

---

## User flows

### Owner (your friend)
1. Sign in at `/login`
2. Dashboard at `/admin` — 4 tabs: All Calendars, Sitters, Clients, Invites
3. Send invite links to other sitters from the Invites tab
4. Manage his own calendar at `/sitter`

### Sitter (invited)
1. Opens the invite link `/invite/:token`
2. Creates an account and fills in their profile
3. Manages their calendar at `/sitter` — confirm/decline booking requests

### Client
1. Opens the embedded widget or goes to `/embed`
2. Selects a sitter and drags to pick dates
3. If booked, sees alternative available sitters
4. Signs up / signs in, then submits a booking request
5. Tracks request status at `/client`

---

## Project structure

```
dogsitter-calendar/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── config.py        # Settings from env
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── models.py        # DB models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── auth.py          # JWT validation + role guards
│   │   └── routers/
│   │       ├── sitters.py
│   │       ├── clients.py
│   │       ├── appointments.py
│   │       ├── booking_requests.py
│   │       └── invites.py
│   ├── migrations/
│   │   └── 001_initial.sql  # Run once in Supabase SQL editor
│   └── requirements.txt
└── frontend/
    └── src/
        ├── contexts/AuthContext.tsx  # Session + profile state
        ├── lib/
        │   ├── supabase.ts           # Supabase client
        │   └── api.ts                # Axios + types
        ├── components/
        │   ├── NavBar.tsx
        │   ├── SitterCard.tsx
        │   ├── AppointmentModal.tsx
        │   └── BookingRequestModal.tsx
        └── pages/
            ├── EmbedView.tsx         # Public iframe view
            ├── Login.tsx
            ├── AcceptInvite.tsx
            ├── ClientRegister.tsx
            ├── ClientPortal.tsx
            ├── SitterPortal.tsx
            └── AdminDashboard.tsx
```
