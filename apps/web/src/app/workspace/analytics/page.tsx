"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            Analytics
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Hiring funnel velocity and stage conversion derived from persisted stage transitions.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 whitespace-nowrap"
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

      {/* Integrated filter bar */}
      <div className="surface-solid flex flex-wrap items-center gap-3 rounded-[14px] p-3">
        <Select aria-label="Date window" value={days} onChange={(e) => setDays(e.target.value)} className="w-40 text-xs">
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
        </Select>
        <Select aria-label="Department filter" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-44 text-xs">
          <option value="">All departments</option>
          {["Engineering", "Design", "Data", "Security", "Product", "People"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select aria-label="Job filter" value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-60 text-xs">
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
          <div className="surface-solid grid divide-y divide-[var(--color-border)] rounded-[16px] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {[
              { label: "Applications in range", value: String(data.total_applications) },
              {
                label: "Average time to hire",
                value: data.avg_time_to_hire_days != null ? `${data.avg_time_to_hire_days} days` : "Pending",
              },
              {
                label: "Interview completion",
                value: data.interview_completion_rate_pct != null ? `${data.interview_completion_rate_pct}%` : "Pending",
              },
              {
                label: "Offer acceptance",
                value: data.offer_acceptance_rate_pct != null ? `${data.offer_acceptance_rate_pct}%` : "Pending",
              },
            ].map((m) => (
              <div key={m.label} className="p-5">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">{m.label}</p>
                <p className="mt-1.5 text-[1.6rem] font-semibold leading-tight tracking-[-0.025em] tabular-nums text-[var(--color-text)]">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="surface-solid rounded-[16px] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Daily application volume ({data.date_range_days} days)
              </h2>
              <div className="mt-4 h-60 w-full" role="img" aria-label="Line chart of applications over time">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.applications_over_time} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                      }}
                    />
                    <Line type="monotone" dataKey="applications" name="Applications" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="surface-solid rounded-[16px] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Average days per stage
              </h2>
              <div className="mt-4 h-60 w-full" role="img" aria-label="Bar chart of average days per stage">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.avg_days_per_stage.map((p) => ({ ...p, avg_days: p.avg_days ?? 0 }))}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
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
                      }}
                    />
                    <Bar dataKey="avg_days" name="Average days" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="surface-solid rounded-[16px] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Stage conversion breakdown</h2>
              <div className="mt-3 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {data.stage_distribution.map((row) => (
                  <div key={row.stage} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-[var(--color-text)]">{row.label}</span>
                    <div className="flex items-center gap-5 text-xs tabular-nums">
                      <span className="font-medium text-[var(--color-text)]">{row.count}</span>
                      <span className="w-24 text-right text-[var(--color-text-secondary)]">
                        {row.conversion_from_previous_pct != null
                          ? `${row.conversion_from_previous_pct}% conv.`
                          : row.stage === "rejected"
                          ? "Closed"
                          : "Baseline"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-solid rounded-[16px] p-5">
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
                        <td data-label="Open" className="text-xs tabular-nums">{dept.open_jobs}</td>
                        <td data-label="Applications" className="text-xs tabular-nums">{dept.applications}</td>
                        <td data-label="Interviews" className="text-xs tabular-nums">{dept.interviews}</td>
                        <td data-label="Hired" className="text-xs tabular-nums">{dept.hired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="surface-solid rounded-[16px] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Applications by opening</h2>
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
                      <td data-label="Applications" className="text-xs tabular-nums">{row.applications}</td>
                      <td data-label="Interviews" className="text-xs tabular-nums">{row.interviews}</td>
                      <td data-label="Offers" className="text-xs tabular-nums">{row.offers}</td>
                      <td data-label="Hired" className="text-xs tabular-nums">{row.hired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <details className="surface-solid rounded-[16px] p-5">
            <summary className="text-sm font-semibold text-[var(--color-text)]">
              Metric definitions
            </summary>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(data.metric_definitions).map(([k, desc]) => (
                <div key={k} className="rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5">
                  <dt className="text-xs font-semibold text-[var(--color-text)] capitalize">
                    {k.replace(/_/g, " ")}
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{desc}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      )}
    </div>
  );
}
