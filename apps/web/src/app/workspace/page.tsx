"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowUpRight, Calendar, Download } from "lucide-react";
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
      {/* Compact productivity header + contextual filter controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            Overview
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Active hiring progress, upcoming interviews, and roles awaiting review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label htmlFor="overview-range" className="sr-only">Date range</label>
            <Select
              id="overview-range"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="min-h-9 w-36 text-xs"
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
              className="min-h-9 w-52 text-xs"
            >
              <option value="">All job openings</option>
              {jobsQuery.data?.items.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {analyticsQuery.isLoading && <LoadingRegion label="Loading workspace overview..." rows={5} />}

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
          {/* Integrated summary strip (avoids repetitive disconnected cards) */}
          <section
            aria-label="Key recruitment metrics"
            className="surface-solid grid divide-y divide-[var(--color-border)] rounded-[16px] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
          >
            {[
              {
                label: "Active openings",
                value: overview.active_job_openings,
                sub: "Currently published",
              },
              {
                label: `Applications (${overview.date_range_days} days)`,
                value: overview.total_applications,
                sub: `${overview.hired_count} hired in range`,
              },
              {
                label: "Scheduled interviews",
                value: overview.interviews_scheduled,
                sub:
                  overview.interview_completion_rate_pct != null
                    ? `${overview.interview_completion_rate_pct}% completion rate`
                    : "No completed rounds yet",
              },
              {
                label: "Offers extended",
                value: overview.offers_made,
                sub:
                  overview.avg_time_to_hire_days != null
                    ? `Average ${overview.avg_time_to_hire_days} days to hire`
                    : "Time to hire pending",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="p-5">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">{kpi.label}</p>
                <p className="mt-1.5 text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] tabular-nums text-[var(--color-text)]">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{kpi.sub}</p>
              </div>
            ))}
          </section>

          {/* Operational priority layer: Jobs requiring attention + Upcoming interviews */}
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <section
              aria-labelledby="attention-heading"
              className="surface-solid rounded-[16px] p-5"
            >
              <div className="flex items-center justify-between gap-2 pb-3.5">
                <div>
                  <h2 id="attention-heading" className="text-sm font-semibold text-[var(--color-text)]">
                    Jobs requiring attention
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    Roles with unscreened applicants or upcoming closing dates.
                  </p>
                </div>
                <Link
                  href="/workspace/jobs"
                  className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
                >
                  All jobs
                </Link>
              </div>

              {overview.jobs_requiring_attention.length === 0 ? (
                <p className="border-t border-[var(--color-border)] py-6 text-sm text-[var(--color-text-secondary)]">
                  No open roles have unreviewed backlogs or imminent deadlines.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                  {overview.jobs_requiring_attention.map((item) => (
                    <li
                      key={item.job_id}
                      className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/workspace/jobs/${item.job_id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]"
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
                        <span className="text-xs font-medium tabular-nums text-[var(--color-text-secondary)]">
                          {item.total_applications} applicants
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-labelledby="upcoming-interviews-heading"
              className="surface-solid rounded-[16px] p-5"
            >
              <div className="flex items-center justify-between gap-2 pb-3.5">
                <div>
                  <h2 id="upcoming-interviews-heading" className="text-sm font-semibold text-[var(--color-text)]">
                    Upcoming interviews
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    Scheduled sessions with downloadable calendar invites.
                  </p>
                </div>
                <Link
                  href="/workspace/interviews"
                  className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
                >
                  Open calendar
                </Link>
              </div>

              {interviewsQuery.isLoading ? (
                <p className="border-t border-[var(--color-border)] py-6 text-xs text-[var(--color-text-secondary)]">
                  Loading interview schedule...
                </p>
              ) : (interviewsQuery.data || []).length === 0 ? (
                <p className="border-t border-[var(--color-border)] py-6 text-sm text-[var(--color-text-secondary)]">
                  No upcoming interviews scheduled.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                  {(interviewsQuery.data || []).slice(0, 5).map((iv) => (
                    <li key={iv.id} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0">
                        <Link
                          href={`/workspace/candidates/${iv.candidate_id}`}
                          className="block truncate text-sm font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]"
                        >
                          {iv.candidate_name}
                        </Link>
                        <p className="truncate text-xs text-[var(--color-text-secondary)]">
                          {iv.title} · {iv.job_title}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs tabular-nums text-[var(--color-text-secondary)]">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} min
                        </p>
                      </div>
                      <Button
                        variant="ghost"
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

          {/* Solid Content Analytical Charts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <section
              aria-labelledby="funnel-chart-title"
              className="surface-solid rounded-[16px] p-5"
            >
              <h2 id="funnel-chart-title" className="text-sm font-semibold text-[var(--color-text)]">
                Recruitment funnel
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Candidate distribution across stages in the last {overview.date_range_days} days.
              </p>
              <div className="mt-4 h-60 w-full" role="img" aria-label="Bar chart of applications by recruitment stage">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.stage_distribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border-strong)",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "var(--color-text)",
                        boxShadow: "0 8px 24px -10px rgba(15, 23, 21, 0.2)",
                      }}
                    />
                    <Bar dataKey="count" name="Candidates" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section
              aria-labelledby="trend-chart-title"
              className="surface-solid rounded-[16px] p-5"
            >
              <h2 id="trend-chart-title" className="text-sm font-semibold text-[var(--color-text)]">
                Application volume
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Daily submissions received across the last {overview.date_range_days} days.
              </p>
              <div className="mt-4 h-60 w-full" role="img" aria-label="Area chart of daily application submissions">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview.applications_over_time} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => v.slice(5)}
                      minTickGap={24}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border-strong)",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "var(--color-text)",
                        boxShadow: "0 8px 24px -10px rgba(15, 23, 21, 0.2)",
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

          {/* Recent Activity Stream */}
          <section aria-labelledby="recent-activity-heading" className="surface-solid rounded-[16px] p-5">
            <div className="flex items-center justify-between pb-3.5">
              <h2 id="recent-activity-heading" className="text-sm font-semibold text-[var(--color-text)]">
                Recent activity
              </h2>
              <Link
                href="/workspace/analytics"
                className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
              >
                Full analytics
              </Link>
            </div>
            {(activityQuery.data || []).length === 0 ? (
              <p className="border-t border-[var(--color-border)] py-5 text-sm text-[var(--color-text-secondary)]">
                Activity events will appear here as your team publishes roles and reviews candidates.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {(activityQuery.data || []).map((act) => (
                  <li
                    key={act.id}
                    className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-[var(--color-text)]">
                      <span className="font-medium">{act.actor_name || "System"}</span>{" "}
                      <span className="text-[var(--color-text-secondary)]">{act.summary}</span>
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-secondary)]">
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
