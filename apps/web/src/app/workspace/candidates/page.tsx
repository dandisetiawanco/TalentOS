"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  type CandidateDirectoryItem,
  type JobRecord,
  type PaginatedResponse,
} from "@talentos/contracts";
import { Button, Input, LoadingRegion, Select, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest } from "@/lib/api";
import { formatRelativeTime, initialsFor, stageTone } from "@/lib/format";

export default function WorkspaceCandidatesPage() {
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState("");
  const [jobId, setJobId] = React.useState("");
  const [skill, setSkill] = React.useState("");
  const [sort, setSort] = React.useState("recent_activity");
  const [page, setPage] = React.useState(1);

  const params = new URLSearchParams({ page: String(page), page_size: "15", sort });
  if (q.trim()) params.set("q", q.trim());
  if (stage) params.set("stage", stage);
  if (jobId) params.set("job_id", jobId);
  if (skill.trim()) params.set("skill", skill.trim());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspace-candidates", q, stage, jobId, skill, sort, page],
    queryFn: () => apiRequest<PaginatedResponse<CandidateDirectoryItem>>(`/candidates?${params.toString()}`),
  });

  const jobsQuery = useQuery({
    queryKey: ["workspace-jobs-filter"],
    queryFn: () => apiRequest<PaginatedResponse<JobRecord>>("/jobs?page_size=50"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
          Candidate directory
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Search applicants across active roles, filter by skill or pipeline stage, and inspect
          evidence-based resume reviews.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="cand-search" className="sr-only">Search candidates</label>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <Input
            id="cand-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, location"
            className="pl-9"
          />
        </div>

        <Input
          aria-label="Filter by skill"
          value={skill}
          onChange={(e) => {
            setSkill(e.target.value);
            setPage(1);
          }}
          placeholder="Skill (e.g. Python)"
        />

        <Select
          aria-label="Filter by stage"
          value={stage}
          onChange={(e) => {
            setStage(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All stages</option>
          {APPLICATION_STAGES.map((st) => (
            <option key={st} value={st}>{STAGE_LABELS[st]}</option>
          ))}
        </Select>

        <Select
          aria-label="Filter by applied job"
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {jobsQuery.data?.items.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </Select>

        <Select aria-label="Sort candidates" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent_activity">Recent activity</option>
          <option value="name_asc">Name A to Z</option>
          <option value="experience_desc">Experience (high to low)</option>
        </Select>
      </div>

      {isLoading && <LoadingRegion label="Loading candidate directory..." rows={6} />}

      {isError && (
        <StatePanel
          tone="error"
          title="Unable to load candidate directory"
          description="Confirm the API service is running and try again."
          action={<Button variant="secondary" size="sm" onClick={() => void refetch()}>Retry</Button>}
        />
      )}

      {data && data.items.length === 0 && (
        <StatePanel
          title="No candidates match your filters"
          description="Broaden your search query or clear stage and skill filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQ("");
                setStage("");
                setJobId("");
                setSkill("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div tabIndex={0} role="region" aria-labelledby="cand-table-caption" className="talentos-table-wrapper">
            <table className="talentos-table">
              <caption id="cand-table-caption" className="sr-only">
                Organization candidates directory
              </caption>
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Applied position</th>
                  <th scope="col">Relevant skills</th>
                  <th scope="col">Experience</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Recruiter</th>
                  <th scope="col">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((cand) => (
                  <tr key={cand.id} className="hover:bg-[var(--color-canvas)]">
                    <td data-primary="true" data-label="Candidate">
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] font-mono text-xs font-medium text-[var(--color-text)]"
                        >
                          {initialsFor(cand.full_name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/workspace/candidates/${cand.id}`}
                            className="font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                          >
                            {cand.full_name}
                          </Link>
                          <p className="truncate text-xs text-[var(--color-text-secondary)]">
                            {cand.location || cand.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Applied position" className="text-[var(--color-text)]">
                      {cand.latest_job_title || "General talent pool"}
                    </td>
                    <td data-label="Relevant skills">
                      <div className="flex flex-wrap justify-end gap-1 sm:justify-start">
                        {cand.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-canvas)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-secondary)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Experience" className="font-mono text-xs tabular-nums">
                      {cand.years_of_experience}y
                    </td>
                    <td data-label="Stage">
                      {cand.latest_stage ? (
                        <StatusTag tone={stageTone(cand.latest_stage)}>
                          {STAGE_LABELS[cand.latest_stage]}
                        </StatusTag>
                      ) : (
                        <StatusTag tone="neutral">Unassigned</StatusTag>
                      )}
                    </td>
                    <td data-label="Recruiter" className="text-xs text-[var(--color-text-secondary)]">
                      {cand.assigned_recruiter_name || "Unassigned"}
                    </td>
                    <td data-label="Last activity" className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {formatRelativeTime(cand.last_activity_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-mono">
              Page {data.page} of {data.total_pages} ({data.total} candidates)
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
