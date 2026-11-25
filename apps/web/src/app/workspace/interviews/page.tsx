"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Download, MessageSquarePlus, Plus, XCircle } from "lucide-react";
import {
  INTERVIEW_TYPE_LABELS,
  type ApplicationSummary,
  type InterviewRecord,
  type TeamMember,
} from "@talentos/contracts";
import { Button, Input, LoadingRegion, NativeDialog, Select, StatePanel, StatusTag, Textarea } from "@talentos/ui";
import { ApiError, apiRequest, downloadAuthenticatedBlob } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/format";

type CalendarView = "agenda" | "week" | "month";

export default function WorkspaceInterviewsPage() {
  const queryClient = useQueryClient();
  const { user, announce } = useAuth();
  const [view, setView] = React.useState<CalendarView>("agenda");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [feedbackTarget, setFeedbackTarget] = React.useState<InterviewRecord | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Schedule form state
  const [applicationId, setApplicationId] = React.useState("");
  const [title, setTitle] = React.useState("Technical Deep Dive");
  const [interviewType, setInterviewType] = React.useState("technical");
  const [startDateTime, setStartDateTime] = React.useState(() => {
    const d = new Date(Date.now() + 2 * 86400_000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = React.useState("45");
  const [timezone, setTimezone] = React.useState("Asia/Jakarta");
  const [meetingLink, setMeetingLink] = React.useState("https://meet.demo.talentos.invalid/session");
  const [instructions, setInstructions] = React.useState("");
  const [selectedInterviewers, setSelectedInterviewers] = React.useState<string[]>([]);

  // Feedback form state
  const [recommendation, setRecommendation] = React.useState<"strong_yes" | "yes" | "mixed" | "no">("yes");
  const [strengths, setStrengths] = React.useState("");
  const [concerns, setConcerns] = React.useState("");
  const [techScore, setTechScore] = React.useState(4);
  const [commScore, setCommScore] = React.useState(4);

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);

  const interviewsQuery = useQuery({
    queryKey: ["workspace-interviews", statusFilter],
    queryFn: () => apiRequest<InterviewRecord[]>(`/interviews?${params.toString()}`),
  });

  const appsQuery = useQuery({
    queryKey: ["workspace-apps-for-interview"],
    queryFn: () => apiRequest<ApplicationSummary[]>("/applications"),
    enabled: scheduleOpen,
  });

  const teamQuery = useQuery({
    queryKey: ["workspace-team"],
    queryFn: () => apiRequest<TeamMember[]>("/team"),
  });

  React.useEffect(() => {
    if (teamQuery.data && selectedInterviewers.length === 0 && teamQuery.data[0]) {
      setSelectedInterviewers([teamQuery.data[0].user_id]);
    }
  }, [selectedInterviewers.length, teamQuery.data]);

  const scheduleMutation = useMutation({
    mutationFn: () =>
      apiRequest<InterviewRecord>("/interviews", {
        method: "POST",
        body: JSON.stringify({
          application_id: applicationId,
          title,
          interview_type: interviewType,
          scheduled_start: new Date(startDateTime).toISOString(),
          duration_minutes: Number(duration) || 45,
          timezone,
          meeting_link: meetingLink || null,
          instructions: instructions || null,
          interviewer_ids: selectedInterviewers,
        }),
      }),
    onSuccess: (created) => {
      setScheduleOpen(false);
      setFormError(null);
      announce(`Scheduled interview ${created.title} with ${created.candidate_name}.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-interviews"] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : "Could not schedule interview.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: "completed" | "cancelled" }) =>
      apiRequest<InterviewRecord>(`/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      }),
    onSuccess: (updated) => {
      announce(`Marked interview as ${updated.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-interviews"] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: () => {
      if (!feedbackTarget) throw new Error("No target");
      return apiRequest(`/interviews/${feedbackTarget.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          recommendation,
          strengths,
          concerns: concerns || null,
          rubric_scores: { technical_depth: techScore, communication: commScore },
        }),
      });
    },
    onSuccess: () => {
      setFeedbackTarget(null);
      setStrengths("");
      setConcerns("");
      announce("Saved structured interview feedback.");
      void queryClient.invalidateQueries({ queryKey: ["workspace-interviews"] });
    },
  });

  const canSchedule = user?.role === "organization_owner" || user?.role === "recruiter";
  const interviews = React.useMemo(() => interviewsQuery.data || [], [interviewsQuery.data]);

  // Build 7-day week grid starting today
  const weekDays = React.useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start.getTime() + idx * 86400_000);
      const key = d.toISOString().slice(0, 10);
      return {
        key,
        label: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d),
        items: interviews.filter((iv) => iv.scheduled_start.slice(0, 10) === key),
      };
    });
  }, [interviews]);

  // Build current month day cells
  const monthDays = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }).map((_, idx) => {
      const d = new Date(Date.UTC(year, month, idx + 1));
      const key = d.toISOString().slice(0, 10);
      return {
        dayNum: idx + 1,
        key,
        items: interviews.filter((iv) => iv.scheduled_start.slice(0, 10) === key),
      };
    });
  }, [interviews]);

  const toggleInterviewer = (userId: string) => {
    setSelectedInterviewers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Interview coordination
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Schedule panels with automatic conflict detection, record structured feedback, and export
            ICS calendar invitations (no external calendar OAuth sync required).
          </p>
        </div>
        {canSchedule && (
          <Button variant="primary" className="shrink-0" onClick={() => setScheduleOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Schedule interview
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Calendar layout mode" className="inline-flex rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {(["agenda", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              onClick={() => setView(mode)}
              className={`min-h-9 rounded-[5px] px-3 text-xs font-medium capitalize transition-colors ${
                view === mode
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <Select
          aria-label="Filter interviews by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-10 w-44 text-xs"
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="rescheduled">Rescheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {interviewsQuery.isLoading && <LoadingRegion label="Loading interview schedule..." rows={5} />}

      {interviewsQuery.isError && (
        <StatePanel
          tone="error"
          title="Unable to load interviews"
          description="Confirm the API service is running and try again."
          action={<Button variant="secondary" size="sm" onClick={() => void interviewsQuery.refetch()}>Retry</Button>}
        />
      )}

      {!interviewsQuery.isLoading && interviews.length === 0 && (
        <StatePanel
          title="No interviews match this filter"
          description="Schedule an interview round for an active applicant to populate the calendar."
        />
      )}

      {/* Agenda view */}
      {view === "agenda" && interviews.length > 0 && (
        <div className="space-y-3">
          {interviews.map((iv) => (
            <article
              key={iv.id}
              className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">{iv.title}</h2>
                    <StatusTag
                      tone={
                        iv.status === "completed"
                          ? "success"
                          : iv.status === "cancelled"
                          ? "error"
                          : "accent"
                      }
                    >
                      {iv.status}
                    </StatusTag>
                    <StatusTag tone="neutral">
                      {INTERVIEW_TYPE_LABELS[iv.interview_type] || iv.interview_type}
                    </StatusTag>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Candidate:{" "}
                    <Link href={`/workspace/candidates/${iv.candidate_id}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]">
                      {iv.candidate_name}
                    </Link>{" "}
                    · {iv.job_title}
                  </p>
                  <p className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} min ({iv.timezone})
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Interviewers: {iv.participants.map((p) => p.full_name).join(", ") || "None assigned"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void downloadAuthenticatedBlob(
                        `/interviews/${iv.id}/ics`,
                        `talentos-interview-${iv.id.slice(0, 8)}.ics`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download ICS
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setFeedbackTarget(iv)}>
                    <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Feedback ({iv.feedback_entries.length})
                  </Button>
                  {iv.status === "scheduled" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: iv.id, nextStatus: "completed" })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Complete
                    </Button>
                  )}
                  {canSchedule && iv.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: iv.id, nextStatus: "cancelled" })}
                    >
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {iv.feedback_entries.length > 0 && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs font-semibold text-[var(--color-text)]">Recorded feedback</p>
                  <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                    {iv.feedback_entries.map((fb) => (
                      <div key={fb.id} className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[var(--color-text)]">{fb.reviewer_name}</span>
                          <StatusTag tone={fb.recommendation === "no" ? "error" : "success"}>
                            {fb.recommendation.replace("_", " ")}
                          </StatusTag>
                        </div>
                        <p className="mt-1.5 text-[var(--color-text-secondary)]">
                          <strong className="text-[var(--color-text)]">Strengths:</strong> {fb.strengths}
                        </p>
                        {fb.concerns && (
                          <p className="mt-1 text-[var(--color-text-secondary)]">
                            <strong className="text-[var(--color-text)]">Concerns:</strong> {fb.concerns}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Week view */}
      {view === "week" && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day) => (
            <div key={day.key} className="min-h-48 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="border-b border-[var(--color-border)] pb-2 font-mono text-xs font-medium text-[var(--color-text)]">
                {day.label}
              </p>
              <div className="mt-2 space-y-2">
                {day.items.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-secondary)]">Open</p>
                ) : (
                  day.items.map((iv) => (
                    <div key={iv.id} className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-accent-soft)] p-2 text-xs">
                      <p className="font-medium text-[var(--color-accent-text)]">{iv.candidate_name}</p>
                      <p className="text-[var(--color-text-secondary)]">{iv.title}</p>
                      <p className="mt-0.5 font-mono text-[11px]">{iv.scheduled_start.slice(11, 16)} UTC</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Month view */}
      {view === "month" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {monthDays.map((cell) => (
            <div key={cell.key} className="min-h-24 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">{cell.dayNum}</span>
              <div className="mt-1.5 space-y-1">
                {cell.items.map((iv) => (
                  <p
                    key={iv.id}
                    className="truncate rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-accent-text)]"
                    title={`${iv.candidate_name}: ${iv.title}`}
                  >
                    {iv.candidate_name}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule interview dialog */}
      <NativeDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule interview"
        description="Conflict detection automatically checks interviewer and candidate availability."
      >
        {formError && (
          <div role="alert" className="mb-4 rounded-[6px] border border-[var(--color-error)] bg-[var(--color-error-soft)] p-3 text-xs text-[var(--color-error)]">
            {formError}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            scheduleMutation.mutate();
          }}
          className="space-y-3.5"
        >
          <div>
            <label htmlFor="iv-app" className="block text-xs font-medium text-[var(--color-text)]">Candidate application</label>
            <Select id="iv-app" required value={applicationId} onChange={(e) => setApplicationId(e.target.value)} className="mt-1">
              <option value="">Select an applicant</option>
              {(appsQuery.data || []).map((app) => (
                <option key={app.id} value={app.id}>
                  {app.candidate_name} ({app.job_title})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="iv-title" className="block text-xs font-medium text-[var(--color-text)]">Interview title</label>
              <Input id="iv-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="iv-type" className="block text-xs font-medium text-[var(--color-text)]">Format</label>
              <Select id="iv-type" value={interviewType} onChange={(e) => setInterviewType(e.target.value)} className="mt-1">
                {Object.entries(INTERVIEW_TYPE_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>{lbl}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="iv-start" className="block text-xs font-medium text-[var(--color-text)]">Date and time</label>
              <Input id="iv-start" type="datetime-local" required value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="iv-dur" className="block text-xs font-medium text-[var(--color-text)]">Minutes</label>
              <Input id="iv-dur" type="number" min={15} max={240} value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="iv-tz" className="block text-xs font-medium text-[var(--color-text)]">Timezone</label>
              <Input id="iv-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="iv-link" className="block text-xs font-medium text-[var(--color-text)]">Meeting link</label>
              <Input id="iv-link" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} className="mt-1" />
            </div>
          </div>
          <fieldset>
            <legend className="text-xs font-medium text-[var(--color-text)]">Assign interviewers</legend>
            <div className="mt-1.5 space-y-1.5 rounded-[7px] border border-[var(--color-border)] p-2.5">
              {(teamQuery.data || []).map((member) => (
                <label key={member.user_id} className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={selectedInterviewers.includes(member.user_id)}
                    onChange={() => toggleInterviewer(member.user_id)}
                  />
                  <span>{member.full_name} ({member.role.replace("_", " ")})</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="iv-notes" className="block text-xs font-medium text-[var(--color-text)]">Candidate instructions</label>
            <Textarea id="iv-notes" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!applicationId || selectedInterviewers.length === 0 || scheduleMutation.isPending}
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Confirm schedule"}
            </Button>
          </div>
        </form>
      </NativeDialog>

      {/* Structured feedback dialog */}
      <NativeDialog
        open={Boolean(feedbackTarget)}
        onClose={() => setFeedbackTarget(null)}
        title="Submit interview feedback"
        description={feedbackTarget ? `${feedbackTarget.candidate_name} · ${feedbackTarget.title}` : undefined}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            feedbackMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="fb-rec" className="block text-xs font-medium text-[var(--color-text)]">Recommendation</label>
            <Select
              id="fb-rec"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value as typeof recommendation)}
              className="mt-1"
            >
              <option value="strong_yes">Strong yes</option>
              <option value="yes">Yes</option>
              <option value="mixed">Mixed</option>
              <option value="no">No</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fb-tech" className="block text-xs font-medium text-[var(--color-text)]">
                Technical / role depth (1 to 5): {techScore}
              </label>
              <input id="fb-tech" type="range" min={1} max={5} value={techScore} onChange={(e) => setTechScore(Number(e.target.value))} className="mt-2 w-full" />
            </div>
            <div>
              <label htmlFor="fb-comm" className="block text-xs font-medium text-[var(--color-text)]">
                Communication (1 to 5): {commScore}
              </label>
              <input id="fb-comm" type="range" min={1} max={5} value={commScore} onChange={(e) => setCommScore(Number(e.target.value))} className="mt-2 w-full" />
            </div>
          </div>
          <div>
            <label htmlFor="fb-str" className="block text-xs font-medium text-[var(--color-text)]">Observed strengths</label>
            <Textarea id="fb-str" required minLength={5} rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label htmlFor="fb-con" className="block text-xs font-medium text-[var(--color-text)]">Open questions or concerns</label>
            <Textarea id="fb-con" rows={2} value={concerns} onChange={(e) => setConcerns(e.target.value)} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFeedbackTarget(null)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={strengths.trim().length < 5 || feedbackMutation.isPending}>
              {feedbackMutation.isPending ? "Saving..." : "Submit feedback"}
            </Button>
          </div>
        </form>
      </NativeDialog>
    </div>
  );
}
