import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { StatusTag } from "@talentos/ui";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore how TalentOS connects job publishing, candidate review, Kanban pipelines, resume evidence extraction, interviews, and recruitment analytics.",
};

const FEATURE_GROUPS = [
  {
    code: "01",
    name: "Job Architecture and Public Careers Board",
    summary:
      "Create structured requisitions with responsibilities, required qualifications, preferred qualifications, skills, compensation bands, and closing dates. Published roles appear immediately on the public careers site.",
    bullets: [
      "Draft, published, paused, and closed role lifecycle with activity logging.",
      "Public search and filtering by department, employment type, and workplace arrangement.",
      "Duplicate application protection scoped per job opening and candidate email.",
    ],
  },
  {
    code: "02",
    name: "Candidate Management and Privacy Boundaries",
    summary:
      "Centralize applicant history, uploaded documents, verified skills, interviews, and private hiring-team notes inside organization-isolated workspaces.",
    bullets: [
      "Full directory search, stage/job/skill filters, sorting, and server-backed pagination.",
      "Private recruiter notes remain invisible to candidate accounts at both API and schema levels.",
      "Candidate portal provides profile editing, application timelines, document management, and data deletion controls.",
    ],
  },
  {
    code: "03",
    name: "Accessible Kanban Recruitment Pipeline",
    summary:
      "Coordinate applicants across Applied, Screening, Shortlisted, Interview, Offer, Hired, and Rejected stages without losing accountability.",
    bullets: [
      "Drag-and-drop via dnd-kit paired with full keyboard and button stage-movement alternatives.",
      "Optimistic UI updates with automatic rollback if an API authorization or validation check fails.",
      "Mandatory human confirmation and written rationale before moving a candidate to Hired or Rejected.",
    ],
  },
  {
    code: "04",
    name: "Responsible Resume Intelligence",
    summary:
      "Extract structured qualifications from PDF and DOCX files with verbatim evidence excerpts, prompt-injection detection, and deterministic rule-based analysis when no AI API key is configured.",
    bullets: [
      "Strict upload validation checking extension, MIME type, magic bytes, archive structure, and 5 MB limit.",
      "Provider-independent interface supporting rule-based fallback, OpenAI-compatible APIs, Gemini, and local Ollama.",
      "Never infers demographics, personality traits, employability scores, or automated hiring decisions.",
    ],
  },
  {
    code: "05",
    name: "Interview Scheduling and Structured Feedback",
    summary:
      "Coordinate single or multi-interviewer rounds in month, week, and agenda views with conflict detection and rubric feedback collection.",
    bullets: [
      "Automatic conflict checking prevents double-booking interviewers or candidates.",
      "RFC 5545 ICS calendar invitation downloads for both interviewers and applicants.",
      "Structured interview scorecards record recommendation, strengths, concerns, and rubric ratings.",
    ],
  },
  {
    code: "06",
    name: "Recruitment Analytics and Team Governance",
    summary:
      "Review funnel conversion, stage dwell times, time to hire, interview completion, and offer acceptance rates backed by real SQL stage history.",
    bullets: [
      "Filter metrics by date range, department, and job opening, with one-click CSV export.",
      "Organization Owner, Recruiter, Hiring Manager, and Candidate RBAC enforced on every endpoint.",
      "Cmd/Ctrl + K command palette, persistent in-app notifications, and audit history logs.",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <section className="mx-auto max-w-[1160px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">Platform capabilities</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
            Every workflow built to keep recruitment legible and accountable
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)]">
            TalentOS connects public job discovery, candidate self-service, internal team review,
            and structured reporting through one versioned REST API and normalized relational schema.
          </p>

          <div className="mt-10 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {FEATURE_GROUPS.map((group) => (
              <section key={group.code} className="grid gap-6 py-8 lg:grid-cols-[0.9fr_1.4fr]">
                <div>
                  <StatusTag tone="neutral">{group.code}</StatusTag>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                    {group.name}
                  </h2>
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
                    {group.summary}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[var(--color-text)]">
                    {group.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center rounded-[7px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)]"
            >
              Try the isolated demo
            </Link>
            <Link
              href="/careers"
              className="inline-flex min-h-11 items-center rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
            >
              Inspect public careers board
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
