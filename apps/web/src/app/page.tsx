import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { InteractiveShowcase } from "@/components/public/interactive-showcase";
import { ScrollReveal } from "@/components/public/scroll-reveal";

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-[1160px] px-4 pt-12 pb-10 sm:px-6 md:pt-20 md:pb-14 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-[clamp(2.5rem,5.6vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--color-text)]">
              A better way to hire.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-[1.125rem]">
              Bring your hiring team, candidates, and recruitment workflows together in one thoughtful workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="#product"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] shadow-[0_1px_2px_rgba(15,23,21,0.12)] transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Explore TalentOS
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/demo"
                className="surface-glass-nav inline-flex h-11 items-center justify-center rounded-[11px] px-5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
              >
                Try the demo
              </Link>
            </div>
          </div>
        </section>

        {/* Main interactive workspace visual */}
        <section aria-label="Interactive TalentOS workspace preview" className="px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
          <InteractiveShowcase />
        </section>

        {/* Showcase 1: Candidate dossier & Resume insights (Asymmetric editorial spread) */}
        <section id="product" aria-labelledby="dossier-heading" className="mx-auto max-w-[1160px] px-4 py-14 sm:px-6 md:py-22 lg:px-8">
          <ScrollReveal>
            <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.15fr] lg:gap-16">
              <div>
                <h2
                  id="dossier-heading"
                  className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-[2rem] sm:leading-[1.15]"
                >
                  Candidate profiles built for careful review.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
                  Every resume, application timeline, interview scorecard, and private team note lives in one
                  structured dossier. Resume insights extract verbatim evidence against published job criteria so
                  reviewers can verify qualifications directly rather than trusting opaque scores.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-5">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">Evidence first</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      Quotes directly from submitted PDF and DOCX resumes.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">Private by default</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      Internal recruiter notes stay isolated from candidate accounts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface-solid rounded-[18px] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">Nadia Kusuma</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Staff Frontend Engineer · 7 years experience · Jakarta
                    </p>
                  </div>
                  <span className="rounded-[8px] bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent-text)]">
                    Interview stage
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        Production Next.js and TypeScript systems
                      </span>
                      <span className="text-xs font-medium text-[var(--color-accent-text)]">Evidence found</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      &ldquo;Led core frontend architecture across Next.js App Router, React, and strict TypeScript modules for enterprise teams.&rdquo;
                    </p>
                  </div>

                  <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        Accessibility and automated UI verification
                      </span>
                      <span className="text-xs font-medium text-[var(--color-accent-text)]">Evidence found</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      &ldquo;Established WCAG AA contrast checks, keyboard navigation audits, and Playwright regression suites.&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-[11px] bg-[var(--color-canvas)] px-3.5 py-2.5 text-xs text-[var(--color-text-secondary)]">
                    <span>Suggested interview follow-up generated separately from extracted facts.</span>
                    <span className="shrink-0 font-medium text-[var(--color-text)]">Human review</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Showcase 2: Pipeline + Interview coordination (Two distinct architectural panels) */}
        <section aria-labelledby="operations-heading" className="mx-auto max-w-[1160px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h2
                id="operations-heading"
                className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-[2rem] sm:leading-[1.15]"
              >
                Fluid from first application to signed offer.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
                Coordinate stages, hiring panels, and candidate communication inside one connected system where every
                decision leaves a clear history.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-12">
              <div className="surface-solid rounded-[18px] p-6 lg:col-span-7">
                <h3 className="text-base font-semibold text-[var(--color-text)]">Hiring pipeline</h3>
                <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
                  Move candidates smoothly across seven stages with drag-and-drop or keyboard controls. Final Hired and
                  Rejected decisions always prompt for an explicit human rationale.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { stage: "Applied", count: 14, tone: "bg-[var(--color-text-secondary)]" },
                    { stage: "Screening", count: 9, tone: "bg-[var(--color-info)]" },
                    { stage: "Interview", count: 6, tone: "bg-[var(--color-accent)]" },
                    { stage: "Offer", count: 3, tone: "bg-[var(--color-warning)]" },
                  ].map((item) => (
                    <div
                      key={item.stage}
                      className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${item.tone}`} aria-hidden="true" />
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{item.stage}</span>
                      </div>
                      <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--color-text)]">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-solid rounded-[18px] p-6 lg:col-span-5">
                <h3 className="text-base font-semibold text-[var(--color-text)]">Interview coordination</h3>
                <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
                  Prevent double-booked interviewers, export standard calendar invitations, and collect structured
                  panel feedback in one view.
                </p>
                <div className="mt-5 space-y-2.5">
                  {[
                    { title: "Architecture walkthrough", who: "Nadia Kusuma", meta: "45 min · Video · No conflicts" },
                    { title: "Hiring manager conversation", who: "Raka Pratama", meta: "30 min · ICS ready" },
                  ].map((event) => (
                    <div
                      key={event.title}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--color-text)]">{event.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-secondary)]">{event.who}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-[var(--color-accent-text)]">{event.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Showcase 3: Analytics & Candidate portal */}
        <section aria-labelledby="clarity-heading" className="mx-auto max-w-[1160px] px-4 py-10 sm:px-6 md:py-16 lg:px-8">
          <ScrollReveal>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="surface-solid rounded-[18px] p-6 sm:p-7">
                <h2 id="clarity-heading" className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                  Recruitment analytics grounded in real transitions
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Every funnel conversion rate, time-to-hire average, and department metric is computed directly from
                  persisted stage changes with one-click CSV export and clear metric definitions.
                </p>
                <div className="mt-5 flex items-center gap-6 border-t border-[var(--color-border)] pt-4 text-xs">
                  <div>
                    <span className="text-[var(--color-text-secondary)]">Role permissions</span>
                    <p className="mt-0.5 font-medium text-[var(--color-text)]">Organization scoped</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)]">Export format</span>
                    <p className="mt-0.5 font-medium text-[var(--color-text)]">CSV reporting</p>
                  </div>
                </div>
              </div>

              <div className="surface-solid rounded-[18px] p-6 sm:p-7">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                  A calm, dedicated portal for candidates
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Applicants browse open positions, apply with explicit document consent, manage resumes, track stage
                  milestones, and inspect interview details from their own private workspace.
                </p>
                <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                  <Link
                    href="/careers"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent-text)] hover:underline"
                  >
                    Browse open positions
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Human-led AI principles */}
        <section aria-labelledby="principles-heading" className="mx-auto max-w-[1160px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h2
                id="principles-heading"
                className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-[1.875rem]"
              >
                Assistance you can inspect, decisions people own.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
                TalentOS is designed around transparent, human-led recruitment. Document analysis supports preparation
                without replacing reviewer judgment.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="surface-solid rounded-[16px] p-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">What TalentOS helps you see</h3>
                <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                  {[
                    "Verbatim resume excerpts mapped directly to published role criteria.",
                    "Clear separation between extracted facts and suggested interview questions.",
                    "Transparent indication whenever built-in rule analysis runs locally.",
                    "Prompt-injection warning flags for untrusted uploaded documents.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="surface-solid rounded-[16px] p-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">What TalentOS never automates</h3>
                <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                  {[
                    "No automatic rejection, shortlisting, or unsupervised stage changes.",
                    "No demographic inference or black-box personality scoring.",
                    "No treating unmentioned resume terms as proven lack of skill.",
                    "No exposing internal team notes or private evaluations to applicants.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-error)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Closing Liquid Glass Invitation */}
        <section className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 md:py-12 lg:px-8">
          <ScrollReveal>
            <div className="surface-glass-nav flex flex-col items-start justify-between gap-6 rounded-[22px] p-7 sm:p-9 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-2xl">
                  Experience TalentOS across every hiring role.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Explore an isolated workspace seeded with realistic openings, candidates, interviews, and analytics.
                  No external API keys required.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/demo"
                  className="inline-flex h-11 items-center rounded-[11px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] shadow-[0_1px_2px_rgba(15,23,21,0.12)] transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  Try the demo
                </Link>
                <Link
                  href="/features"
                  className="inline-flex h-11 items-center rounded-[11px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-subtle)]"
                >
                  Explore features
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
