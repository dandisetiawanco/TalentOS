# Deployment Guide

TalentOS is prepared for deployment with Vercel (frontend), Render or Railway (FastAPI backend), managed PostgreSQL (Supabase or Render Postgres), and private object storage.

## Required Production Environment Variables

### Backend (`apps/api`)
- `APP_ENV=production`
- `DATABASE_URL`: PostgreSQL SQLAlchemy connection string (`postgresql+psycopg://user:password@host:5432/dbname?sslmode=require`)
- `JWT_SECRET_KEY`: High-entropy random string (>= 32 characters)
- `SIGNED_URL_SECRET`: Separate high-entropy random string for HMAC document download links
- `CORS_ORIGINS`: Comma-separated list of production web origins (e.g., `https://talentos.example.com`)
- `COOKIE_SECURE=true`
- `AI_PROVIDER`: `fallback` (default deterministic rules) or `openai`, `gemini`, `ollama`
- Optional provider credentials: `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `OLLAMA_BASE_URL`
- Optional SMTP credentials: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

### Frontend (`apps/web` / Vercel)
- `NEXT_PUBLIC_API_URL`: Public FastAPI v1 base URL (e.g., `https://api.talentos.example.com/api/v1`)
- `NEXT_PUBLIC_APP_URL`: Public Next.js application URL
- `NEXT_PUBLIC_DEMO_MODE=true`

## Frontend Deployment (Vercel)

1. Import the repository into Vercel and set the root directory to `apps/web` (or keep monorepo root with install command `pnpm install` and build command `pnpm --filter @talentos/web build`).
2. Configure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL` in Project Environment Variables.
3. Verify security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) defined in `apps/web/next.config.ts`.

## Backend Deployment (Render / Railway / Container)

- **Dockerfile**: `apps/api/Dockerfile`
- **Build command (native Python)**: `pip install --upgrade pip && pip install .`
- **Pre-deploy migration command**: `alembic upgrade head`
- **Optional showcase seed command**: `python -m app.db.seed`
- **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check endpoint**: `GET /api/v1/health` (liveness) and `GET /api/v1/ready` (readiness with database query check)

## Local Docker Compose

Run the full PostgreSQL + FastAPI + Next.js stack locally when Docker is installed:

```bash
cp .env.example .env
docker compose up --build
```

Apply migrations and seed the showcase dataset:

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.db.seed
```

## Known Deployment Notes

- Local file storage (`STORAGE_BACKEND=local`) is suitable for local runs and single-node Docker volumes. For multi-instance horizontal scaling, mount persistent shared storage or attach private Supabase Storage buckets with signed URLs.
- Email delivery stays inactive until SMTP variables are populated; in-app notifications work regardless.
