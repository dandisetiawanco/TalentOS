# Privacy and Data Governance

TalentOS incorporates privacy-by-design controls appropriate for a modern recruitment workflow demonstration. It does not claim formal GDPR, ISO 27001, SOC 2, or Indonesian PDP legal compliance certification.

## Governance Controls Implemented

- **Explicit Processing Consent**: Candidate registration, public job applications, and resume uploads record `consent_resume_processing` and `consent_recorded_at`. Document analysis endpoints refuse processing (`403`) if candidate consent is absent.
- **Clear AI Disclosure**: Resume analyses distinguish extracted document facts from suggestions, clearly indicate whether `rule_based` or `ai_assisted` mode ran, and list analysis limitations.
- **Configurable Retention**: Organization owners configure `document_retention_days` (30 to 1095 days) in Workspace Settings, setting `retention_expires_at` on newly created candidate dossiers.
- **Candidate Data Deletion**: Non-demo candidate accounts can permanently delete their account, profile, uploaded documents, and application records from `/candidate/settings` (`DELETE /api/v1/auth/account`).
- **Private Evaluation Isolation**: `recruiter_notes`, internal `interview_feedback`, and organization analytics are structurally omitted from candidate portal serializers and blocked by role checks.
- **Zero Real PII in Public Demos**: All seeded names, addresses, phone numbers, meeting links, and generated PDF resumes belong to fictional personas under `@demo.example.com`.
