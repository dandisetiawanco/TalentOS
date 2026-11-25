<p align="center">
  <img src="assets/branding/github-banner.png" alt="TalentOS: Better hiring. Built on intelligence." width="100%" />
</p>

# TalentOS

**Better hiring. Built on intelligence.**

TalentOS is a full-stack recruitment management platform built as an independent software engineering portfolio project by [Dandi Setiawan](https://dandisetiawan.id). It brings together a public marketing site and careers board, an organization-isolated recruiter workspace, and a dedicated candidate portal backed by a normalized relational schema and evidence-first resume intelligence.

> **Portfolio notice:** TalentOS is an independent software concept, not a commercial vendor. All demonstration organizations, job openings, candidates, and resumes are synthetic and contain zero real personal data.

---

## Application Screenshots

All screenshots below were captured directly from the running TalentOS production build.

### Public Landing Page & Recruiter Overview
| Public Landing Page | Recruiter Overview Dashboard |
|---|---|
| ![TalentOS public landing page](assets/screenshots/01-landing-page.png) | ![TalentOS recruiter overview dashboard](assets/screenshots/02-recruiter-overview.png) |

### Recruitment Pipeline & Responsible Resume Intelligence
| Kanban Recruitment Pipeline | Evidence-Based Resume Analysis |
|---|---|
| ![TalentOS 7-stage Kanban recruitment pipeline](assets/screenshots/05-recruitment-pipeline.png) | ![TalentOS resume qualification evidence review](assets/screenshots/06-resume-analysis.png) |

### Job Management & Candidate Profile
| Job Management | Candidate Dossier & Private Documents |
|---|---|
| ![TalentOS job openings management](assets/screenshots/03-job-management.png) | ![TalentOS candidate profile and documents](assets/screenshots/04-candidate-profile.png) |

### Interviews, Analytics & Candidate Portal
| Interview Coordination Calendar | Recruitment Analytics |
|---|---|
| ![TalentOS interview calendar](assets/screenshots/07-interview-calendar.png) | ![TalentOS recruitment analytics dashboard](assets/screenshots/08-analytics-dashboard.png) |

| Candidate Portal | Dark Mode & Mobile (390px) |
|---|---|
| ![TalentOS candidate portal](assets/screenshots/09-candidate-portal.png) | ![TalentOS dark mode workspace](assets/screenshots/11-dark-mode.png) |

<details>
  <summary>View mobile viewport screenshot (390px)</summary>
  <br />
  <img src="assets/screenshots/10-mobile-experience.png" alt="TalentOS mobile responsive layout at 390px width" width="390" />
</details>

---

## Product Features

- **Three interconnected experiences**: Public website and live careers board (`/` and `/careers`), recruiter workspace (`/workspace/*`), and a separate candidate portal (`/candidate/*`).
- **Role-based access control and tenant isolation**: `organization_owner`, `recruiter`, `hiring_manager`, and `candidate` roles enforced at the FastAPI dependency and database query layers.
- **Job architecture**: Draft, publish, pause, or close requisitions with required/preferred qualifications, skills, compensation bands, and closing dates. Published roles sync directly to `/careers`.
- **Candidate management**: Searchable directory, skill and stage filtering, full candidate dossiers, expiring HMAC-signed document downloads, and private internal recruiter notes hidden from candidates.
- **Accessible 7-stage Kanban pipeline**: Drag-and-drop via `dnd-kit` paired with keyboard and single-pointer stage selectors, optimistic updates with rollback on failure, and mandatory human decision rationale before moving a candidate to `Hired` or `Rejected`.
- **Evidence-first resume intelligence**: PDF (`PyMuPDF`) and DOCX (`python-docx`) validation and text extraction, prompt-injection detection, criterion-by-criterion verbatim quotes, deterministic rule-based fallback with zero API keys required, and human reviewer verification.
- **Interview coordination**: Month, week, and agenda views, automatic interviewer and candidate conflict detection, structured feedback rubrics, and downloadable RFC 5545 `.ics` calendar invitations.
- **Recruitment analytics**: Funnel stage distribution, conversion rates, daily application volume, time to hire, stage dwell times, department rollups, documented metric definitions, and CSV export.
- **Productivity and accessibility**: `Cmd/Ctrl + K` global command palette, persistent in-app notifications, responsive container-queried tables, native HTML `<dialog>` modals and mobile drawers, and verified WCAG AA light/dark themes.

---

## Technology Stack

- **Frontend (`apps/web`, `packages/ui`, `packages/contracts`)**: Next.js 15 (App Router), React 19, strict TypeScript, Tailwind CSS v4, Radix UI, Motion, Lucide icons, TanStack Query, React Hook Form, Zod, Recharts, dnd-kit, self-hosted Geist and Geist Mono.
- **Backend (`apps/api`)**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Argon2id (`argon2-cffi`), PyJWT, PyMuPDF, python-docx.
- **Database (`database/`)**: PostgreSQL 16 (Docker Compose / Supabase with reference RLS policies) with a zero-Docker local SQLite fallback (`PRAGMA foreign_keys=ON`).
- **Quality and CI**: pytest, Ruff, Vitest, React Testing Library, Playwright, Docker Compose, GitHub Actions (`.github/workflows/ci.yml`).

---

## System Architecture

```text
talentos/
├── apps/
│   ├── web/              # Next.js 15 App Router frontend (29 routes)
│   └── api/              # FastAPI v1 REST API & domain services
├── packages/
│   ├── ui/               # Shared accessible UI primitives and brand components
│   ├── contracts/        # Shared TypeScript types and Zod schemas
│   └── config/           # Shared strict TypeScript base config
├── database/
│   ├── migrations/       # Alembic migrations + Supabase PostgreSQL RLS SQL
│   └── seeds/            # Synthetic public showcase CLI seeder
├── assets/
│   ├── branding/         # SVG/PNG brand mark, wordmarks, favicon, OG & banner
│   └── screenshots/      # Captured application screenshots
├── docs/                 # Architecture, DB ERD, API, AI, Security, Privacy, Deployment
└── scripts/              # Local startup helper (scripts/dev.sh)
```

Detailed engineering documentation lives in [`docs/`](docs/):
- [Architecture](docs/ARCHITECTURE.md)
- [Database Schema & ERD](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [AI Resume Intelligence](docs/AI_SYSTEM.md)
- [Security Engineering](docs/SECURITY.md)
- [Privacy & Governance](docs/PRIVACY.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Interactive Demo Guide](docs/DEMO.md)
- [Testing Strategy](docs/TESTING.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

---

## Local Installation

### Prerequisites
- Node.js 20+ and `pnpm` 9+
- Python 3.12 (recommended via `uv` or `venv`)
- Optional: Docker & Docker Compose for containerized PostgreSQL

### Quick Start (Local Development)

1. Copy environment variables:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   ```

2. Install frontend workspace dependencies:
   ```bash
   pnpm install
   ```

3. Set up the Python backend virtual environment and install packages:
   ```bash
   cd apps/api
   uv venv --python 3.12 .venv
   uv pip install --python .venv/bin/python -e ".[dev]"
   cd ../..
   ```

4. Apply Alembic migrations and seed the public showcase dataset:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. Start both services (in two terminals, or run `./scripts/dev.sh`):
   ```bash
   pnpm dev:api
   pnpm dev:web
   ```

6. Open:
   - Web application: `http://localhost:3000`
   - FastAPI OpenAPI docs: `http://localhost:8000/api/v1/docs`

### Docker Compose (PostgreSQL + API + Web)

```bash
cp .env.example .env
docker compose up --build
```

---

## Demo Instructions

Open `http://localhost:3000/demo` to launch an isolated session as a **Recruiter**, **Hiring Manager**, or **Candidate**.

- Each click creates a dedicated isolated organization cloned from the synthetic **Alder & Finch Systems (Demo)** dataset: 8 job openings, 40 candidates, 60 applications across 7 stages, 12 interviews, and generated PDF resumes.
- Visitor edits stay strictly isolated to that visitor's session and never alter other visitors' workspaces.
- Public demo sessions use deterministic rule-based resume analysis so every feature functions without paid AI API keys.

---

## Responsible AI Principles

- **Human-led hiring decisions**: TalentOS never automatically moves candidates to `Hired` or `Rejected`.
- **Verifiable evidence**: Qualification checks cite verbatim quotes from the submitted document and label missing items as `not found`, never as proven lack of skill.
- **No sensitive profiling**: The platform refuses demographic inference, personality scoring, employability predictions, or universal black-box candidate scores.
- **Transparent fallback**: When no external AI provider is configured (or inside public demo sessions), TalentOS runs deterministic rule-based extraction and labels the output clearly as `rule_based`.
- **Prompt-injection defense**: Uploaded documents are parsed as untrusted data and scanned for embedded override instructions.

---

## Security Considerations

- Argon2id password hashing, short-lived JWT access tokens, and SHA-256-hashed rotating refresh tokens.
- Server-enforced RBAC and strict `organization_id` tenant scoping on every recruiter query.
- Strict PDF/DOCX upload validation (extension, MIME type, magic bytes, archive structure, 5 MB limit), randomized private filenames, and expiring HMAC-signed download URLs.
- Content Security Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, restricted CORS, and sliding-window rate limiting.
- TalentOS is a portfolio application and does not claim formal third-party security or regulatory compliance certification.

---

## Development Roadmap

Planned post-v1.0.0 extensions are documented in [docs/ROADMAP.md](docs/ROADMAP.md), including SMTP/Resend transactional email adapters, direct Supabase Storage upload integration, scheduled retention cleanup jobs, and optional OAuth calendar free/busy lookups.

---

## Author

Designed and developed by **Dandi Setiawan** ([dandisetiawan.id](https://dandisetiawan.id)).

All rights regarding licensing and redistribution remain reserved by the repository owner.
