"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
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

const STAGE_DOT_STYLES: Record<ApplicationStage, string> = {
  applied: "bg-[var(--color-text-secondary)]",
  screening: "bg-[var(--color-info)]",
  shortlisted: "bg-[var(--color-accent)]",
  interview: "bg-[var(--color-accent)]",
  offer: "bg-[var(--color-warning)]",
  hired: "bg-[var(--color-success)]",
  rejected: "bg-[var(--color-error)]",
};

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
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`surface-solid rounded-[12px] p-3.5 transition-[box-shadow,border-color] duration-150 ${
        isDragging
          ? "shadow-[0_14px_32px_-12px_rgba(15,23,21,0.28)] ring-2 ring-[var(--color-accent)]"
          : "hover:border-[var(--color-border-strong)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/workspace/candidates/${app.candidate_id}`}
          className="text-sm font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]"
        >
          {app.candidate_name}
        </Link>
        {canMove && (
          <button
            type="button"
            aria-label={`Drag ${app.candidate_name} to another stage`}
            className="inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-[7px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)] active:cursor-grabbing"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{app.job_title}</p>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px] tabular-nums text-[var(--color-text-secondary)]">
        <span>{app.candidate_years_experience} yrs exp</span>
        {app.evidence_found_count != null && app.required_total_count != null && (
          <span className="font-medium text-[var(--color-accent-text)]">
            {app.evidence_found_count} of {app.required_total_count} criteria
          </span>
        )}
        <span>{formatRelativeTime(app.last_activity_at)}</span>
      </div>

      {canMove && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-2.5">
          <label htmlFor={`stage-select-${app.id}`} className="sr-only">
            Move {app.candidate_name} to stage
          </label>
          <select
            id={`stage-select-${app.id}`}
            value={app.stage}
            onChange={(e) => onSelectStage(app, e.target.value as ApplicationStage)}
            className="min-h-8 w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 text-xs text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
          >
            {APPLICATION_STAGES.map((st) => (
              <option key={st} value={st}>
                {STAGE_LABELS[st]}
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
      className={`flex min-h-[440px] w-[274px] shrink-0 flex-col rounded-[16px] border p-3 transition-[border-color,background-color] duration-150 ${
        isOver
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/55"
          : "border-[var(--color-border)] bg-[var(--color-surface-subtle)]"
      }`}
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${STAGE_DOT_STYLES[stage]}`}
          />
          <h2 className="text-xs font-semibold text-[var(--color-text)]">{STAGE_LABELS[stage]}</h2>
        </div>
        <span className="text-xs font-medium tabular-nums text-[var(--color-text-secondary)]">
          {items.length}
        </span>
      </div>
      <div className="flex-1 space-y-2.5">
        {items.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-[11px] border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            No candidates
          </div>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            Hiring pipeline
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Drag candidates across stages or select a stage directly. Hired and Rejected moves require a human rationale.
          </p>
        </div>
        {!canMove && (
          <StatusTag tone="neutral">Read-only access ({user?.role.replace("_", " ")})</StatusTag>
        )}
      </div>

      <div className="surface-solid flex flex-wrap items-center gap-3 rounded-[14px] p-3">
        <div className="relative min-w-56 flex-1 max-w-sm">
          <label htmlFor="pipe-search" className="sr-only">Search candidates in pipeline</label>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          <Input
            id="pipe-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by candidate, role, or skill"
            className="pl-9"
          />
        </div>
        <div className="w-60">
          <label htmlFor="pipe-job" className="sr-only">Filter pipeline by job</label>
          <Select id="pipe-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">All job openings</option>
            {jobsQuery.data?.items.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </Select>
        </div>
        {boardQuery.data && (
          <span className="ml-auto text-xs font-medium tabular-nums text-[var(--color-text-secondary)]">
            {boardQuery.data.total} active applications
          </span>
        )}
      </div>

      {errorBanner && (
        <div role="alert" className="rounded-[12px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]">
          {errorBanner}
        </div>
      )}

      {boardQuery.isLoading && <LoadingRegion label="Loading hiring pipeline..." rows={5} />}

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
            ? `Move to ${STAGE_LABELS[pendingDecision.toStage]}`
            : "Confirm stage change"
        }
        description="Final hiring decisions require a human rationale saved in the audit log."
      >
        {pendingDecision && (
          <form onSubmit={confirmSensitiveMove} className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Moving <strong className="text-[var(--color-text)]">{pendingDecision.app.candidate_name}</strong> for{" "}
              <strong className="text-[var(--color-text)]">{pendingDecision.app.job_title}</strong> to{" "}
              <strong className="text-[var(--color-text)]">{STAGE_LABELS[pendingDecision.toStage]}</strong>.
            </p>
            <div>
              <label htmlFor="decision-reason" className="block text-sm font-medium text-[var(--color-text)]">
                Decision rationale
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
