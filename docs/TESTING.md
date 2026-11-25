# Testing Strategy

TalentOS pairs backend integration tests, frontend schema/component unit tests, static analysis, and end-to-end Playwright browser verification.

## Backend Tests (FastAPI + SQLAlchemy + pytest)

Location: `apps/api/tests/`

Run locally:
```bash
pnpm test:api
cd apps/api && .venv/bin/ruff check app tests
```

Covered scenarios:
- Health and readiness endpoints.
- Registration, login, rotating refresh tokens (revoking reused tokens), and password reset confirmation.
- Role-based access control (Organization Owner, Recruiter, Hiring Manager restrictions, Candidate portal isolation).
- Cross-organization isolation (verifying Org B receives 404 when reading or patching Org A's jobs or signed documents).
- Job creation, publication, and public careers board visibility.
- Public job application submission and `409 Conflict` duplicate application prevention.
- Resume upload validation (rejecting invalid file extensions/headers; accepting valid PDF and DOCX files with consent).
- Prompt-injection detection and deterministic `rule_based` resume analysis fallback without API keys.
- Mandatory human rationale (`422` when omitted) before moving applications to `hired` or `rejected`.
- Interview scheduling, double-booking conflict detection (`409`), and RFC 5545 ICS download.
- Strict privacy isolation confirming private `recruiter_notes` never appear in candidate API responses.
- Candidate self-service account & data deletion workflow.
- Public demo session isolation verifying visitor A's edits do not alter visitor B's demo organization.
- Analytics overview calculation and CSV export.

## Frontend Unit & Component Tests (Vitest + React Testing Library)

Location: `apps/web/src/__tests__/`

Run locally:
```bash
pnpm test:web
pnpm typecheck
pnpm lint
```

Covered scenarios:
- Zod validation for login, registration, and job salary range invariants.
- Pipeline stage definitions and formatting helpers.
- Accessible rendering and interaction of shared `@talentos/ui` primitives.

## End-to-End Browser Tests (Playwright)

Location: `apps/web/tests/e2e/smoke.spec.ts`

Run locally with both servers started (`localhost:8000` and `localhost:3000`):
```bash
pnpm --filter @talentos/web test:e2e
```
