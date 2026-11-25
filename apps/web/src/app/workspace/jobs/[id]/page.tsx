"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  APPLICATION_STAGES,
  EMPLOYMENT_TYPE_LABELS,
  STAGE_LABELS,
  WORK_ARRANGEMENT_LABELS,
  type ApplicationSummary,
  type JobRecord,
} from "@talentos/contracts";
import { Button, Input, LoadingRegion, Select, StatePanel, StatusTag, Textarea } from "@talentos/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSalaryRange, formatShortDate, jobStatusTone, stageTone } from "@/lib/format";

export default function WorkspaceJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const queryClient = useQueryClient();
  const { user, announce } = useAuth();

  const [tab, setTab] = React.useState<"overview" | "applicants" | "pipeline" | "edit">("overview");
  const [editTitle, setEditTitle] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<JobRecord["status"]>("draft");
  const [editMessage, setEditMessage] = React.useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: ["workspace-job", jobId],
    queryFn: () => apiRequest<JobRecord>(`/jobs/${jobId}`),
    enabled: Boolean(jobId),
  });

  const appsQuery = useQuery({
    queryKey: ["workspace-job-apps", jobId],
    queryFn: () => apiRequest<ApplicationSummary[]>(`/applications?job_id=${jobId}`),
    enabled: Boolean(jobId),
  });

  React.useEffect(() => {
    if (jobQuery.data) {
      setEditTitle(jobQuery.data.title);
      setEditLocation(jobQuery.data.location);
      setEditDesc(jobQuery.data.description);
      setEditStatus(jobQuery.data.status);
    }
  }, [jobQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest<JobRecord>(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          location: editLocation,
          description: editDesc,
          status: editStatus,
        }),
      }),
    onSuccess: (updated) => {
      setEditMessage("Job changes saved.");
      announce(`Updated ${updated.title}.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-job", jobId] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-jobs"] });
    },
    onError: (err) => {
      setEditMessage(err instanceof ApiError ? err.message : "Failed to save changes.");
    },
  });

  const canEdit = user?.role === "organization_owner" || user?.role === "recruiter";

  if (jobQuery.isLoading) {
    return <LoadingRegion label="Loading job details..." rows={5} />;
  }
  if (jobQuery.isError || !jobQuery.data) {
    return (
      <StatePanel
        tone="error"
        title="Job opening not found"
        description="This opening does not exist in your organization."
        action={<Link href="/workspace/jobs"><Button variant="secondary" size="sm">Back to jobs</Button></Link>}
      />
    );
  }

  const job = jobQuery.data;
  const applicants = appsQuery.data || [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/workspace/jobs"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to job openings
        </Link>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag tone={jobStatusTone(job.status)}>{job.status}</StatusTag>
              <StatusTag tone="neutral">{job.department}</StatusTag>
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                {job.application_count} applications
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {job.location} · {WORK_ARRANGEMENT_LABELS[job.work_arrangement]} · {EMPLOYMENT_TYPE_LABELS[job.employment_type]}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {job.status === "published" && (
              <Link href={`/careers/${job.slug}`}>
                <Button variant="secondary" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Public careers page
                </Button>
              </Link>
            )}
            <Link href={`/workspace/pipeline?job=${job.id}`}>
              <Button variant="primary" size="sm">Open in pipeline</Button>
            </Link>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Job detail sections" className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        {(
          [
            { id: "overview", label: "Specification" },
            { id: "applicants", label: `Applicants (${applicants.length})` },
            { id: "pipeline", label: "Stage breakdown" },
            ...(canEdit ? [{ id: "edit", label: "Edit role" }] : []),
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id as typeof tab)}
            className={`min-h-10 rounded-[7px] border px-3.5 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Role summary</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.description}</p>
            </section>
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Required qualifications</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                {job.required_qualifications.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
            {job.preferred_qualifications.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--color-text)]">Preferred qualifications</h2>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                  {job.preferred_qualifications.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Hiring metadata</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--color-text-secondary)]">Compensation</dt>
                <dd className="mt-0.5 font-mono text-xs text-[var(--color-text)]">
                  {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-secondary)]">Hiring manager</dt>
                <dd className="mt-0.5 text-[var(--color-text)]">{job.hiring_manager_name || "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-secondary)]">Open positions</dt>
                <dd className="mt-0.5 font-mono text-xs text-[var(--color-text)]">{job.openings_count}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-secondary)]">Application deadline</dt>
                <dd className="mt-0.5 font-mono text-xs text-[var(--color-text)]">
                  {formatShortDate(job.application_deadline)}
                </dd>
              </div>
            </dl>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Required skills</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.required_skills.map((s) => (
                  <span key={s} className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-0.5 font-mono text-xs">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "applicants" && (
        applicants.length === 0 ? (
          <StatePanel
            title="No applicants yet"
            description="Once this role is published, candidates applying through the careers page appear here."
          />
        ) : (
          <div tabIndex={0} role="region" aria-label="Job applicants" className="talentos-table-wrapper">
            <table className="talentos-table">
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Experience</th>
                  <th scope="col">Evidence check</th>
                  <th scope="col">Applied</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-[var(--color-canvas)]">
                    <td data-primary="true" data-label="Candidate">
                      <Link
                        href={`/workspace/candidates/${app.candidate_id}`}
                        className="font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                      >
                        {app.candidate_name}
                      </Link>
                      <p className="text-xs text-[var(--color-text-secondary)]">{app.candidate_email}</p>
                    </td>
                    <td data-label="Stage">
                      <StatusTag tone={stageTone(app.stage)}>{STAGE_LABELS[app.stage]}</StatusTag>
                    </td>
                    <td data-label="Experience" className="font-mono text-xs">
                      {app.candidate_years_experience} years
                    </td>
                    <td data-label="Evidence check" className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {app.evidence_found_count != null && app.required_total_count != null
                        ? `${app.evidence_found_count}/${app.required_total_count} found`
                        : "Not run yet"}
                    </td>
                    <td data-label="Applied" className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {formatShortDate(app.applied_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "pipeline" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {APPLICATION_STAGES.map((st) => {
            const list = applicants.filter((a) => a.stage === st);
            return (
              <div key={st} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <span className="text-xs font-semibold text-[var(--color-text)]">{STAGE_LABELS[st]}</span>
                  <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">{list.length}</span>
                </div>
                <ul className="mt-2.5 space-y-2">
                  {list.length === 0 ? (
                    <li className="text-xs text-[var(--color-text-secondary)]">None</li>
                  ) : (
                    list.map((a) => (
                      <li key={a.id} className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
                        <Link
                          href={`/workspace/candidates/${a.candidate_id}`}
                          className="text-xs font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                        >
                          {a.candidate_name}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {tab === "edit" && canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="max-w-2xl space-y-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          {editMessage && (
            <div className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-3 py-2 text-xs text-[var(--color-accent-text)]">
              {editMessage}
            </div>
          )}
          <div>
            <label htmlFor="edit-job-title" className="block text-sm font-medium text-[var(--color-text)]">Title</label>
            <Input id="edit-job-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-job-loc" className="block text-sm font-medium text-[var(--color-text)]">Location</label>
              <Input id="edit-job-loc" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor="edit-job-status" className="block text-sm font-medium text-[var(--color-text)]">Publication status</label>
              <Select
                id="edit-job-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as JobRecord["status"])}
                className="mt-1.5"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          </div>
          <div>
            <label htmlFor="edit-job-desc" className="block text-sm font-medium text-[var(--color-text)]">Description</label>
            <Textarea id="edit-job-desc" rows={5} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1.5" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
