import Link from "next/link";
import { Check, ShieldCheck, X } from "lucide-react";
import { StatusTag } from "@talentos/ui";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { InteractiveShowcase } from "@/components/public/interactive-showcase";

const CAPABILITY_CHAPTERS = [
  {
    index: "01",
    title: "Structured job architecture",
    detail:
      "Draft, review, and publish role specifications with explicit required and preferred criteria. Published roles sync directly to the public careers board with clean validation and duplicate-application checks.",
    artifact: "Draft -> Published -> Public careers board",
  },
  {
    index: "02",
    title: "Organized candidate dossier",
    detail:
      "Consolidate applications, uploaded resumes, structured skills, interview scorecards, and private internal recruiter notes into one timeline while enforcing strict privacy boundaries for candidate accounts.",
    artifact: "Private recruiter notes isolated at API and schema level",
  },
  {
    index: "03",
    title: "Human-led Kanban pipeline",
    detail:
      "Move candidates across seven defined stages using pointer drag-and-drop or keyboard controls. Moving to Hired or Rejected always requires an explicit human decision reason and writes an audit record.",
    artifact: "7 stages with optimistic rollback and audit history",
  },
  {
    index: "04",
    title: "Interview coordination and rubrics",
    detail:
      "Assign hiring panel members, detect overlapping schedules for both interviewers and applicants, download RFC 5545 ICS calendar invitations, and collect structured post-interview feedback.",
    artifact: "Conflict checks + downloadable .ics invitations",
  },
  {
    index: "05",
    title: "Evidence-first resume review",
    detail:
      "Extract text safely from PDF and DOCX files, flag embedded prompt-injection text, map verbatim document excerpts against job criteria, and fall back to transparent rule-based analysis when no AI key is set.",
    artifact: "Rule-based default + optional OpenAI / Gemini / Ollama",
  },
  {
    index: "06",
    title: "Documented recruitment reporting",
    detail:
      "Track funnel conversion, stage dwell times, time to hire, and department activity directly from persisted stage transitions with documented metric definitions and one-click CSV export.",
    artifact: "SQL-backed metrics with zero demographic profiling",
  },
];

const WORKFLOW_STEPS = [
  {
    num: "1",
    title: "Publish a job",
    body: "Define responsibilities, required qualifications, and skills so every reviewer evaluates against shared criteria.",
  },
  {
    num: "2",
    title: "Receive applications",
    body: "Candidates apply on the public careers board with resume upload consent and track updates in their own portal.",
  },
  {
    num: "3",
    title: "Review qualifications",
    body: "Inspect extracted excerpts side by side with job requirements. Missing evidence is marked not found, never penalized automatically.",
  },
  {
    num: "4",
    title: "Coordinate interviews",
    body: "Schedule interviewers without double-booking, share downloadable calendar invites, and log rubric feedback.",
  },
  {
    num: "5",
    title: "Make human-led hiring decisions",
    body: "Authorized team members record final hiring or rejection rationale with complete stage audit history.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Hero section: asymmetric editorial split paired with a real TalentOS interface specimen */}
        <section className="mx-auto max-w-[1240px] px-4 pt-10 pb-14 sm:px-6 md:pt-16 md:pb-20 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1.15fr] lg:gap-12">
            <div className="pt-2">
              <h1 className="text-[clamp(2.25rem,4.8vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--color-text)]">
                Hiring, with greater clarity.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
                Manage recruitment workflows, understand candidate qualifications, and bring your hiring
                team together in one intelligent workspace.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/features"
                  className="inline-flex min-h-12 items-center justify-center rounded-[8px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  Explore the platform
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex min-h-12 items-center justify-center rounded-[8px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors"
                >
                  View live demo
                </Link>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-[var(--color-border)] pt-6">
                <div>
                  <dt className="text-xs text-[var(--color-text-secondary)]">Experiences</dt>
                  <dd className="mt-1 font-mono text-sm font-medium text-[var(--color-text)]">
                    Recruiter &amp; Candidate
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-text-secondary)]">Analysis mode</dt>
                  <dd className="mt-1 font-mono text-sm font-medium text-[var(--color-text)]">
                    Evidence-first
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-text-secondary)]">Demo isolation</dt>
                  <dd className="mt-1 font-mono text-sm font-medium text-[var(--color-text)]">
                    Per-visitor org
                  </dd>
                </div>
              </dl>
            </div>

            {/* Authentic TalentOS interface preview composed from real design-system surfaces */}
            <div
              aria-label="TalentOS candidate evaluation workspace preview"
              className="rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-[var(--color-text)]">
                    workspace / candidates / review
                  </span>
                </div>
                <StatusTag tone="neutral">Synthetic demo record</StatusTag>
              </div>

              <div className="grid divide-y divide-[var(--color-border)] sm:grid-cols-[0.95fr_1.25fr] sm:divide-x sm:divide-y-0">
                <div className="p-4">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">Active role</p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">
                    Staff Frontend Engineer
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    Engineering · Hybrid · Singapore / APAC
                  </p>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                      Stage progression
                    </p>
                    {[
                      { label: "Applied", done: true },
                      { label: "Screening", done: true },
                      { label: "Shortlisted", done: true },
                      { label: "Interview", current: true },
                      { label: "Offer", done: false },
                    ].map((st) => (
                      <div
                        key={st.label}
                        className={`flex items-center justify-between rounded-[6px] border px-2.5 py-1.5 text-xs ${
                          st.current
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent-text)]"
                            : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <span>{st.label}</span>
                        <span className="font-mono text-[11px]">
                          {st.current ? "Current" : st.done ? "Verified" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">Nadia Kusuma</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        7 years experience · Jakarta, ID
                      </p>
                    </div>
                    <StatusTag tone="accent">Rule-based check</StatusTag>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                      Qualification evidence from submitted PDF
                    </p>
                    <div className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[var(--color-text)]">
                          Next.js App Router &amp; TypeScript
                        </span>
                        <span className="font-mono text-[11px] font-medium text-[var(--color-success)]">
                          Evidence found
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        &ldquo;Led core initiatives using TypeScript, React, Next.js, Tailwind CSS for enterprise customers.&rdquo;
                      </p>
                    </div>
                    <div className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[var(--color-text)]">
                          WCAG 2.2 AA &amp; Playwright testing
                        </span>
                        <span className="font-mono text-[11px] font-medium text-[var(--color-success)]">
                          Evidence found
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        &ldquo;Improved automated testing, review standards, and WCAG / security hygiene across releases.&rdquo;
                      </p>
                    </div>
                    <div className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5 text-xs text-[var(--color-text-secondary)]">
                      Human decision boundary: TalentOS never moves candidates to Hired or Rejected automatically.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Overview: Editorial sticky-index ledger (deliberately not 6 identical cards) */}
        <section
          id="product"
          aria-labelledby="product-overview-heading"
          className="border-t border-[var(--color-border)] bg-[var(--color-canvas)]"
        >
          <div className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <p className="font-mono text-xs text-[var(--color-text-secondary)]">
                  01 / Product architecture
                </p>
                <h2
                  id="product-overview-heading"
                  className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-3xl"
                >
                  Six connected modules built on one relational source of truth
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Instead of fragmenting job specs, resumes, interview schedules, and funnel metrics
                  across spreadsheets, TalentOS models every hiring event under organization-scoped
                  permissions.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/careers"
                    className="inline-flex min-h-11 items-center rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                  >
                    Browse demo careers board
                  </Link>
                </div>
              </div>

              <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {CAPABILITY_CHAPTERS.map((chapter) => (
                  <article key={chapter.index} className="grid gap-3 py-6 sm:grid-cols-[56px_1fr]">
                    <span className="font-mono text-xs text-[var(--color-accent-text)] pt-1">
                      {chapter.index}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-text)]">
                        {chapter.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {chapter.detail}
                      </p>
                      <p className="mt-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                        {chapter.artifact}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Product Showcase powered by real seeded API records */}
        <InteractiveShowcase />

        {/* Workflow Section: 5 structured stages */}
        <section aria-labelledby="workflow-heading" className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-[var(--color-text-secondary)]">
              03 / Recruitment lifecycle
            </p>
            <h2
              id="workflow-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-3xl"
            >
              From published opening to documented hiring decision
            </h2>
          </div>

          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW_STEPS.map((step) => (
              <li
                key={step.num}
                className="flex flex-col rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <span className="font-mono text-xs font-semibold text-[var(--color-accent-text)]">
                  Step 0{step.num}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-[var(--color-text)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Responsible AI Charter */}
        <section
          aria-labelledby="responsible-ai-heading"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <div className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 font-mono text-xs text-[var(--color-accent-text)]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>04 / Responsible AI boundaries</span>
              </div>
              <h2
                id="responsible-ai-heading"
                className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-3xl"
              >
                Assistance you can inspect, never opaque automation
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
                Resume analysis in TalentOS is engineered to prepare reviewers faster while keeping
                every qualification claim verifiable against the submitted document and every hiring
                call strictly human-owned.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  What TalentOS surfaces for reviewers
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                  {[
                    "Verbatim text excerpts mapped to published required and preferred qualifications.",
                    "Clear separation between facts extracted from the resume and suggested interview questions.",
                    "Explicit disclosure when deterministic rule-based extraction runs instead of an LLM.",
                    "Prompt-injection warning flags when uploaded documents contain embedded directives.",
                    "Human review confirmation and reviewer correction logs stored alongside every analysis.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  What TalentOS never infers or automates
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                  {[
                    "No automatic rejection, shortlisting, or stage transitions to Hired or Rejected.",
                    "No demographic inference (age, gender, ethnicity, religion, marital status, or disability).",
                    "No personality scoring, employability predictions, or universal black-box candidate scores.",
                    "No interpreting missing resume phrases as proven lack of candidate ability.",
                    "No sharing internal recruiter notes, private evaluations, or other applicants with candidates.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-error)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Direct closing action band */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-canvas)]">
          <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)] sm:text-2xl">
                Try all three role experiences with isolated demo data
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Switch between Recruiter, Hiring Manager, and Candidate views without configuring
                external API keys or affecting other visitors.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="inline-flex min-h-11 items-center rounded-[7px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)]"
              >
                Open interactive demo
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
