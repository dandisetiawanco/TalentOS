# API Reference

All endpoints are versioned under `/api/v1` and documented interactively via OpenAPI at `/api/v1/docs` and `/api/v1/openapi.json`.

## Authentication and Error Envelope

- **Authentication**: Supports both `Authorization: Bearer <access_token>` headers and `HttpOnly` `SameSite=Lax` cookies (`talentos_access_token`, `talentos_refresh_token`).
- **Structured errors**: All `4xx` and `5xx` responses return a consistent JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more input fields are invalid.",
    "details": []
  }
}
```

## Endpoint Groups

### System
- `GET /api/v1/health`: Liveness check reporting configured AI provider and SMTP status.
- `GET /api/v1/ready`: Readiness check verifying database connectivity (`SELECT 1`).

### Authentication (`/api/v1/auth`)
- `POST /register`: Create a recruiter organization owner or candidate account.
- `POST /login`: Authenticate and receive access + rotating refresh tokens.
- `POST /demo`: Provision a dedicated isolated demo organization for `recruiter`, `hiring_manager`, or `candidate`.
- `POST /refresh`: Rotate refresh token and issue a fresh access token.
- `POST /logout`: Revoke active refresh token and clear session cookies.
- `GET /me`: Return current authenticated user, active organization, and preferences.
- `PATCH /preferences`: Update theme and notification settings.
- `POST /password-reset/request` & `POST /password-reset/confirm`: Tokenized password reset workflow.
- `DELETE /account`: Self-service permanent deletion for non-demo candidate accounts.

### Organization, Team, Notifications & Activity
- `GET /api/v1/organizations/current` & `PATCH /api/v1/organizations/current` (owner only).
- `GET /api/v1/team`, `POST /api/v1/team/invite` (owner only), `PATCH /api/v1/team/{member_id}` (owner only).
- `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`.
- `GET /api/v1/activity`: Recent organization audit trail.

### Public Careers & Showcase
- `GET /api/v1/public/showcase`: Read-only snapshot from the synthetic public showcase dataset.
- `GET /api/v1/public/jobs`: Paginated, searchable, filterable published job openings.
- `GET /api/v1/public/jobs/{slug}`: Published role detail.
- `POST /api/v1/public/jobs/{slug}/apply`: Submit application with consent check and duplicate prevention (`409` on duplicate).

### Recruiter Jobs, Candidates & Pipeline
- `GET /api/v1/jobs`, `POST /api/v1/jobs`, `GET /api/v1/jobs/{id}`, `PATCH /api/v1/jobs/{id}`, `DELETE /api/v1/jobs/{id}`.
- `GET /api/v1/candidates`, `GET /api/v1/candidates/{id}`, `POST /api/v1/candidates/{id}/notes`.
- `GET /api/v1/applications`, `GET /api/v1/pipeline`, `PATCH /api/v1/applications/{id}/stage`.

### Documents & Resume Intelligence
- `POST /api/v1/documents/upload`: Multipart PDF/DOCX upload with extension, MIME, magic-byte, size, and consent checks.
- `GET /api/v1/documents/{id}/signed-url` & `GET /api/v1/documents/{id}/download`: Expiring HMAC-signed download flow.
- `DELETE /api/v1/documents/{id}`.
- `POST /api/v1/resume-analyses`: Run deterministic rule-based or configured AI qualification analysis.
- `PATCH /api/v1/resume-analyses/{id}/review`: Record human reviewer sign-off and corrections.

### Interviews, Analytics & Search
- `GET /api/v1/interviews`, `POST /api/v1/interviews` (conflict-checked), `PATCH /api/v1/interviews/{id}`, `POST /api/v1/interviews/{id}/feedback`, `GET /api/v1/interviews/{id}/ics`.
- `GET /api/v1/analytics/overview`, `GET /api/v1/analytics/export.csv`.
- `GET /api/v1/search?q=...`: Workspace global search for the `Cmd/Ctrl + K` command palette.

### Candidate Portal (`/api/v1/candidate`)
- `GET /profile`, `PATCH /profile`, `GET /applications`, `GET /applications/{id}`, `GET /interviews`, `GET /documents`.
