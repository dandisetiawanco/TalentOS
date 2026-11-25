"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { STAGE_LABELS, type CandidateApplicationView } from "@talentos/contracts";
import { Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest } from "@/lib/api";
import { formatShortDate, stageTone } from "@/lib/format";

export default function CandidateApplicationsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidate-applications"],
    queryFn: () => apiRequest<CandidateApplicationView[]>("/candidate/applications"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            My applications
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Follow each role&apos;s stage progression and scheduled interviews in one place.
          </p>
        </div>
        <Link href="/careers">
          <Button variant="primary" size="sm">Browse open roles</Button>
        </Link>
      </div>

      {isLoading && <LoadingRegion label="Loading your applications..." rows={4} />}
      {isError && (
        <StatePanel
          tone="error"
          title="Could not load applications"
          description="Verify your connection and retry."
          action={<Button variant="secondary" size="sm" onClick={() => void refetch()}>Retry</Button>}
        />
      )}

      {data && data.length === 0 && (
        <StatePanel
          title="You have not applied to any roles yet"
          description="Explore open positions on the public careers board to submit an application."
          action={<Link href="/careers"><Button variant="primary" size="sm">View open roles</Button></Link>}
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((app) => (
            <article
              key={app.id}
              className="flex flex-col gap-4 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/candidate/applications/${app.id}`}
                    className="text-base font-semibold text-[var(--color-text)] hover:text-[var(--color-accent)]"
                  >
                    {app.job_title}
                  </Link>
                  <StatusTag tone={stageTone(app.stage)}>{STAGE_LABELS[app.stage]}</StatusTag>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {app.organization_name} · {app.job_department} · {app.job_location}
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
                  Applied {formatShortDate(app.applied_at)} · {app.interviews.length} interview(s)
                </p>
              </div>
              <Link href={`/candidate/applications/${app.id}`}>
                <Button variant="secondary" size="sm">View timeline</Button>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
