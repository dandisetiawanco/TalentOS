"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, FileSearch, Kanban, BarChart3, AlertCircle } from "lucide-react";
import type { PublicShowcaseData } from "@talentos/contracts";
import { STAGE_LABELS } from "@talentos/contracts";
import { Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type ShowcaseTab = "pipeline" | "candidate" | "interviews" | "analytics";

const SHOWCASE_TABS: Array<{ id: ShowcaseTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "pipeline", label: "Recruitment pipeline", icon: Kanban },
  { id: "candidate", label: "Candidate profile", icon: FileSearch },
  { id: "interviews", label: "Interview calendar", icon: Calendar },
  { id: "analytics", label: "Recruitment analytics", icon: BarChart3 },
];

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = React.useState<ShowcaseTab>("pipeline");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-showcase"],
    queryFn: () => apiRequest<PublicShowcaseData>("/public/showcase"),
  });

  return (
    <section aria-labelledby="showcase-heading" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-[var(--color-text-secondary)]">
              02 / Live workspace specimen
            </p>
            <h2
              id="showcase-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-3xl"
            >
              Inspect real seeded workflows before signing in
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              Every view below queries the live synthetic dataset for Alder and Finch Systems (Demo).
              Switch surfaces to see how pipeline state, resume evidence, interviews, and analytics stay connected.
            </p>
          </div>
          <Link href="/demo" className="shrink-0">
            <Button variant="primary">Launch isolated demo</Button>
          </Link>
        </div>

        <div
          role="tablist"
          aria-label="Workspace preview surfaces"
          className="mt-8 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
        >
          {SHOWCASE_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`showcase-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`showcase-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[7px] border px-3.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                    : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {isLoading && <LoadingRegion label="Loading live seeded showcase data..." rows={5} />}

          {isError && (
            <StatePanel
              tone="error"
              title="Preview backend unavailable"
              description="Start the FastAPI backend service on port 8000 to inspect live seeded records here, or retry the request."
              action={
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  Retry preview
                </Button>
              }
            />
          )}

          {data && activeTab === "pipeline" && (
            <div
              role="tabpanel"
              id="showcase-panel-pipeline"
              aria-labelledby="showcase-tab-pipeline"
              className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
            >
              {(["applied", "screening", "shortlisted", "interview"] as const).map((stage) => {
                const cards = data.pipeline_columns[stage] || [];
                const totalInStage =
                  data.analytics.stage_distribution.find((s) => s.stage === stage)?.count ?? cards.length;
                return (
                  <div
                    key={stage}
                    className="flex flex-col rounded-[8px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        {STAGE_LABELS[stage]}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
                        {totalInStage}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-2">
                      {cards.map((card) => (
                        <div
                          key={card.application_id}
                          className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                        >
                          <p className="text-sm font-medium text-[var(--color-text)]">{card.candidate_name}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{card.job_title}</p>
                          <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>{card.location || "Remote"}</span>
                            <span className="font-mono tabular-nums">{card.years_of_experience}y exp</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data && activeTab === "candidate" && data.featured_candidate && (
            <div
              role="tabpanel"
              id="showcase-panel-candidate"
              aria-labelledby="showcase-tab-candidate"
              className="grid gap-5 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-5 lg:grid-cols-[1fr_1.35fr]"
            >
              <div className="space-y-4">
                <div>
                  <StatusTag tone="neutral">
                    {data.featured_candidate.analysis_mode === "rule_based"
                      ? "Rule-based deterministic extraction"
                      : "AI-assisted review"}
                  </StatusTag>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--color-text)]">
                    {data.featured_candidate.full_name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {data.featured_candidate.headline}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
                    Applying for: {data.featured_candidate.job_title}
                  </p>
                </div>
                <div className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-xs font-semibold text-[var(--color-text)]">Extracted professional summary</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {data.featured_candidate.structured_output.professional_summary}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text)]">Verified skills from document</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.featured_candidate.structured_output.extracted_technical_skills.slice(0, 8).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-xs text-[var(--color-text)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">
                    Required qualifications evidence check
                  </h4>
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">Human review required</span>
                </div>
                <ul className="space-y-2.5">
                  {data.featured_candidate.structured_output.required_qualifications_evidence.map((ev) => (
                    <li
                      key={ev.criterion}
                      className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--color-text)]">{ev.criterion}</p>
                        <StatusTag
                          tone={
                            ev.status === "evidence_found"
                              ? "success"
                              : ev.status === "ambiguous"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {ev.status === "evidence_found" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Found
                            </>
                          ) : ev.status === "ambiguous" ? (
                            <>
                              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              Verify
                            </>
                          ) : (
                            "Not found"
                          )}
                        </StatusTag>
                      </div>
                      {ev.evidence_excerpt && (
                        <p className="mt-1.5 border-l-2 border-[var(--color-border-strong)] pl-2.5 text-xs text-[var(--color-text-secondary)]">
                          {ev.evidence_excerpt}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {data && activeTab === "interviews" && (
            <div
              role="tabpanel"
              id="showcase-panel-interviews"
              aria-labelledby="showcase-tab-interviews"
              className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  Scheduled interviews in demo workspace
                </h3>
                <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                  ICS calendar export supported
                </span>
              </div>
              <div className="mt-3 divide-y divide-[var(--color-border)] rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)]">
                {data.interviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {iv.candidate_name} · {iv.title}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{iv.job_title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
                        {formatDateTime(iv.scheduled_start)} ({iv.duration_minutes}m)
                      </span>
                      <StatusTag tone={iv.status === "completed" ? "success" : "accent"}>
                        {iv.status}
                      </StatusTag>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data && activeTab === "analytics" && (
            <div
              role="tabpanel"
              id="showcase-panel-analytics"
              aria-labelledby="showcase-tab-analytics"
              className="space-y-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-5"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Published openings</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
                    {data.analytics.active_job_openings}
                  </p>
                </div>
                <div className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Total applications (60d)</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
                    {data.analytics.total_applications}
                  </p>
                </div>
                <div className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Avg time to hire</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
                    {data.analytics.avg_time_to_hire_days != null
                      ? `${data.analytics.avg_time_to_hire_days}d`
                      : "N/A"}
                  </p>
                </div>
                <div className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Offer acceptance rate</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
                    {data.analytics.offer_acceptance_rate_pct != null
                      ? `${data.analytics.offer_acceptance_rate_pct}%`
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold text-[var(--color-text)]">
                  Candidate distribution across recruitment stages (seeded demo records)
                </p>
                <div className="mt-3 space-y-2.5">
                  {data.analytics.stage_distribution.map((point) => {
                    const maxVal = Math.max(...data.analytics.stage_distribution.map((p) => p.count), 1);
                    const pct = Math.round((point.count / maxVal) * 100);
                    return (
                      <div key={point.stage} className="grid grid-cols-[100px_1fr_44px] items-center gap-3 text-xs">
                        <span className="text-[var(--color-text-secondary)]">{point.label}</span>
                        <div className="h-2.5 overflow-hidden rounded-[3px] bg-[var(--color-surface-muted)]">
                          <div
                            className="h-full rounded-[3px] bg-[var(--color-accent)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-right font-mono tabular-nums text-[var(--color-text)]">
                          {point.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
