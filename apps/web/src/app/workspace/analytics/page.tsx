"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Download } from "lucide-react";
import type { AnalyticsOverview, JobRecord, PaginatedResponse } from "@talentos/contracts";
import { Button, LoadingRegion, Select, StatePanel } from "@talentos/ui";
import { apiRequest, downloadAuthenticatedBlob } from "@/lib/api";

export default function WorkspaceAnalyticsPage() {
  const [days, setDays] = React.useState("60");
  const [department, setDepartment] = React.useState("");
  const [jobId, setJobId] = React.useState("");

  const params = new URLSearchParams({ days });
  if (department) params.set("department", department);
  if (jobId) params.set("job_id", jobId);

  const analyticsQuery = useQuery({
    queryKey: ["workspace-analytics", days, department, jobId],
    queryFn: () => apiRequest<AnalyticsOverview>(`/analytics/overview?${params.toString()}`),
  });

  const jobsQuery = useQuery({
    queryKey: ["workspace-jobs-analytics"],
    queryFn: () => apiRequest<PaginatedResponse<JobRecord>>("/jobs?page_size=50"),
  });

  const data = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Recruitment analytics
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Operational hiring funnel metrics derived from persisted stage transitions. No
            demographic analytics or sensitive candidate profiling are collected.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            void downloadAuthenticatedBlob(
              `/analytics/export.csv?${params.toString()}`,
              "talentos-recruitment-analytics.csv"
            )
          }
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select aria-label="Date window" value={days} onChange={(e) => setDays(e.target.value)} className="w-40">
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
        </Select>
        <Select aria-label="Department filter" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-44">
          <option value="">All departments</option>
          {["Engineering", "Design", "Data", "Security", "Product", "People"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select aria-label="Job filter" value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-64">
          <option value="">All job openings</option>
          {jobsQuery.data?.items.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </Select>
      </div>

      {analyticsQuery.isLoading && <LoadingRegion label="Computing recruitment analytics..." rows={6} />}

      {analyticsQuery.isError && (
        <StatePanel
          tone="error"
          title="Unable to compute analytics"
          description="Verify that the backend service is running and retry."
          action={<Button variant="secondary" size="sm" onClick={() => void analyticsQuery.refetch()}>Retry</Button>}
        />
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Applications in range", value: String(data.total_applications) },
              {
                label: "Average time to hire",
                value: data.avg_time_to_hire_days != null ? `${data.avg_time_to_hire_days} days` : "Insufficient data",
              },
              {
                label: "Interview completion rate",
                value: data.interview_completion_rate_pct != null ? `${data.interview_completion_rate_pct}%` : "Insufficient data",
              },
              {
                label: "Offer acceptance rate",
                value: data.offer_acceptance_rate_pct != null ? `${data.offer_acceptance_rate_pct}%` : "Insufficient data",
              },
            ].map((m) => (
              <div key={m.label} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs text-[var(--color-text-secondary)]">{m.label}</p>
                <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Daily application volume ({data.date_range_days} days)
              </h2>
              <div className="mt-4 h-64 w-full" role="img" aria-label="Line chart of applications over time">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.applications_over_time} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} minTickGap={24} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
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
                    <Line type="monotone" dataKey="applications" name="Applications" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Average days spent per recruitment stage
              </h2>
              <div className="mt-4 h-64 w-full" role="img" aria-label="Bar chart of average days per stage">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.avg_days_per_stage.map((p) => ({ ...p, avg_days: p.avg_days ?? 0 }))}
                    margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border-strong)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "var(--color-text)",
                      }}
                    />
                    <Bar dataKey="avg_days" name="Average days" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Stage conversion breakdown</h2>
              <div className="mt-3 divide-y divide-[var(--color-border)]">
                {data.stage_distribution.map((row) => (
                  <div key={row.stage} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-[var(--color-text)]">{row.label}</span>
                    <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                      <span className="text-[var(--color-text)]">{row.count}</span>
                      <span className="w-24 text-right text-[var(--color-text-secondary)]">
                        {row.conversion_from_previous_pct != null ? `${row.conversion_from_previous_pct}% conv.` : "Baseline"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Hiring activity by department</h2>
              <div tabIndex={0} role="region" aria-label="Department hiring activity" className="mt-3 talentos-table-wrapper">
                <table className="talentos-table">
                  <thead>
                    <tr>
                      <th scope="col">Department</th>
                      <th scope="col">Open</th>
                      <th scope="col">Applications</th>
                      <th scope="col">Interviews</th>
                      <th scope="col">Hired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hiring_by_department.map((dept) => (
                      <tr key={dept.department}>
                        <td data-primary="true" data-label="Department" className="font-medium text-[var(--color-text)]">
                          {dept.department}
                        </td>
                        <td data-label="Open" className="font-mono text-xs">{dept.open_jobs}</td>
                        <td data-label="Applications" className="font-mono text-xs">{dept.applications}</td>
                        <td data-label="Interviews" className="font-mono text-xs">{dept.interviews}</td>
                        <td data-label="Hired" className="font-mono text-xs">{dept.hired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Applications by job opening</h2>
            <div tabIndex={0} role="region" aria-label="Applications by job" className="mt-3 talentos-table-wrapper">
              <table className="talentos-table">
                <thead>
                  <tr>
                    <th scope="col">Job opening</th>
                    <th scope="col">Department</th>
                    <th scope="col">Applications</th>
                    <th scope="col">Interviews</th>
                    <th scope="col">Offers</th>
                    <th scope="col">Hired</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications_by_job.map((row) => (
                    <tr key={row.job_id}>
                      <td data-primary="true" data-label="Job opening" className="font-medium text-[var(--color-text)]">
                        {row.title}
                      </td>
                      <td data-label="Department" className="text-xs text-[var(--color-text-secondary)]">{row.department}</td>
                      <td data-label="Applications" className="font-mono text-xs">{row.applications}</td>
                      <td data-label="Interviews" className="font-mono text-xs">{row.interviews}</td>
                      <td data-label="Offers" className="font-mono text-xs">{row.offers}</td>
                      <td data-label="Hired" className="font-mono text-xs">{row.hired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <details className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <summary className="text-sm font-semibold text-[var(--color-text)]">
              Documented metric definitions
            </summary>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(data.metric_definitions).map(([k, desc]) => (
                <div key={k} className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3">
                  <dt className="font-mono text-xs font-medium text-[var(--color-text)]">{k}</dt>
                  <dd className="mt-1 text-xs text-[var(--color-text-secondary)]">{desc}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      )}
    </div>
  );
}
