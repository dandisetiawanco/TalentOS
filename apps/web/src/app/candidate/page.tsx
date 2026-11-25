"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, Download, FileText } from "lucide-react";
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
  const upcomingInterviews = (interviewsQuery.data || []).filter(
    (iv) => iv.status === "scheduled" || iv.status === "rescheduled"
  );
  const firstName = user?.full_name.split(" ")[0] || "there";

  return (
    <div className="space-y-7">
      <section className="surface-solid flex flex-col gap-5 rounded-[20px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Follow your active applications, review upcoming interview invitations, and manage your resumes from one
            private workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/careers">
            <Button variant="primary" size="sm">Explore open roles</Button>
          </Link>
          <Link href="/candidate/profile">
            <Button variant="secondary" size="sm">Edit profile</Button>
          </Link>
        </div>
      </section>

      <div className="surface-solid grid divide-y divide-[var(--color-border)] rounded-[16px] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">Submitted applications</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text)]">{apps.length}</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">Upcoming interviews</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text)]">
            {upcomingInterviews.length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">Stored resumes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text)]">
            {(docsQuery.data || []).length}
          </p>
        </div>
      </div>

      {appsQuery.isLoading && <LoadingRegion label="Loading your applications..." rows={4} />}

      {!appsQuery.isLoading && (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <section className="surface-solid rounded-[18px] p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Your applications</h2>
              <Link
                href="/candidate/applications"
                className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
              >
                View all
              </Link>
            </div>

            {apps.length === 0 ? (
              <div className="border-t border-[var(--color-border)] pt-4">
                <StatePanel
                  title="No applications submitted yet"
                  description="Browse published openings on the careers board to submit your first application."
                  action={
                    <Link href="/careers">
                      <Button variant="primary" size="sm">Browse open roles</Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {apps.map((app) => (
                  <li
                    key={app.id}
                    className="flex flex-col gap-2.5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/candidate/applications/${app.id}`}
                        className="text-sm font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]"
                      >
                        {app.job_title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                        {app.organization_name} · Applied {formatShortDate(app.applied_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <StatusTag tone={stageTone(app.stage)}>{STAGE_LABELS[app.stage]}</StatusTag>
                      <Link
                        href={`/candidate/applications/${app.id}`}
                        aria-label={`View timeline for ${app.job_title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
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
            <div className="surface-solid rounded-[18px] p-5 sm:p-6">
              <div className="flex items-center justify-between pb-3.5">
                <h2 className="text-sm font-semibold text-[var(--color-text)]">Upcoming interviews</h2>
                <Link
                  href="/candidate/interviews"
                  className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
                >
                  All invitations
                </Link>
              </div>
              {upcomingInterviews.length === 0 ? (
                <p className="border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-text-secondary)]">
                  No upcoming interviews scheduled right now.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                  {upcomingInterviews.map((iv) => (
                    <li key={iv.id} className="py-3.5 last:pb-0">
                      <p className="text-sm font-medium text-[var(--color-text)]">{iv.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                        {iv.job_title} · {iv.organization_name}
                      </p>
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs tabular-nums text-[var(--color-text-secondary)]">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} min
                      </p>
                      <div className="mt-2.5">
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

            <div className="surface-solid rounded-[18px] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <FileText className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                  Private resume vault
                </h2>
                <Link
                  href="/candidate/documents"
                  className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
                >
                  Manage files
                </Link>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Your resumes are stored privately and shared only with teams you apply to. You can update consent or
                delete documents anytime.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
