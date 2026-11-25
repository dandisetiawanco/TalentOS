# Product Roadmap

This document tracks realistic engineering milestones beyond the current `v1.0.0` portfolio release. Items listed here are planned future extensions and are not claimed as currently implemented.

## Near-Term Milestones

1. **Transactional Email Provider Adapters**
   - Add concrete SMTP / Resend / Postmark transport modules for verification links, password reset emails, and interview updates when operator credentials are provided.
2. **Supabase Private Storage Backend Adapter**
   - Extend `STORAGE_BACKEND=supabase` in `apps/api/app/services/documents.py` to upload and sign URLs directly against Supabase Storage buckets alongside the current local private storage backend.
3. **Automated Retention Cleanup Job**
   - Add a scheduled worker task to purge expired `candidate_documents` and stale demo organizations past their configured retention timestamps.

## Medium-Term Milestones

4. **Calendar Provider OAuth Synchronization**
   - Optional Google Calendar and Microsoft Graph free/busy lookups complementing the existing RFC 5545 ICS download workflow.
5. **Structured Scorecard Templates**
   - Per-role custom interview rubric templates attached to `jobs` so interviewers evaluate against role-specific dimensions.
6. **Multi-Organization Membership Switcher**
   - Allow recruiters belonging to more than one organization to switch active tenant context without signing out.
