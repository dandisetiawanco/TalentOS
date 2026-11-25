"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download } from "lucide-react";
import type { CandidateInterviewView } from "@talentos/contracts";
import { Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest, downloadAuthenticatedBlob } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export default function CandidateInterviewsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidate-interviews"],
    queryFn: () => apiRequest<CandidateInterviewView[]>("/candidate/interviews"),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
          Interview invitations
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          View confirmed interview times, preparation notes, and download ICS files to add them to
          your personal calendar.
        </p>
      </div>

      {isLoading && <LoadingRegion label="Loading interview invitations..." rows={4} />}
      {isError && (
        <StatePanel
          tone="error"
          title="Could not load interviews"
          description="Try again shortly."
          action={<Button variant="secondary" size="sm" onClick={() => void refetch()}>Retry</Button>}
        />
      )}

      {data && data.length === 0 && (
        <StatePanel
          title="No interview invitations yet"
          description="When a hiring team schedules an interview for one of your applications, the invitation will appear here."
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((iv) => (
            <article key={iv.id} className="rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">{iv.title}</h2>
                    <StatusTag tone={iv.status === "completed" ? "success" : iv.status === "cancelled" ? "error" : "accent"}>
                      {iv.status}
                    </StatusTag>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {iv.job_title} · {iv.organization_name}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} minutes ({iv.timezone})
                  </p>
                  {iv.instructions && (
                    <p className="mt-2.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      {iv.instructions}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void downloadAuthenticatedBlob(iv.ics_url, `talentos-interview-${iv.id.slice(0, 8)}.ics`)}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download ICS
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
