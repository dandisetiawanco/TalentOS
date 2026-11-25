# Interactive Demo Guide

TalentOS includes an immediately accessible interactive demo at `/demo` backed by real database records, real API authorization, and per-visitor session isolation.

## Fictional Demonstration Organization

- **Organization**: Alder & Finch Systems (Demo)
- **Seeded dataset per isolated demo session**:
  - 8 job openings (6 published, 1 paused, 1 draft) across Engineering, Design, Data, Security, Product, and People
  - 40 fictional candidates under `@demo.example.com` (zero real personal data)
  - 60 job applications distributed across all 7 pipeline stages with multi-step stage history over 45 days
  - 12 scheduled and completed interviews with structured feedback scorecards
  - 40 generated synthetic PDF resumes stored in private storage with pre-computed rule-based evidence analyses
  - Team members (Owner, Recruiter, Hiring Manager), private internal notes, notifications, and audit activity logs

## Available Demo Roles

1. **Recruiter (`Rafi Pratama`)**: Full recruitment workflow access across jobs, candidates, Kanban pipeline, resume analysis, interviews, and analytics.
2. **Hiring Manager (`Daniel Kowalski`)**: Candidate dossier inspection, private notes, interview feedback submission, and analytics with organization admin mutations blocked.
3. **Candidate (`Nadia Kusuma`)**: Applicant portal with active applications, application timelines, confirmed interviews with ICS downloads, and private document management.

## Isolation and Safeguards

- Clicking any role on `/demo` sends `POST /api/v1/auth/demo` and provisions a brand-new `Organization` keyed by a unique `demo_session_id`.
- Changes made by one visitor (creating jobs, moving Kanban cards, adding notes, scheduling interviews) are strictly scoped to that visitor's isolated organization.
- Demo sessions lock resume analysis to deterministic rule-based extraction (`AI_ALLOW_EXTERNAL_IN_DEMO=false`) so the platform works without external API keys.
- Destructive actions (deleting jobs or wiping candidate accounts) are guarded inside demo sessions.
