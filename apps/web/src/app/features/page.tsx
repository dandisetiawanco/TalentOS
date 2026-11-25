import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore how TalentOS connects job publishing, candidate review, Kanban pipelines, resume insights, interviews, and recruitment analytics.",
};

const FEATURE_GROUPS = [
  {
    name: "Job openings and public careers board",
    summary:
      "Draft, review, and publish structured roles with required qualifications, skills, compensation ranges, and closing dates. Published roles sync directly to the public careers board.",
    bullets: [
      "Draft, published, paused, and closed role lifecycle with activity logging.",
      "Public search and filtering by department, employment type, and workplace arrangement.",
      "Duplicate application protection scoped per opening and candidate email.",
    ],
  },
  {
    name: "Candidate dossiers and privacy boundaries",
    summary:
      "Bring together applicant history, uploaded documents, verified skills, interviews, and private hiring-team notes inside organization-scoped workspaces.",
    bullets: [
      "Directory search, filtering by stage, job, or skill, sorting, and server pagination.",
      "Private recruiter notes remain invisible to candidate accounts across API and database layers.",
      "Dedicated candidate portal with profile editing, timelines, document management, and data deletion.",
    ],
  },
  {
    name: "Human-led hiring pipeline",
    summary:
      "Move applicants across Applied, Screening, Shortlisted, Interview, Offer, Hired, and Rejected stages with clear accountability.",
    bullets: [
      "Pointer drag-and-drop paired with full keyboard and menu stage controls.",
      "Optimistic UI transitions with automatic rollback if server validation fails.",
      "Explicit human confirmation and written rationale required for Hired and Rejected transitions.",
    ],
  },
  {
    name: "Evidence-first resume insights",
    summary:
      "Extract structured qualifications from PDF and DOCX files with verbatim document excerpts, prompt-injection checks, and built-in rule-based review when no AI key is set.",
    bullets: [
      "Strict upload validation verifying extension, MIME type, file signature, and 5 MB limit.",
      "Provider-independent engine supporting built-in rules alongside optional OpenAI, Gemini, or Ollama.",
      "Never infers demographics, personality scores, or automated hiring decisions.",
    ],
  },
  {
    name: "Interview calendar and feedback",
    summary:
      "Coordinate single or panel rounds across month, week, and agenda views with automatic conflict checks and structured rubric feedback.",
    bullets: [
      "Detects overlapping schedules for both interviewers and applicants before saving.",
      "Downloadable RFC 5545 ICS calendar invitations for teams and candidates.",
      "Structured feedback records recommendation, strengths, concerns, and rubric ratings.",
    ],
  },
  {
    name: "Recruitment analytics and team roles",
    summary:
      "Inspect funnel conversion, stage dwell times, time to hire, interview completion, and offer acceptance directly from persisted stage transitions.",
    bullets: [
      "Filter by date range, department, and opening, with one-click CSV export.",
      "Organization Owner, Recruiter, Hiring Manager, and Candidate permissions enforced on every route.",
      "Spotlight command center, in-app notifications, and audit history logs.",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <section className="mx-auto max-w-[1160px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
              Every hiring workflow connected in one calm workspace.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              TalentOS brings public job discovery, candidate self-service, internal hiring collaboration, and
              recruitment analytics onto a single relational model.
            </p>
          </div>

          <div className="mt-10 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {FEATURE_GROUPS.map((group) => (
              <section key={group.name} className="grid gap-5 py-8 lg:grid-cols-[0.85fr_1.45fr]">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
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
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                        />
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
              className="inline-flex h-11 items-center rounded-[11px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Try the demo
            </Link>
            <Link
              href="/careers"
              className="inline-flex h-11 items-center rounded-[11px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-subtle)]"
            >
              Browse open positions
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
