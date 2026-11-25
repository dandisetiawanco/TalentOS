"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, CheckCircle2, Download } from "lucide-react";
import { STAGE_LABELS, type CandidateApplicationView } from "@talentos/contracts";
import { Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest, downloadAuthenticatedBlob } from "@/lib/api";
import { formatDateTime, formatShortDate, stageTone } from "@/lib/format";

export default function CandidateApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const appId = params.id;

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ["candidate-application", appId],
    queryFn: () => apiRequest<CandidateApplicationView>(`/candidate/applications/${appId}`),
    enabled: Boolean(appId),
  });

  if (isLoading) return <LoadingRegion label="Loading application timeline..." rows={5} />;
  if (isError || !app) {
    return (
      <StatePanel
        tone="error"
        title="Application not found"
        description="This application does not belong to your account."
        action={<Link href="/candidate/applications"><Button variant="secondary" size="sm">Back to applications</Button></Link>}
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/candidate/applications"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to applications
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4 rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6">
          <div>
            <StatusTag tone={stageTone(app.stage)}>{STAGE_LABELS[app.stage]}</StatusTag>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
              {app.job_title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {app.organization_name} · {app.job_department} · {app.job_location}
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--color-text-secondary)]">
            Applied {formatShortDate(app.applied_at)}
          </span>
        </div>
      </div>

      <section className="rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Application timeline</h2>
        <ol className="mt-4 space-y-4 border-l-2 border-[var(--color-border)] pl-5">
          {app.timeline.map((step) => (
            <li key={step.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-accent)]"
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {STAGE_LABELS[step.to_stage]}
              </p>
              <p className="font-mono text-xs text-[var(--color-text-secondary)]">
                {formatDateTime(step.changed_at)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {app.interviews.length > 0 && (
        <section className="rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Interview invitations</h2>
          <ul className="mt-4 space-y-3">
            {app.interviews.map((iv) => (
              <li key={iv.id} className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{iv.title}</p>
                  <StatusTag tone={iv.status === "completed" ? "success" : "accent"}>{iv.status}</StatusTag>
                </div>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-secondary)]">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} min ({iv.timezone})
                </p>
                {iv.instructions && (
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{iv.instructions}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void downloadAuthenticatedBlob(iv.ics_url, `interview-${iv.id.slice(0, 8)}.ics`)}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download ICS invite
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
