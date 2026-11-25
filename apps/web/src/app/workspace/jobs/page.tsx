"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Search } from "lucide-react";
import type { JobRecord, PaginatedResponse } from "@talentos/contracts";
import { EMPLOYMENT_TYPE_LABELS, WORK_ARRANGEMENT_LABELS } from "@talentos/contracts";
import { Button, Input, LoadingRegion, Select, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatShortDate, jobStatusTone } from "@/lib/format";

export default function WorkspaceJobsPage() {
  const { user, announce } = useAuth();
  const queryClient = useQueryClient();

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [sort, setSort] = React.useState("created_at_desc");
  const [page, setPage] = React.useState(1);

  const params = new URLSearchParams({ page: String(page), page_size: "12", sort });
  if (q.trim()) params.set("q", q.trim());
  if (status) params.set("status", status);
  if (department) params.set("department", department);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspace-jobs", q, status, department, sort, page],
    queryFn: () => apiRequest<PaginatedResponse<JobRecord>>(`/jobs?${params.toString()}`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: JobRecord["status"] }) =>
      apiRequest<JobRecord>(`/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      }),
    onSuccess: (updated) => {
      announce(`Updated ${updated.title} status to ${updated.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
    },
  });

  const canManage = user?.role === "organization_owner" || user?.role === "recruiter";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Job openings
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Manage requisitions, update publication status, and review applicant volume. Published
            roles sync automatically to the public careers site.
          </p>
        </div>
        {canManage && (
          <Link href="/workspace/jobs/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create job opening
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="jobs-search" className="sr-only">Search jobs</label>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <Input
            id="jobs-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, department, or location"
            className="pl-9"
          />
        </div>

        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </Select>

        <Select
          aria-label="Filter by department"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All departments</option>
          {["Engineering", "Design", "Data", "Security", "Product", "People"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>

        <Select aria-label="Sort jobs" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="created_at_desc">Newest first</option>
          <option value="title_asc">Title A to Z</option>
          <option value="deadline_asc">Closing soonest</option>
        </Select>
      </div>

      {isLoading && <LoadingRegion label="Loading organization job openings..." rows={5} />}

      {isError && (
        <StatePanel
          tone="error"
          title="Unable to load jobs"
          description="Check that the backend API is running and retry."
          action={<Button variant="secondary" size="sm" onClick={() => void refetch()}>Retry</Button>}
        />
      )}

      {data && data.items.length === 0 && (
        <StatePanel
          title="No job openings match these filters"
          description={
            q || status || department
              ? "Try clearing one of your active filters."
              : "Create your first job opening to start receiving applications."
          }
          action={
            q || status || department ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setDepartment("");
                }}
              >
                Reset filters
              </Button>
            ) : canManage ? (
              <Link href="/workspace/jobs/new">
                <Button variant="primary" size="sm">Create job opening</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div tabIndex={0} role="region" aria-labelledby="jobs-table-caption" className="talentos-table-wrapper">
            <table className="talentos-table">
              <caption id="jobs-table-caption" className="sr-only">
                Organization job openings table
              </caption>
              <thead>
                <tr>
                  <th scope="col">Job title</th>
                  <th scope="col">Department</th>
                  <th scope="col">Arrangement</th>
                  <th scope="col">Status</th>
                  <th scope="col">Applications</th>
                  <th scope="col">Closing date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((job) => (
                  <tr key={job.id} className="hover:bg-[var(--color-canvas)]">
                    <td data-primary="true" data-label="Job title">
                      <Link
                        href={`/workspace/jobs/${job.id}`}
                        className="font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                      >
                        {job.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                        {job.location} · {EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}
                      </p>
                    </td>
                    <td data-label="Department" className="text-[var(--color-text-secondary)]">
                      {job.department}
                    </td>
                    <td data-label="Arrangement" className="text-[var(--color-text-secondary)]">
                      {WORK_ARRANGEMENT_LABELS[job.work_arrangement] || job.work_arrangement}
                    </td>
                    <td data-label="Status">
                      {canManage ? (
                        <select
                          aria-label={`Change status for ${job.title}`}
                          value={job.status}
                          disabled={statusMutation.isPending}
                          onChange={(e) =>
                            statusMutation.mutate({
                              id: job.id,
                              nextStatus: e.target.value as JobRecord["status"],
                            })
                          }
                          className="min-h-9 rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-xs font-medium text-[var(--color-text)]"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="paused">Paused</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : (
                        <StatusTag tone={jobStatusTone(job.status)}>{job.status}</StatusTag>
                      )}
                    </td>
                    <td data-label="Applications" className="font-mono text-xs tabular-nums text-[var(--color-text)]">
                      {job.application_count}
                    </td>
                    <td data-label="Closing date" className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
                      {formatShortDate(job.application_deadline)}
                    </td>
                    <td data-label="Actions">
                      <div className="flex items-center justify-end gap-2 sm:justify-start">
                        <Link
                          href={`/workspace/jobs/${job.id}`}
                          className="inline-flex min-h-9 items-center rounded-[6px] border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                        >
                          Manage
                        </Link>
                        {job.status === "published" && (
                          <Link
                            href={`/careers/${job.slug}`}
                            aria-label={`Open public careers listing for ${job.title}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-mono">
              Page {data.page} of {data.total_pages} ({data.total} jobs)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
