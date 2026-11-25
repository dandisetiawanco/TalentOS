"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileSearch,
  Kanban,
  Search,
} from "lucide-react";
import type { PublicShowcaseData } from "@talentos/contracts";
import { STAGE_LABELS } from "@talentos/contracts";
import { BrandMark, Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type ShowcaseTab = "pipeline" | "candidate" | "interviews" | "analytics";

const SHOWCASE_TABS: Array<{
  id: ShowcaseTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "pipeline", label: "Hiring pipeline", shortLabel: "Pipeline", icon: Kanban },
  { id: "candidate", label: "Candidate profile", shortLabel: "Candidate", icon: FileSearch },
  { id: "interviews", label: "Interview calendar", shortLabel: "Interviews", icon: Calendar },
  { id: "analytics", label: "Recruitment analytics", shortLabel: "Analytics", icon: BarChart3 },
];

const STAGE_DOT_COLORS: Record<string, string> = {
  applied: "bg-[var(--color-text-secondary)]",
  screening: "bg-[var(--color-info)]",
  shortlisted: "bg-[var(--color-accent)]",
  interview: "bg-[var(--color-accent)]",
};

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = React.useState<ShowcaseTab>("pipeline");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-showcase"],
    queryFn: () => apiRequest<PublicShowcaseData>("/public/showcase"),
  });

  const activeMeta = SHOWCASE_TABS.find((t) => t.id === activeTab) || SHOWCASE_TABS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-[1160px]"
    >
      {/* Windowed OS-inspired Interactive TalentOS Workspace Frame */}
      <div className="surface-solid overflow-hidden rounded-[22px] shadow-[0_24px_64px_-28px_rgba(15,23,21,0.22)]">
        {/* Top Liquid Glass Workspace Chrome */}
        <div className="surface-glass-nav flex flex-wrap items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 shadow-none sm:px-5">
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-border-strong)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-border-strong)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-border-strong)]" />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text)]">
              <BrandMark size={16} />
              <span>Alder &amp; Finch Systems</span>
              <span className="text-[var(--color-text-secondary)]">·</span>
              <span className="text-[var(--color-text-secondary)]">{activeMeta?.label ?? "Hiring pipeline"}</span>
            </div>
          </div>

          {/* Single-row OS Segmented Control Tabs */}
          <div
            role="tablist"
            aria-label="Workspace preview views"
            className="surface-segment-track grid w-full grid-cols-4 gap-0.5 rounded-[11px] p-1 sm:flex sm:w-auto sm:items-center"
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
                  className={`relative inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-1.5 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs ${
                    selected
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="hero-showcase-tab"
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[8px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,21,0.08)] ring-1 ring-[var(--color-border)]"
                    />
                  )}
                  <Icon
                    className={`relative z-10 hidden h-3.5 w-3.5 sm:inline ${
                      selected ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                  <span className="relative z-10 sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2.5 text-[11px] text-[var(--color-text-secondary)]">
              <Search className="h-3 w-3" aria-hidden="true" />
              <span>Spotlight</span>
              <kbd className="font-mono text-[10px]">⌘K</kbd>
            </span>
          </div>
        </div>

        {/* Workspace Canvas Body */}
        <div className="bg-[var(--color-canvas)] p-4 sm:p-6">
          {isLoading && <LoadingRegion label="Loading live workspace preview..." rows={5} />}

          {isError && (
            <StatePanel
              tone="error"
              title="Live preview temporarily unavailable"
              description="Ensure the TalentOS API server is running to inspect seeded records in real time."
              action={
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  Retry preview
                </Button>
              }
            />
          )}

          {data && activeTab === "pipeline" && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
                    className="flex flex-col rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3"
                  >
                    <div className="flex items-center justify-between px-1 pb-2.5">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text)]">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${STAGE_DOT_COLORS[stage] || "bg-[var(--color-text-secondary)]"}`}
                        />
                        {STAGE_LABELS[stage]}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-[var(--color-text-secondary)]">
                        {totalInStage}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {cards.map((card) => (
                        <div
                          key={card.application_id}
                          className="surface-solid rounded-[11px] p-3 transition-transform duration-150 hover:-translate-y-0.5"
                        >
                          <p className="text-sm font-medium text-[var(--color-text)]">{card.candidate_name}</p>
                          <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                            {card.job_title}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                            <span className="truncate">{card.location || "Remote"}</span>
                            <span className="shrink-0 tabular-nums">{card.years_of_experience} yrs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {data && activeTab === "candidate" && data.featured_candidate && (
            <motion.div
              key="candidate"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              role="tabpanel"
              id="showcase-panel-candidate"
              aria-labelledby="showcase-tab-candidate"
              className="grid gap-5 lg:grid-cols-[0.95fr_1.35fr]"
            >
              <div className="surface-solid rounded-[14px] p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.015em] text-[var(--color-text)]">
                      {data.featured_candidate.full_name}
                    </h3>
                    <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                      {data.featured_candidate.headline}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Applied for {data.featured_candidate.job_title}
                    </p>
                  </div>
                  <StatusTag tone="accent">
                    {data.featured_candidate.analysis_mode === "rule_based" ? "Rule-based review" : "AI-assisted"}
                  </StatusTag>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Extracted summary
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text)]">
                    {data.featured_candidate.structured_output.professional_summary}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Documented skills
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.featured_candidate.structured_output.extracted_technical_skills.slice(0, 8).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="surface-solid rounded-[14px] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">
                    Required qualifications evidence check
                  </h4>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Human decision required
                  </span>
                </div>
                <ul className="divide-y divide-[var(--color-border)]">
                  {data.featured_candidate.structured_output.required_qualifications_evidence.map((ev) => (
                    <li key={ev.criterion} className="py-3 first:pt-1 last:pb-0">
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
                        <p className="mt-1.5 border-l-2 border-[var(--color-border-strong)] pl-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {ev.evidence_excerpt}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {data && activeTab === "interviews" && (
            <motion.div
              key="interviews"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              role="tabpanel"
              id="showcase-panel-interviews"
              aria-labelledby="showcase-tab-interviews"
              className="surface-solid rounded-[14px] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Upcoming interview schedule</h3>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Conflict checks and ICS calendar export included
                </span>
              </div>
              <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {data.interviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {iv.candidate_name} · {iv.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{iv.job_title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                        {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} min
                      </span>
                      <StatusTag tone={iv.status === "completed" ? "success" : "accent"}>
                        {iv.status}
                      </StatusTag>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {data && activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              role="tabpanel"
              id="showcase-panel-analytics"
              aria-labelledby="showcase-tab-analytics"
              className="space-y-4"
            >
              <div className="surface-solid grid divide-y divide-[var(--color-border)] rounded-[14px] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                <div className="p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Published openings</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[var(--color-text)]">
                    {data.analytics.active_job_openings}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Applications in 60 days</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[var(--color-text)]">
                    {data.analytics.total_applications}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Average time to hire</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[var(--color-text)]">
                    {data.analytics.avg_time_to_hire_days != null
                      ? `${data.analytics.avg_time_to_hire_days} days`
                      : "N/A"}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">Offer acceptance</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[var(--color-text)]">
                    {data.analytics.offer_acceptance_rate_pct != null
                      ? `${data.analytics.offer_acceptance_rate_pct}%`
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="surface-solid rounded-[14px] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Stage distribution across active hiring
                  </p>
                  <Link href="/demo" className="text-xs font-medium text-[var(--color-accent-text)] hover:underline">
                    Open full analytics
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {data.analytics.stage_distribution.map((point) => {
                    const maxVal = Math.max(...data.analytics.stage_distribution.map((p) => p.count), 1);
                    const pct = Math.round((point.count / maxVal) * 100);
                    return (
                      <div key={point.stage} className="grid grid-cols-[96px_1fr_40px] items-center gap-3 text-xs">
                        <span className="text-[var(--color-text-secondary)]">{point.label}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-right font-medium tabular-nums text-[var(--color-text)]">
                          {point.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
