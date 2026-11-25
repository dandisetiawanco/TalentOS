import { z } from "zod";

export const APPLICATION_STAGES = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: "Applied",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export const USER_ROLES = [
  "organization_owner",
  "recruiter",
  "hiring_manager",
  "candidate",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  organization_owner: "Organization Owner",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  candidate: "Candidate",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const WORK_ARRANGEMENT_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  screening: "Initial Screening",
  technical: "Technical Interview",
  system_design: "System Design",
  behavioral: "Behavioral",
  panel: "Hiring Panel",
  final: "Final Round",
};

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  account_type: z.enum(["recruiter", "candidate"]),
  organization_name: z.string().optional(),
  consent_resume_processing: z.boolean().default(false),
});

export const jobFormSchema = z
  .object({
    title: z.string().min(3, "Job title must be at least 3 characters."),
    department: z.string().min(2, "Department is required."),
    employment_type: z.enum(["full_time", "part_time", "contract", "internship"]),
    work_arrangement: z.enum(["remote", "hybrid", "onsite"]),
    location: z.string().min(2, "Location is required."),
    salary_min: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
    salary_max: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
    salary_currency: z.string().min(3).max(8).default("USD"),
    description: z.string().min(20, "Provide a clear role summary (at least 20 characters)."),
    responsibilities_text: z.string().default(""),
    required_qualifications_text: z.string().default(""),
    preferred_qualifications_text: z.string().default(""),
    required_skills_text: z.string().default(""),
    status: z.enum(["draft", "published", "paused", "closed"]).default("draft"),
    openings_count: z.coerce.number().int().min(1).max(100).default(1),
    application_deadline: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.salary_min !== "" && data.salary_max !== "" && data.salary_min !== undefined && data.salary_max !== undefined) {
        return Number(data.salary_min) <= Number(data.salary_max);
      }
      return true;
    },
    { message: "Minimum salary cannot exceed maximum salary.", path: ["salary_max"] }
  );

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  default_timezone: string;
  document_retention_days: number;
  is_demo: boolean;
}

export interface UserPreferences {
  theme: "system" | "light" | "dark";
  email_notifications_enabled: boolean;
  notify_new_application: boolean;
  notify_interview_updates: boolean;
  notify_status_updates: boolean;
  notify_resume_analysis: boolean;
  default_timezone: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  account_type: "recruiter" | "candidate";
  role: UserRole;
  is_verified: boolean;
  is_demo: boolean;
  demo_session_id: string | null;
  organization: OrganizationSummary | null;
  preferences: UserPreferences;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthenticatedUser;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface JobRecord {
  id: string;
  organization_id: string;
  organization_name: string;
  slug: string;
  title: string;
  department: string;
  employment_type: string;
  work_arrangement: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string;
  responsibilities: string[];
  required_qualifications: string[];
  preferred_qualifications: string[];
  required_skills: string[];
  status: "draft" | "published" | "paused" | "closed";
  openings_count: number;
  application_deadline: string | null;
  hiring_manager_id: string | null;
  hiring_manager_name: string | null;
  is_demo: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  application_count: number;
  stage_counts: Record<string, number>;
}

export interface StageHistoryEntry {
  id: string;
  from_stage: string | null;
  to_stage: ApplicationStage;
  changed_by_name: string | null;
  reason: string | null;
  changed_at: string;
}

export interface ApplicationSummary {
  id: string;
  job_id: string;
  job_title: string;
  job_slug: string;
  job_department: string;
  organization_name: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_location: string | null;
  candidate_years_experience: number;
  candidate_skills: string[];
  stage: ApplicationStage;
  assigned_recruiter_id: string | null;
  assigned_recruiter_name: string | null;
  cover_note: string | null;
  decision_reason: string | null;
  source: string;
  applied_at: string;
  last_activity_at: string;
  resume_document_id: string | null;
  evidence_found_count: number | null;
  required_total_count: number | null;
  stage_history: StageHistoryEntry[];
}

export interface CandidateDirectoryItem {
  id: string;
  full_name: string;
  email: string;
  location: string | null;
  headline: string | null;
  years_of_experience: number;
  skills: string[];
  latest_application_id: string | null;
  latest_job_id: string | null;
  latest_job_title: string | null;
  latest_stage: ApplicationStage | null;
  assigned_recruiter_name: string | null;
  last_activity_at: string;
}

export interface CandidateDocument {
  id: string;
  document_type: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  consent_granted: boolean;
  is_demo: boolean;
  created_at: string;
  signed_download_url: string | null;
}

export interface QualificationEvidence {
  criterion: string;
  status: "evidence_found" | "not_found" | "ambiguous";
  evidence_excerpt: string | null;
  notes: string | null;
}

export interface ResumeAnalysisStructuredOutput {
  professional_summary: string;
  extracted_technical_skills: string[];
  extracted_professional_skills: string[];
  relevant_work_experience: string[];
  education: string[];
  certifications: string[];
  required_qualifications_evidence: QualificationEvidence[];
  preferred_qualifications_evidence: QualificationEvidence[];
  requirements_not_found: string[];
  uncertain_or_ambiguous: string[];
  suggested_interview_questions: string[];
  analysis_limitations: string[];
  qualification_coverage_summary: string;
}

export interface ResumeAnalysisRecord {
  id: string;
  candidate_id: string;
  application_id: string | null;
  job_id: string | null;
  job_title: string | null;
  document_id: string | null;
  analysis_mode: "rule_based" | "ai_assisted";
  provider_name: string;
  model_name: string | null;
  prompt_injection_flags: string[];
  structured_output: ResumeAnalysisStructuredOutput;
  human_reviewed: boolean;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  reviewer_corrections: Record<string, unknown> | null;
  created_at: string;
}

export interface RecruiterNote {
  id: string;
  candidate_id: string;
  application_id: string | null;
  author_id: string;
  author_name: string;
  content: string;
  is_private: boolean;
  created_at: string;
}

export interface CandidateDetail {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  professional_summary: string | null;
  years_of_experience: number;
  education: Array<{ institution?: string; degree?: string; end_year?: string }>;
  work_experience: Array<{
    company?: string;
    role?: string;
    start_date?: string;
    end_date?: string;
    highlights?: string[];
  }>;
  linkedin_url: string | null;
  portfolio_url: string | null;
  consent_resume_processing: boolean;
  consent_recorded_at: string | null;
  skills: Array<{ id: string; skill_name: string; category: string; proficiency: string | null; source: string }>;
  documents: CandidateDocument[];
  applications: ApplicationSummary[];
  interviews: Array<{
    id: string;
    title: string;
    interview_type: string;
    status: string;
    job_title: string;
    scheduled_start: string;
    scheduled_end: string;
    duration_minutes: number;
    timezone: string;
    meeting_link: string | null;
  }>;
  notes: RecruiterNote[];
  analyses: ResumeAnalysisRecord[];
  activity: Array<{ id: string; action: string; summary: string; created_at: string }>;
  created_at: string;
}

export interface PipelineBoardResponse {
  stages: ApplicationStage[];
  counts: Record<ApplicationStage, number>;
  total: number;
  columns: Record<ApplicationStage, ApplicationSummary[]>;
}

export interface InterviewRecord {
  id: string;
  application_id: string;
  job_id: string;
  job_title: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  title: string;
  interview_type: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  timezone: string;
  meeting_link: string | null;
  location: string | null;
  instructions: string | null;
  participants: Array<{
    user_id: string;
    full_name: string;
    email: string;
    role: string;
    attendance_status: string;
  }>;
  feedback_entries: Array<{
    id: string;
    reviewer_id: string;
    reviewer_name: string;
    recommendation: "strong_yes" | "yes" | "mixed" | "no";
    strengths: string;
    concerns: string | null;
    notes: string | null;
    rubric_scores: Record<string, number>;
    submitted_at: string;
  }>;
  created_at: string;
}

export interface AnalyticsOverview {
  date_range_days: number;
  active_job_openings: number;
  total_applications: number;
  interviews_scheduled: number;
  offers_made: number;
  hired_count: number;
  avg_time_to_hire_days: number | null;
  interview_completion_rate_pct: number | null;
  offer_acceptance_rate_pct: number | null;
  stage_distribution: Array<{
    stage: ApplicationStage;
    label: string;
    count: number;
    conversion_from_previous_pct: number | null;
  }>;
  applications_over_time: Array<{ date: string; applications: number }>;
  applications_by_job: Array<{
    job_id: string;
    title: string;
    department: string;
    status: string;
    applications: number;
    interviews: number;
    offers: number;
    hired: number;
  }>;
  avg_days_per_stage: Array<{ stage: string; label: string; avg_days: number | null }>;
  hiring_by_department: Array<{
    department: string;
    open_jobs: number;
    applications: number;
    interviews: number;
    hired: number;
  }>;
  jobs_requiring_attention: Array<{
    job_id: string;
    title: string;
    department: string;
    unreviewed_count: number;
    total_applications: number;
    closing_soon: boolean;
    application_deadline: string | null;
    reason: string;
  }>;
  metric_definitions: Record<string, string>;
}

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: "organization_owner" | "recruiter" | "hiring_manager";
  status: "active" | "invited" | "disabled";
  title: string | null;
  department: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  event_type: string;
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  summary: string;
  created_at: string;
}

export interface CandidateProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  timezone: string;
  headline: string | null;
  bio: string | null;
  years_of_experience: number | null;
  skills: string[];
  education: Array<{ institution?: string; degree?: string; end_year?: string }>;
  work_experience: Array<{
    company?: string;
    role?: string;
    start_date?: string;
    end_date?: string;
    highlights?: string[];
  }>;
  linkedin_url: string | null;
  portfolio_url: string | null;
  consent_resume_processing: boolean;
  consent_recorded_at: string | null;
}

export interface CandidateApplicationView {
  id: string;
  job_id: string;
  job_title: string;
  job_slug: string;
  job_department: string;
  job_location: string;
  job_work_arrangement: string;
  organization_name: string;
  stage: ApplicationStage;
  cover_note: string | null;
  applied_at: string;
  last_activity_at: string;
  timeline: StageHistoryEntry[];
  interviews: Array<{
    id: string;
    title: string;
    interview_type: string;
    status: string;
    scheduled_start: string;
    scheduled_end: string;
    duration_minutes: number;
    timezone: string;
    meeting_link: string | null;
    location: string | null;
    instructions: string | null;
    ics_url: string;
  }>;
}

export interface CandidateInterviewView {
  id: string;
  application_id: string;
  job_title: string;
  organization_name: string;
  title: string;
  interview_type: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  timezone: string;
  meeting_link: string | null;
  location: string | null;
  instructions: string | null;
  ics_url: string;
}

export interface PublicShowcaseData {
  organization_name: string;
  is_demo_dataset: boolean;
  pipeline_columns: Record<
    string,
    Array<{
      application_id: string;
      candidate_name: string;
      job_title: string;
      location: string | null;
      years_of_experience: number;
      stage: ApplicationStage;
    }>
  >;
  featured_candidate: {
    full_name: string;
    headline: string | null;
    location: string | null;
    years_of_experience: number;
    job_title: string;
    analysis_mode: "rule_based" | "ai_assisted";
    structured_output: ResumeAnalysisStructuredOutput;
  } | null;
  interviews: Array<{
    id: string;
    title: string;
    interview_type: string;
    status: string;
    candidate_name: string;
    job_title: string;
    scheduled_start: string;
    duration_minutes: number;
    timezone: string;
  }>;
  analytics: AnalyticsOverview;
  published_jobs_count: number;
  total_applications: number;
  evidence_reviews_count: number;
}
