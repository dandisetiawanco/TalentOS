"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Clock, MapPin, Search } from "lucide-react";
import type { JobRecord, PaginatedResponse } from "@talentos/contracts";
import { EMPLOYMENT_TYPE_LABELS, WORK_ARRANGEMENT_LABELS } from "@talentos/contracts";
import { Button, Input, LoadingRegion, Select, StatePanel, StatusTag } from "@talentos/ui";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { apiRequest } from "@/lib/api";
import { formatSalaryRange, formatShortDate } from "@/lib/format";

export default function PublicCareersPage() {
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [workArrangement, setWorkArrangement] = React.useState("");

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (department) queryParams.set("department", department);
  if (employmentType) queryParams.set("employment_type", employmentType);
  if (workArrangement) queryParams.set("work_arrangement", workArrangement);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-jobs", search, department, employmentType, workArrangement],
    queryFn: () => apiRequest<PaginatedResponse<JobRecord>>(`/public/jobs?${queryParams.toString()}`),
  });

  const departments = React.useMemo(() => {
    const base = new Set(["Engineering", "Design", "Data", "Security", "Product", "People"]);
    data?.items.forEach((j) => base.add(j.department));
    return Array.from(base).sort();
  }, [data]);

  const resetFilters = () => {
    setSearch("");
    setDepartment("");
    setEmploymentType("");
    setWorkArrangement("");
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <section className="mx-auto max-w-[1160px] px-4 pt-12 pb-6 sm:px-6 md:pt-16 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
              Open positions
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              Published roles appear directly from hiring workspaces. Listings labeled Demo belong to the synthetic
              Alder &amp; Finch Systems sandbox so you can test the application flow end to end.
            </p>
          </div>

          <div className="surface-solid mt-7 grid gap-3 rounded-[16px] p-3.5 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="relative">
              <label htmlFor="careers-search" className="sr-only">
                Search jobs by title, department, or location
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
              <Input
                id="careers-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role, department, or location"
                className="pl-10"
              />
            </div>

            <div>
              <label htmlFor="careers-dept" className="sr-only">Filter by department</label>
              <Select id="careers-dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="careers-type" className="sr-only">Filter by employment type</label>
              <Select id="careers-type" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                <option value="">All employment types</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </Select>
            </div>

            <div>
              <label htmlFor="careers-work" className="sr-only">Filter by workplace arrangement</label>
              <Select id="careers-work" value={workArrangement} onChange={(e) => setWorkArrangement(e.target.value)}>
                <option value="">All workplace types</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </Select>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1160px] px-4 pb-12 pt-2 sm:px-6 lg:px-8">
          {isLoading && <LoadingRegion label="Loading open positions..." rows={5} />}

          {isError && (
            <StatePanel
              tone="error"
              title="Unable to load job openings"
              description="The API server could not be reached. Confirm the backend is running on port 8000 and retry."
              action={
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  Retry
                </Button>
              }
            />
          )}

          {data && data.items.length === 0 && (
            <StatePanel
              title="No matching job openings"
              description="No published roles matched your active filters. Reset filters to inspect all open positions."
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          )}

          {data && data.items.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-secondary)] tabular-nums">
                Showing {data.items.length} of {data.total} published roles
              </p>

              <div className="surface-solid divide-y divide-[var(--color-border)] overflow-hidden rounded-[18px]">
                {data.items.map((job) => (
                  <article
                    key={job.id}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-[var(--color-surface-subtle)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/careers/${job.slug}`}
                          className="text-base font-semibold tracking-[-0.01em] text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]"
                        >
                          {job.title}
                        </Link>
                        {job.is_demo && <StatusTag tone="neutral">Demo</StatusTag>}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {job.organization_name} · {job.department}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {job.location} ({WORK_ARRANGEMENT_LABELS[job.work_arrangement] || job.work_arrangement})
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {job.required_skills.slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                      <span className="text-xs font-medium tabular-nums text-[var(--color-text)]">
                        {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                      </span>
                      {job.application_deadline && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          Closes {formatShortDate(job.application_deadline)}
                        </span>
                      )}
                      <Link href={`/careers/${job.slug}`} className="mt-1">
                        <Button variant="secondary" size="sm">
                          View role
                        </Button>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
