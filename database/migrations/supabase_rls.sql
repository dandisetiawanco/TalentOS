-- TalentOS PostgreSQL / Supabase Row-Level Security (RLS) reference policies.
-- Apply after running Alembic migrations on PostgreSQL/Supabase environments
-- where authenticated requests set app.current_user_id and app.current_org_id
-- session variables (or map Supabase auth.uid() to users.id).

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Published jobs from active organizations are publicly readable for the careers board.
CREATE POLICY jobs_public_read ON jobs
  FOR SELECT
  USING (status = 'published');

-- Organization-scoped access for active organization members.
CREATE POLICY org_member_jobs_access ON jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = jobs.organization_id
        AND om.user_id::text = current_setting('app.current_user_id', true)
        AND om.status = 'active'
    )
  );

-- Private recruiter notes: strictly visible only to active members of the owning organization.
-- Candidates never receive SELECT privileges on recruiter_notes.
CREATE POLICY recruiter_notes_org_only ON recruiter_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = recruiter_notes.organization_id
        AND om.user_id::text = current_setting('app.current_user_id', true)
        AND om.status = 'active'
    )
  );

-- Candidate self-access on own applications while keeping organization isolation intact.
CREATE POLICY applications_org_or_self_read ON applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = applications.organization_id
        AND om.user_id::text = current_setting('app.current_user_id', true)
        AND om.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM candidates c
      WHERE c.id = applications.candidate_id
        AND c.user_id::text = current_setting('app.current_user_id', true)
    )
  );
