# Changelog

All notable changes to TalentOS are documented in this file.

## [1.0.0] - 2026-11-25

### Added
- **Monorepo foundation**: pnpm workspace (`apps/web`, `apps/api`, `packages/ui`, `packages/contracts`, `packages/config`), Docker Compose configuration, environment template, and GitHub Actions CI workflow.
- **Brand and design system**: Original TalentOS geometric SVG mark, light/dark wordmarks, favicon, Open Graph preview, GitHub social banner, WCAG AA verified forest-slate palette, and self-hosted Geist / Geist Mono typography.
- **Relational database schema**: 20 normalized SQLAlchemy models with Alembic migrations and reference PostgreSQL/Supabase RLS policies.
- **Authentication and RBAC**: Argon2id password hashing, JWT access tokens, rotating hashed refresh tokens, password reset flow, and server-enforced roles (`organization_owner`, `recruiter`, `hiring_manager`, `candidate`).
- **Public website and careers board**: Editorial landing page with live seeded interactive showcase, features, about, privacy, terms, demo launcher, and searchable public job board with duplicate-application prevention.
- **Recruiter workspace**: Collapsible sidebar, mobile drawer, `Cmd/Ctrl + K` command palette, overview dashboard, full job management, candidate directory and dossier, accessible 7-stage Kanban pipeline with human rationale dialogs, interview scheduling with conflict detection and ICS export, SQL-backed analytics with CSV export, team permissions, notifications, and settings.
- **Responsible resume intelligence**: PDF/DOCX validation and text extraction, prompt-injection detection, provider-independent interface (deterministic rule-based default plus optional OpenAI-compatible, Gemini, and Ollama adapters), evidence-based qualification output, and human review sign-off.
- **Candidate portal**: Dedicated applicant experience covering profile editing, application timelines, interview invitations, private resume vault, and candidate data deletion controls.
- **Isolated demo environment**: Per-visitor synthetic organization cloning with 8 jobs, 40 candidates, 60 applications, 12 interviews, and generated PDF resumes.
