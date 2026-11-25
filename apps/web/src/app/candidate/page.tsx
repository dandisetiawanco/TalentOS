"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, FileText, ArrowRight } from "lucide-react";
import {
  STAGE_LABELS,
  type CandidateApplicationView,
  type CandidateDocument,
  type CandidateInterviewView,
} from "@talentos/contracts";
import { Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest, downloadAuthenticatedBlob } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, formatShortDate, stageTone } from "@/lib/format";

export default function CandidateHomePage() {
  const { user } = useAuth();

  const appsQuery = useQuery({
    queryKey: ["candidate-applications"],
    queryFn: () => apiRequest<CandidateApplicationView[]>("/candidate/applications"),
  });

  const interviewsQuery = useQuery({
    queryKey: ["candidate-interviews"],
    queryFn: () => apiRequest<CandidateInterviewView[]>("/candidate/interviews"),
  });

  const docsQuery = useQuery({
    queryKey: ["candidate-documents"],
    queryFn: () => apiRequest<CandidateDocument[]>("/candidate/documents"),
  });

  const apps = appsQuery.data || [];
  const upcomingInterviews = (interviewsQuery.data || []).filter((iv) => iv.status === "scheduled" || iv.status === "rescheduled");

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">Welcome back</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            {user?.full_name}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--color-text-secondary)]">
            Track your active applications, review interview invitations, and manage your resumes
            and privacy preferences in one calm space.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/careers">
            <Button variant="primary">Explore open positions</Button>
          </Link>
          <Link href="/candidate/profile">
            <Button variant="secondary">Update profile</Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">Submitted applications</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
            {apps.length}
          </p>
        </div>
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">Upcoming interviews</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
            {upcomingInterviews.length}
          </p>
        </div>
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">Uploaded resumes</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">
            {(docsQuery.data || []).length}
          </p>
        </div>
      </div>

      {appsQuery.isLoading && <LoadingRegion label="Loading your applications..." rows={4} />}

      {!appsQuery.isLoading && (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Your applications</h2>
              <Link href="/candidate/applications" className="text-xs font-medium text-[var(--color-accent-text)] hover:underline">
                View all
              </Link>
            </div>

            {apps.length === 0 ? (
              <div className="mt-4">
                <StatePanel
                  title="No applications submitted yet"
                  description="Browse published openings on the public careers board to submit your first application."
                  action={<Link href="/careers"><Button variant="primary" size="sm">Browse open roles</Button></Link>}
                />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-border)]">
                {apps.map((app) => (
                  <li key={app.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link
                        href={`/candidate/applications/${app.id}`}
                        className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-accent)]"
                      >
                        {app.job_title}
                      </Link>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {app.organization_name} · Applied {formatShortDate(app.applied_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <StatusTag tone={stageTone(app.stage)}>{STAGE_LABELS[app.stage]}</StatusTag>
                      <Link
                        href={`/candidate/applications/${app.id}`}
                        aria-label={`View timeline for ${app.job_title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                      >
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-5">
            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h2 className="text-sm font-semibold text-[var(--color-text)]">Upcoming interviews</h2>
                <Link href="/candidate/interviews" className="text-xs font-medium text-[var(--color-accent-text)] hover:underline">
                  All invitations
                </Link>
              </div>
              {upcomingInterviews.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  No upcoming interviews scheduled right now.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {upcomingInterviews.map((iv) => (
                    <li key={iv.id} className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5">
                      <p className="text-sm font-medium text-[var(--color-text)]">{iv.title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {iv.job_title} · {iv.organization_name}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-secondary)]">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDateTime(iv.scheduled_start)} ({iv.duration_minutes}m)
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void downloadAuthenticatedBlob(iv.ics_url, `interview-${iv.id.slice(0, 8)}.ics`)}
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Calendar ICS
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <FileText className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                  Resume vault
                </h2>
                <Link href="/candidate/documents" className="text-xs font-medium text-[var(--color-accent-text)] hover:underline">
                  Manage files
                </Link>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Your resumes are stored privately and shared only with organizations you explicitly
                apply to. You can withdraw processing consent or remove files at any time.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
