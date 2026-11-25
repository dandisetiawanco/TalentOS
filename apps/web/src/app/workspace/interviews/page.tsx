"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquarePlus,
  Plus,
  XCircle,
} from "lucide-react";
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

function toLocalDateKey(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLocalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
}

function interviewTypeAccent(type: string): string {
  switch (type) {
    case "technical":
      return "border-l-[var(--color-accent)] bg-[var(--color-accent-soft)]/70";
    case "panel":
      return "border-l-[var(--color-warning)] bg-[var(--color-warning-soft)]/80";
    case "final":
      return "border-l-[var(--color-success)] bg-[var(--color-accent-soft)]";
    default:
      return "border-l-[var(--color-info)] bg-[var(--color-info-soft)]/80";
  }
}

export default function WorkspaceInterviewsPage() {
  const queryClient = useQueryClient();
  const { user, announce } = useAuth();
  const [view, setView] = React.useState<CalendarView>("agenda");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [anchorDate, setAnchorDate] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<InterviewRecord | null>(null);
  const [feedbackTarget, setFeedbackTarget] = React.useState<InterviewRecord | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Schedule form state
  const [applicationId, setApplicationId] = React.useState("");
  const [title, setTitle] = React.useState("Technical Deep Dive");
  const [interviewType, setInterviewType] = React.useState("technical");
  const [startDateTime, setStartDateTime] = React.useState(() => {
    const d = new Date(Date.now() + 2 * 86400_000);
    d.setMinutes(0, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
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
      setSelectedEvent(null);
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
  const todayKey = toLocalDateKey(new Date());

  // Group interviews by local calendar date key (consistent with Agenda view!)
  const interviewsByLocalDate = React.useMemo(() => {
    const map = new Map<string, InterviewRecord[]>();
    for (const iv of interviews) {
      const key = toLocalDateKey(iv.scheduled_start);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(iv);
      map.set(key, list);
    }
    return map;
  }, [interviews]);

  const navigateRange = (direction: -1 | 1) => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (view === "month") {
        next.setMonth(next.getMonth() + direction, 1);
      } else {
        next.setDate(next.getDate() + direction * 7);
      }
      return next;
    });
  };

  const resetToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setAnchorDate(d);
  };

  // Build 7-day week window starting from anchorDate
  const weekDays = React.useMemo(() => {
    const start = new Date(anchorDate);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      const key = toLocalDateKey(d);
      return {
        key,
        isToday: key === todayKey,
        weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d),
        dayNum: d.getDate(),
        monthShort: new Intl.DateTimeFormat("en-US", { month: "short" }).format(d),
        items: interviewsByLocalDate.get(key) || [],
      };
    });
  }, [anchorDate, interviewsByLocalDate, todayKey]);

  const weekRangeLabel = React.useMemo(() => {
    const first = new Date(anchorDate);
    const last = new Date(anchorDate);
    last.setDate(first.getDate() + 6);
    const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return `${fmt.format(first)} to ${fmt.format(last)}, ${last.getFullYear()}`;
  }, [anchorDate]);

  // Build calendar month grid with Sunday-Saturday alignment
  const monthGrid = React.useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = Array.from({ length: firstDayOfWeek }).map((_, idx) => ({
      blank: true as const,
      key: `blank-${idx}`,
    }));
    const cells = Array.from({ length: daysInMonth }).map((_, idx) => {
      const d = new Date(year, month, idx + 1);
      const key = toLocalDateKey(d);
      return {
        blank: false as const,
        dayNum: idx + 1,
        key,
        isToday: key === todayKey,
        items: interviewsByLocalDate.get(key) || [],
      };
    });
    return [...leadingBlanks, ...cells];
  }, [anchorDate, interviewsByLocalDate, todayKey]);

  const monthLabel = React.useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(anchorDate),
    [anchorDate]
  );

  const toggleInterviewer = (userId: string) => {
    setSelectedInterviewers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            Interviews
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Coordinate panels with conflict checks, collect structured feedback, and download ICS invites.
          </p>
        </div>
        {canSchedule && (
          <Button variant="primary" size="sm" className="shrink-0" onClick={() => setScheduleOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Schedule interview
          </Button>
        )}
      </div>

      {/* Unified native desktop calendar control bar */}
      <div className="surface-solid flex flex-wrap items-center justify-between gap-3 rounded-[14px] p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="tablist"
            aria-label="Calendar view mode"
            className="surface-segment-track inline-flex rounded-[10px] p-0.5"
          >
            {(["agenda", "week", "month"] as const).map((mode) => {
              const selected = view === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setView(mode)}
                  className={`relative min-h-8 rounded-[8px] px-3 text-xs font-medium capitalize transition-colors ${
                    selected
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="calendar-view-pill"
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[8px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,21,0.08)] ring-1 ring-[var(--color-border)]"
                    />
                  )}
                  <span className="relative z-10">{mode}</span>
                </button>
              );
            })}
          </div>

          {view !== "agenda" && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigateRange(-1)}
                aria-label={view === "month" ? "Previous month" : "Previous week"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={resetToday}
                className="inline-flex h-8 items-center rounded-[8px] border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-subtle)]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => navigateRange(1)}
                aria-label={view === "month" ? "Next month" : "Next week"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="ml-1 text-xs font-semibold text-[var(--color-text)]">
                {view === "month" ? monthLabel : weekRangeLabel}
              </span>
            </div>
          )}
        </div>

        <Select
          aria-label="Filter interviews by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-9 w-40 text-xs"
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
              className="surface-solid rounded-[16px] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold tracking-[-0.01em] text-[var(--color-text)]">
                      {iv.title}
                    </h2>
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
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {INTERVIEW_TYPE_LABELS[iv.interview_type] || iv.interview_type}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    <Link
                      href={`/workspace/candidates/${iv.candidate_id}`}
                      className="font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                    >
                      {iv.candidate_name}
                    </Link>{" "}
                    · {iv.job_title}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-xs tabular-nums text-[var(--color-text-secondary)]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} min ({iv.timezone})
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Panel: {iv.participants.map((p) => p.full_name).join(", ") || "Unassigned"}
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
                    ICS invite
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
                <div className="mt-4 border-t border-[var(--color-border)] pt-3.5">
                  <p className="text-xs font-semibold text-[var(--color-text)]">Recorded feedback</p>
                  <div
                    className={`mt-2.5 grid gap-2.5 ${
                      iv.feedback_entries.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {iv.feedback_entries.map((fb) => (
                      <div
                        key={fb.id}
                        className="rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[var(--color-text)]">{fb.reviewer_name}</span>
                          <StatusTag tone={fb.recommendation === "no" ? "error" : "success"}>
                            {fb.recommendation.replace("_", " ")}
                          </StatusTag>
                        </div>
                        <p className="mt-2 leading-relaxed text-[var(--color-text-secondary)]">
                          <strong className="font-medium text-[var(--color-text)]">Strengths:</strong> {fb.strengths}
                        </p>
                        {fb.concerns && (
                          <p className="mt-1 leading-relaxed text-[var(--color-text-secondary)]">
                            <strong className="font-medium text-[var(--color-text)]">Concerns:</strong> {fb.concerns}
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

      {/* Week view (local timezone aligned with Agenda) */}
      {view === "week" && (
        <div className="surface-solid grid divide-y divide-[var(--color-border)] overflow-hidden rounded-[16px] md:grid-cols-2 md:divide-y-0 lg:grid-cols-7 lg:divide-x">
          {weekDays.map((day) => (
            <div key={day.key} className="flex min-h-[210px] flex-col p-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--color-border)]">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{day.weekday}</span>
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                    day.isToday
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "text-[var(--color-text)]"
                  }`}
                >
                  {day.dayNum}
                </span>
              </div>
              <div className="mt-2.5 flex-1 space-y-2">
                {day.items.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-[var(--color-text-secondary)]">Open</p>
                ) : (
                  day.items.map((iv) => (
                    <button
                      key={iv.id}
                      type="button"
                      onClick={() => setSelectedEvent(iv)}
                      className={`w-full rounded-[9px] border border-[var(--color-border)] border-l-[3px] p-2.5 text-left text-xs transition-opacity hover:opacity-90 ${interviewTypeAccent(iv.interview_type)}`}
                    >
                      <p className="truncate font-semibold text-[var(--color-text)]">{iv.candidate_name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-secondary)]">{iv.title}</p>
                      <p className="mt-1 text-[11px] font-medium tabular-nums text-[var(--color-text)]">
                        {formatLocalTime(iv.scheduled_start)} · {iv.duration_minutes}m
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Month view (proper Sun-Sat alignment, local dates) */}
      {view === "month" && (
        <div className="surface-solid overflow-hidden rounded-[16px]">
          <div className="hidden grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] lg:grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
            {monthGrid.map((cell) =>
              cell.blank ? (
                <div
                  key={cell.key}
                  aria-hidden="true"
                  className="hidden min-h-24 border-b border-r border-[var(--color-border)] bg-[var(--color-surface-subtle)]/40 lg:block"
                />
              ) : (
                <div
                  key={cell.key}
                  className="min-h-24 border-b border-r border-[var(--color-border)] p-2.5"
                >
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums ${
                      cell.isToday
                        ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {cell.items.map((iv) => (
                      <button
                        key={iv.id}
                        type="button"
                        onClick={() => setSelectedEvent(iv)}
                        className={`block w-full truncate rounded-[6px] border-l-2 px-1.5 py-1 text-left text-[11px] font-medium text-[var(--color-text)] transition-opacity hover:opacity-85 ${interviewTypeAccent(iv.interview_type)}`}
                        title={`${iv.candidate_name}: ${iv.title} (${formatLocalTime(iv.scheduled_start)})`}
                      >
                        {formatLocalTime(iv.scheduled_start)} {iv.candidate_name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Contextual Interview Details Dialog (for Week & Month click) */}
      <NativeDialog
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || "Interview details"}
        description={selectedEvent ? `${selectedEvent.candidate_name} · ${selectedEvent.job_title}` : undefined}
      >
        {selectedEvent && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag tone={selectedEvent.status === "completed" ? "success" : selectedEvent.status === "cancelled" ? "error" : "accent"}>
                {selectedEvent.status}
              </StatusTag>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {INTERVIEW_TYPE_LABELS[selectedEvent.interview_type] || selectedEvent.interview_type}
              </span>
            </div>
            <dl className="space-y-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-text-secondary)]">Time</dt>
                <dd className="font-medium tabular-nums text-[var(--color-text)]">
                  {formatDateTime(selectedEvent.scheduled_start)} ({selectedEvent.duration_minutes} min)
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-text-secondary)]">Interviewers</dt>
                <dd className="text-right font-medium text-[var(--color-text)]">
                  {selectedEvent.participants.map((p) => p.full_name).join(", ") || "Unassigned"}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Link
                href={`/workspace/candidates/${selectedEvent.candidate_id}`}
                className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
              >
                Open candidate dossier
              </Link>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void downloadAuthenticatedBlob(
                      `/interviews/${selectedEvent.id}/ics`,
                      `talentos-interview-${selectedEvent.id.slice(0, 8)}.ics`
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  ICS
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const target = selectedEvent;
                    setSelectedEvent(null);
                    setFeedbackTarget(target);
                  }}
                >
                  Feedback
                </Button>
              </div>
            </div>
          </div>
        )}
      </NativeDialog>

      {/* Schedule interview dialog */}
      <NativeDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule interview"
        description="Conflict detection automatically checks interviewer and candidate availability."
      >
        {formError && (
          <div role="alert" className="mb-4 rounded-[10px] border border-[var(--color-error)] bg-[var(--color-error-soft)] p-3 text-xs text-[var(--color-error)]">
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
            <div className="mt-1.5 space-y-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
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
                Technical and role depth (1 to 5): {techScore}
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
