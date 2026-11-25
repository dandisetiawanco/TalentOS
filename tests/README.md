# TalentOS Test Suites

Test suites are organized alongside the applications they exercise:

- **Backend integration & security tests (`apps/api/tests/`)**: FastAPI `TestClient` + SQLAlchemy integration tests covering authentication, refresh rotation, password reset, RBAC, cross-organization isolation, duplicate application checks, PDF/DOCX validation, prompt-injection flags, deterministic rule-based resume analysis fallback, interview conflict checks, ICS download, analytics CSV export, candidate privacy, and isolated demo sessions.
  - Run: `pnpm test:api`
- **Frontend contract & UI unit tests (`apps/web/src/__tests__/`)**: Vitest + React Testing Library tests covering Zod schemas, pipeline stage constants, accessible UI primitives, and formatters.
  - Run: `pnpm test:web`
- **End-to-end browser verification (`apps/web/tests/e2e/`)**: Playwright specs covering public landing/showcase, careers board, isolated recruiter demo navigation, and candidate portal authorization boundaries.
  - Run (with local API and web servers active): `pnpm --filter @talentos/web test:e2e`
