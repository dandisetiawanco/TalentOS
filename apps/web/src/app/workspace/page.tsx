"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, Calendar, Download, ArrowUpRight } from "lucide-react";
import type {
  ActivityItem,
  AnalyticsOverview,
  InterviewRecord,
  JobRecord,
  PaginatedResponse,
} from "@talentos/contracts";
import { Button, LoadingRegion, Select, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest, downloadAuthenticatedBlob } from "@/lib/api";
import { formatDateTime, formatRelativeTime, formatShortDate } from "@/lib/format";

export default function WorkspaceOverviewPage() {
  const [days, setDays] = React.useState("60");
  const [jobId, setJobId] = React.useState("");

  const params = new URLSearchParams({ days });
  if (jobId) params.set("job_id", jobId);

  const analyticsQuery = useQuery({
    queryKey: ["analytics-overview", days, jobId],
    queryFn: () => apiRequest<AnalyticsOverview>(`/analytics/overview?${params.toString()}`),
  });

  const jobsQuery = useQuery({
    queryKey: ["workspace-jobs-mini"],
    queryFn: () => apiRequest<PaginatedResponse<JobRecord>>("/jobs?page_size=50"),
  });

  const interviewsQuery = useQuery({
    queryKey: ["workspace-upcoming-interviews"],
    queryFn: () => apiRequest<InterviewRecord[]>("/interviews?status=scheduled"),
  });

  const activityQuery = useQuery({
    queryKey: ["workspace-recent-activity"],
    queryFn: () => apiRequest<ActivityItem[]>("/activity?limit=8"),
  });

  const overview = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Recruitment overview
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Roles awaiting review, scheduled interviews, and hiring funnel velocity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label htmlFor="overview-range" className="sr-only">Date range</label>
            <Select
              id="overview-range"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="min-h-10 w-36 text-xs"
            >
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </Select>
          </div>
          <div>
            <label htmlFor="overview-job" className="sr-only">Filter by job</label>
            <Select
              id="overview-job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="min-h-10 w-52 text-xs"
            >
              <option value="">All job openings</option>
              {jobsQuery.data?.items.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {analyticsQuery.isLoading && <LoadingRegion label="Loading recruitment overview metrics..." rows={5} />}

      {analyticsQuery.isError && (
        <StatePanel
          tone="error"
          title="Could not load overview metrics"
          description="Verify the backend API is available and try refreshing."
          action={
            <Button variant="secondary" size="sm" onClick={() => void analyticsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {overview && (
        <>
          {/* Compact factual KPI ledger backed strictly by database queries */}
          <section aria-label="Key recruitment counts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active job openings", value: overview.active_job_openings, sub: "Currently published" },
              { label: `Total applications (${overview.date_range_days}d)`, value: overview.total_applications, sub: `${overview.hired_count} hired in window` },
              { label: "Interviews scheduled", value: overview.interviews_scheduled, sub: overview.interview_completion_rate_pct != null ? `${overview.interview_completion_rate_pct}% completion rate` : "No completed rounds yet" },
              { label: "Offers made", value: overview.offers_made, sub: overview.avg_time_to_hire_days != null ? `Avg ${overview.avg_time_to_hire_days} days to hire` : "Time to hire pending" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">{kpi.label}</p>
                <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{kpi.sub}</p>
              </div>
            ))}
          </section>

          {/* Primary decision layer: Jobs requiring attention + Upcoming interviews */}
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <section
              aria-labelledby="attention-heading"
              className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                <div>
                  <h2 id="attention-heading" className="text-sm font-semibold text-[var(--color-text)]">
                    Jobs requiring attention
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Openings with unscreened applicants or deadlines within 15 days.
                  </p>
                </div>
                <Link href="/workspace/jobs" className="text-xs font-medium text-[var(--color-accent-text)] hover:underline">
                  All jobs
                </Link>
              </div>

              {overview.jobs_requiring_attention.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-text-secondary)]">
                  No open roles have unreviewed backlogs or imminent deadlines.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--color-border)]">
                  {overview.jobs_requiring_attention.map((item) => (
                    <li key={item.job_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/workspace/jobs/${item.job_id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                        >
                          <span className="truncate">{item.title}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </Link>
                        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                          {item.department} · {item.reason}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.closing_soon && (
                          <StatusTag tone="warning">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {formatShortDate(item.application_deadline)}
                          </StatusTag>
                        )}
                        <StatusTag tone="neutral">{item.total_applications} total</StatusTag>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-labelledby="upcoming-interviews-heading"
              className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                <div>
                  <h2 id="upcoming-interviews-heading" className="text-sm font-semibold text-[var(--color-text)]">
                    Upcoming interviews
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Confirmed rounds with direct ICS calendar downloads.
                  </p>
                </div>
                <Link href="/workspace/interviews" className="text-xs font-medium text-[var(--color-accent-text)] hover:underline">
                  Full calendar
                </Link>
              </div>

              {interviewsQuery.isLoading ? (
                <p className="py-6 text-xs text-[var(--color-text-secondary)]">Loading interview schedule...</p>
              ) : (interviewsQuery.data || []).length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-text-secondary)]">
                  No upcoming interviews scheduled. Open Interviews to coordinate a session.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--color-border)]">
                  {(interviewsQuery.data || []).slice(0, 5).map((iv) => (
                    <li key={iv.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/workspace/candidates/${iv.candidate_id}`}
                          className="block truncate text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                        >
                          {iv.candidate_name}
                        </Link>
                        <p className="truncate text-xs text-[var(--color-text-secondary)]">
                          {iv.title} · {iv.job_title}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {formatDateTime(iv.scheduled_start)} ({iv.duration_minutes}m)
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Download ICS invite for ${iv.candidate_name}`}
                        onClick={() =>
                          void downloadAuthenticatedBlob(
                            `/interviews/${iv.id}/ics`,
                            `interview-${iv.candidate_name.toLowerCase().replace(/\s+/g, "-")}.ics`
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        ICS
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Analytical charts titled with the exact operational question they answer */}
          <div className="grid gap-5 lg:grid-cols-2">
            <section
              aria-labelledby="funnel-chart-title"
              className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <h2 id="funnel-chart-title" className="text-sm font-semibold text-[var(--color-text)]">
                Where do active candidates sit across hiring stages?
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Current count per stage for applications inside the selected {overview.date_range_days}-day window.
              </p>
              <div className="mt-4 h-64 w-full" role="img" aria-label="Bar chart of applications by recruitment stage">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.stage_distribution} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border-strong)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "var(--color-text)",
                      }}
                    />
                    <Bar dataKey="count" name="Applications" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section
              aria-labelledby="trend-chart-title"
              className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <h2 id="trend-chart-title" className="text-sm font-semibold text-[var(--color-text)]">
                How many applications arrived each day?
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Daily submission volume recorded across the last {overview.date_range_days} days.
              </p>
              <div className="mt-4 h-64 w-full" role="img" aria-label="Area chart of daily application submissions">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview.applications_over_time} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => v.slice(5)}
                      minTickGap={24}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border-strong)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "var(--color-text)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="applications"
                      name="Submissions"
                      stroke="var(--color-accent)"
                      fill="var(--color-accent-soft)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Recent audit activity */}
          <section
            aria-labelledby="recent-activity-heading"
            className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 id="recent-activity-heading" className="text-sm font-semibold text-[var(--color-text)]">
                Recent recruitment activity
              </h2>
              <Link href="/workspace/analytics" className="text-xs font-medium text-[var(--color-accent-text)] hover:underline">
                View full analytics
              </Link>
            </div>
            {(activityQuery.data || []).length === 0 ? (
              <p className="py-5 text-sm text-[var(--color-text-secondary)]">
                Activity events will appear here as your team publishes roles and reviews candidates.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-border)]">
                {(activityQuery.data || []).map((act) => (
                  <li key={act.id} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[var(--color-text)]">
                      <span className="font-medium">{act.actor_name || "System"}:</span>{" "}
                      <span className="text-[var(--color-text-secondary)]">{act.summary}</span>
                    </p>
                    <span className="shrink-0 font-mono text-xs text-[var(--color-text-secondary)]">
                      {formatRelativeTime(act.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
