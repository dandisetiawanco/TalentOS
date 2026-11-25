"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Search } from "lucide-react";
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  type ApplicationStage,
  type ApplicationSummary,
  type JobRecord,
  type PaginatedResponse,
  type PipelineBoardResponse,
} from "@talentos/contracts";
import { Button, Input, LoadingRegion, NativeDialog, Select, StatePanel, StatusTag, Textarea } from "@talentos/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/format";

function PipelineCard({
  app,
  canMove,
  onSelectStage,
}: {
  app: ApplicationSummary;
  canMove: boolean;
  onSelectStage: (app: ApplicationSummary, nextStage: ApplicationStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { app },
    disabled: !canMove,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/workspace/candidates/${app.candidate_id}`}
          className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
        >
          {app.candidate_name}
        </Link>
        {canMove && (
          <button
            type="button"
            aria-label={`Drag ${app.candidate_name} to another stage`}
            className="inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] active:cursor-grabbing"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{app.job_title}</p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
        <span>{app.candidate_years_experience}y exp</span>
        {app.evidence_found_count != null && app.required_total_count != null && (
          <span className="text-[var(--color-accent-text)]">
            {app.evidence_found_count}/{app.required_total_count} evidence
          </span>
        )}
        <span>{formatRelativeTime(app.last_activity_at)}</span>
      </div>

      {/* Keyboard and single-pointer accessible stage movement alternative (WCAG 2.5.7) */}
      {canMove && (
        <div className="mt-2.5 border-t border-[var(--color-border)] pt-2">
          <label htmlFor={`stage-select-${app.id}`} className="sr-only">
            Move {app.candidate_name} to stage
          </label>
          <select
            id={`stage-select-${app.id}`}
            value={app.stage}
            onChange={(e) => onSelectStage(app, e.target.value as ApplicationStage)}
            className="min-h-8 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 text-xs text-[var(--color-text)]"
          >
            {APPLICATION_STAGES.map((st) => (
              <option key={st} value={st}>
                Stage: {STAGE_LABELS[st]}
              </option>
            ))}
          </select>
        </div>
      )}
    </article>
  );
}

function PipelineColumn({
  stage,
  items,
  canMove,
  onSelectStage,
}: {
  stage: ApplicationStage;
  items: ApplicationSummary[];
  canMove: boolean;
  onSelectStage: (app: ApplicationSummary, nextStage: ApplicationStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STAGE_LABELS[stage]} stage (${items.length})`}
      className={`flex min-h-[420px] w-[268px] shrink-0 flex-col rounded-[8px] border p-3 transition-colors ${
        isOver
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/50"
          : "border-[var(--color-border)] bg-[var(--color-surface-muted)]/60"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
        <h2 className="text-xs font-semibold text-[var(--color-text)]">{STAGE_LABELS[stage]}</h2>
        <span className="rounded-[4px] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-xs tabular-nums text-[var(--color-text-secondary)] border border-[var(--color-border)]">
          {items.length}
        </span>
      </div>
      <div className="mt-2.5 flex-1 space-y-2.5">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--color-text-secondary)]">
            No candidates in {STAGE_LABELS[stage]}
          </p>
        ) : (
          items.map((app) => (
            <PipelineCard key={app.id} app={app} canMove={canMove} onSelectStage={onSelectStage} />
          ))
        )}
      </div>
    </section>
  );
}

export default function WorkspacePipelinePage() {
  const queryClient = useQueryClient();
  const { user, announce } = useAuth();
  const [jobId, setJobId] = React.useState("");
  const [q, setQ] = React.useState("");
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const [pendingDecision, setPendingDecision] = React.useState<{
    app: ApplicationSummary;
    toStage: ApplicationStage;
  } | null>(null);
  const [decisionReason, setDecisionReason] = React.useState("");

  const params = new URLSearchParams();
  if (jobId) params.set("job_id", jobId);
  if (q.trim()) params.set("q", q.trim());

  const queryKey = ["workspace-pipeline", jobId, q];
  const boardQuery = useQuery({
    queryKey,
    queryFn: () => apiRequest<PipelineBoardResponse>(`/pipeline?${params.toString()}`),
  });

  const jobsQuery = useQuery({
    queryKey: ["workspace-jobs-pipeline"],
    queryFn: () => apiRequest<PaginatedResponse<JobRecord>>("/jobs?page_size=50"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const moveMutation = useMutation({
    mutationFn: ({
      applicationId,
      toStage,
      reason,
    }: {
      applicationId: string;
      toStage: ApplicationStage;
      reason?: string;
    }) =>
      apiRequest<ApplicationSummary>(`/applications/${applicationId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ to_stage: toStage, reason }),
      }),
    onMutate: async ({ applicationId, toStage }) => {
      setErrorBanner(null);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PipelineBoardResponse>(queryKey);
      if (previous) {
        const nextColumns = { ...previous.columns };
        let moved: ApplicationSummary | undefined;
        for (const st of APPLICATION_STAGES) {
          const idx = (nextColumns[st] || []).findIndex((item) => item.id === applicationId);
          if (idx >= 0) {
            moved = { ...nextColumns[st][idx]!, stage: toStage };
            nextColumns[st] = nextColumns[st].filter((item) => item.id !== applicationId);
            break;
          }
        }
        if (moved) {
          nextColumns[toStage] = [moved, ...(nextColumns[toStage] || [])];
          const nextCounts = { ...previous.counts };
          for (const st of APPLICATION_STAGES) {
            nextCounts[st] = (nextColumns[st] || []).length;
          }
          queryClient.setQueryData<PipelineBoardResponse>(queryKey, {
            ...previous,
            columns: nextColumns,
            counts: nextCounts,
          });
        }
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      setErrorBanner(err instanceof ApiError ? err.message : "Could not update candidate stage.");
    },
    onSuccess: (updated) => {
      announce(`Moved ${updated.candidate_name} to ${STAGE_LABELS[updated.stage]}.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-pipeline"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
    },
  });

  const canMove = user?.role === "organization_owner" || user?.role === "recruiter";

  const initiateMove = (app: ApplicationSummary, nextStage: ApplicationStage) => {
    if (app.stage === nextStage) return;
    if (nextStage === "hired" || nextStage === "rejected") {
      setDecisionReason("");
      setPendingDecision({ app, toStage: nextStage });
      return;
    }
    moveMutation.mutate({ applicationId: app.id, toStage: nextStage });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overStage = event.over?.id as ApplicationStage | undefined;
    const app = event.active.data.current?.app as ApplicationSummary | undefined;
    if (!overStage || !app || !APPLICATION_STAGES.includes(overStage)) return;
    initiateMove(app, overStage);
  };

  const confirmSensitiveMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDecision || decisionReason.trim().length < 5) return;
    moveMutation.mutate({
      applicationId: pendingDecision.app.id,
      toStage: pendingDecision.toStage,
      reason: decisionReason.trim(),
    });
    setPendingDecision(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Recruitment pipeline
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Drag candidates across stages or use each card&apos;s stage selector for keyboard navigation.
            Moving to Hired or Rejected requires a recorded human rationale.
          </p>
        </div>
        {!canMove && (
          <StatusTag tone="neutral">Read-only view ({user?.role.replace("_", " ")})</StatusTag>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1 max-w-sm">
          <label htmlFor="pipe-search" className="sr-only">Search candidates in pipeline</label>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          <Input
            id="pipe-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by candidate, role, or skill"
            className="pl-9"
          />
        </div>
        <div className="w-64">
          <label htmlFor="pipe-job" className="sr-only">Filter pipeline by job</label>
          <Select id="pipe-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">All job openings</option>
            {jobsQuery.data?.items.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </Select>
        </div>
        {boardQuery.data && (
          <span className="font-mono text-xs text-[var(--color-text-secondary)]">
            {boardQuery.data.total} active applications
          </span>
        )}
      </div>

      {errorBanner && (
        <div role="alert" className="rounded-[7px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]">
          {errorBanner}
        </div>
      )}

      {boardQuery.isLoading && <LoadingRegion label="Loading Kanban recruitment pipeline..." rows={5} />}

      {boardQuery.isError && (
        <StatePanel
          tone="error"
          title="Could not load pipeline board"
          description="Verify the backend service is running and try again."
          action={<Button variant="secondary" size="sm" onClick={() => void boardQuery.refetch()}>Retry</Button>}
        />
      )}

      {boardQuery.data && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3.5 overflow-x-auto pb-4">
            {APPLICATION_STAGES.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                items={boardQuery.data.columns[stage] || []}
                canMove={canMove}
                onSelectStage={initiateMove}
              />
            ))}
          </div>
        </DndContext>
      )}

      <NativeDialog
        open={Boolean(pendingDecision)}
        onClose={() => setPendingDecision(null)}
        title={
          pendingDecision
            ? `Confirm move to ${STAGE_LABELS[pendingDecision.toStage]}`
            : "Confirm stage change"
        }
        description="Final hiring decisions require an explicit human rationale stored in the audit log."
      >
        {pendingDecision && (
          <form onSubmit={confirmSensitiveMove} className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              You are moving <strong className="text-[var(--color-text)]">{pendingDecision.app.candidate_name}</strong>{" "}
              for <strong className="text-[var(--color-text)]">{pendingDecision.app.job_title}</strong> to{" "}
              <strong>{STAGE_LABELS[pendingDecision.toStage]}</strong>.
            </p>
            <div>
              <label htmlFor="decision-reason" className="block text-sm font-medium text-[var(--color-text)]">
                Human decision rationale (required)
              </label>
              <Textarea
                id="decision-reason"
                required
                minLength={5}
                autoFocus
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Summarize the interview consensus or qualification rationale..."
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingDecision(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={pendingDecision.toStage === "rejected" ? "danger" : "primary"}
                disabled={decisionReason.trim().length < 5}
              >
                Confirm {STAGE_LABELS[pendingDecision.toStage]}
              </Button>
            </div>
          </form>
        )}
      </NativeDialog>
    </div>
  );
}
