# Security Engineering

TalentOS applies defense-in-depth practices aligned with OWASP web application security principles. This project is a portfolio showcase and does not claim third-party security certification or penetration-test attestation.

## Implemented Controls

1. **Authentication & Password Storage**
   - Passwords hashed with Argon2id (`argon2-cffi`).
   - Short-lived signed JWT access tokens (`HS256`) paired with rotating SHA-256-hashed refresh tokens persisted in `refresh_tokens`.
   - Old refresh tokens are revoked immediately upon rotation, logout, or password reset.
   - Startup configuration validates `JWT_SECRET_KEY` length (>= 32 characters).

2. **Authorization & Multi-Tenant Isolation**
   - Every recruiter endpoint enforces FastAPI dependencies (`require_org_roles`) verifying active organization membership and exact role (`organization_owner`, `recruiter`, `hiring_manager`).
   - Every database lookup filters by `organization_id == auth.organization.id`, preventing cross-organization IDOR attacks (verified in automated tests).
   - Candidate accounts are restricted to `/api/v1/candidate/*` endpoints and cannot query `/api/v1/candidates`, `/api/v1/analytics/*`, or `recruiter_notes`.

3. **Upload Hardening & Private File Access**
   - Extension allowlist (`.pdf`, `.docx`), MIME validation, 5 MB payload cap, magic-byte inspection (`%PDF-`, `PK\x03\x04`), DOCX `word/document.xml` structure check, and ZIP uncompressed size guard (25 MB) against zip bombs.
   - Files stored outside public web roots under randomized UUID names with canonical path containment checks preventing path traversal.
   - Downloads require both authentication/authorization AND a short-lived HMAC-SHA256 signed URL (`expires` + `sig`) served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.

4. **Prompt Injection Defense**
   - Uploaded documents are wrapped inside `<UNTRUSTED_RESUME_DOCUMENT>` delimiters when sent to optional LLM providers and scanned by deterministic prompt-injection detectors.

5. **Web & API Hardening**
   - Parameterized SQLAlchemy queries prevent SQL injection.
   - Strict CORS allowlist (`CORS_ORIGINS`), Content Security Policy (`frame-ancestors 'none'`, `base-uri 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
   - Sliding-window rate limiting on authentication, demo provisioning, file uploads, and resume analysis endpoints.
   - Structured HTTP logs omit credentials, tokens, API keys, and raw resume text.
