"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSearch,
  Lock,
  ShieldAlert,
  Upload,
} from "lucide-react";
import {
  STAGE_LABELS,
  type CandidateDetail,
  type CandidateDocument,
  type ResumeAnalysisRecord,
} from "@talentos/contracts";
import { Button, LoadingRegion, Select, StatePanel, StatusTag, Textarea } from "@talentos/ui";
import { ApiError, apiRequest, downloadAuthenticatedBlob } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatDateTime,
  formatFileSize,
  formatRelativeTime,
  formatShortDate,
  initialsFor,
  stageTone,
} from "@/lib/format";

type CandidateTab = "intelligence" | "overview" | "applications" | "notes" | "activity";

function formatProviderName(provider: string): string {
  if (provider === "deterministic_rules") return "built-in rule analyzer";
  return provider.replace(/_/g, " ");
}

export default function WorkspaceCandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = params.id;
  const queryClient = useQueryClient();
  const { user, announce } = useAuth();

  const [tab, setTab] = React.useState<CandidateTab>("intelligence");
  const [noteContent, setNoteContent] = React.useState("");
  const [selectedDocId, setSelectedDocId] = React.useState("");
  const [selectedAppId, setSelectedAppId] = React.useState("");
  const [uploadConsent, setUploadConsent] = React.useState(true);
  const [feedbackBanner, setFeedbackBanner] = React.useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState("");

  const { data: cand, isLoading, isError } = useQuery({
    queryKey: ["workspace-candidate", candidateId],
    queryFn: () => apiRequest<CandidateDetail>(`/candidates/${candidateId}`),
    enabled: Boolean(candidateId),
  });

  React.useEffect(() => {
    if (cand) {
      if (!selectedDocId && cand.documents[0]) setSelectedDocId(cand.documents[0].id);
      if (!selectedAppId && cand.applications[0]) setSelectedAppId(cand.applications[0].id);
    }
  }, [cand, selectedAppId, selectedDocId]);

  const noteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/candidates/${candidateId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: noteContent, application_id: selectedAppId || null }),
      }),
    onSuccess: () => {
      setNoteContent("");
      announce("Saved private internal note.");
      void queryClient.invalidateQueries({ queryKey: ["workspace-candidate", candidateId] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => {
      const targetApp = cand?.applications.find((a) => a.id === selectedAppId);
      return apiRequest<ResumeAnalysisRecord>("/resume-analyses", {
        method: "POST",
        body: JSON.stringify({
          document_id: selectedDocId,
          candidate_id: candidateId,
          application_id: targetApp?.id || null,
          job_id: targetApp?.job_id || null,
        }),
      });
    },
    onSuccess: (res) => {
      const modeText = res.analysis_mode === "rule_based" ? "rule-based" : "AI-assisted";
      setFeedbackBanner(
        `Completed ${modeText} qualification check using ${formatProviderName(res.provider_name)}. Review the evidence quotes below.`
      );
      announce("Resume analysis finished.");
      void queryClient.invalidateQueries({ queryKey: ["workspace-candidate", candidateId] });
    },
    onError: (err) => {
      setFeedbackBanner(err instanceof ApiError ? err.message : "Resume analysis failed.");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (analysisId: string) =>
      apiRequest<ResumeAnalysisRecord>(`/resume-analyses/${analysisId}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          human_reviewed: true,
          reviewer_notes: reviewNotes || "Verified extracted evidence against submitted document.",
        }),
      }),
    onSuccess: () => {
      setReviewNotes("");
      setFeedbackBanner("Human review verification recorded on this dossier.");
      announce("Analysis marked as human reviewed.");
      void queryClient.invalidateQueries({ queryKey: ["workspace-candidate", candidateId] });
    },
  });

  const handleUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setFeedbackBanner(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", "resume");
    formData.append("consent_granted", String(uploadConsent));
    formData.append("candidate_id", candidateId);
    try {
      const uploaded = await apiRequest<CandidateDocument>("/documents/upload", {
        method: "POST",
        body: formData,
      });
      setSelectedDocId(uploaded.id);
      setFeedbackBanner(`Uploaded ${uploaded.original_filename}. Ready for qualification review.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-candidate", candidateId] });
    } catch (err) {
      setFeedbackBanner(err instanceof ApiError ? err.message : "Upload failed.");
    }
  };

  if (isLoading) return <LoadingRegion label="Loading candidate dossier..." rows={6} />;
  if (isError || !cand) {
    return (
      <StatePanel
        tone="error"
        title="Candidate record not found"
        description="This candidate may belong to a different organization or could not be loaded."
        action={<Link href="/workspace/candidates"><Button variant="secondary" size="sm">Back to directory</Button></Link>}
      />
    );
  }

  const latestAnalysis = cand.analyses[0] || null;
  const canUpload = user?.role === "organization_owner" || user?.role === "recruiter";

  const tabs: Array<{ id: CandidateTab; label: string }> = [
    { id: "intelligence", label: `Resume insights (${cand.analyses.length})` },
    { id: "overview", label: "Profile and documents" },
    { id: "applications", label: `Applications (${cand.applications.length})` },
    { id: "notes", label: `Private notes (${cand.notes.length})` },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="space-y-6">
      {/* Digital Dossier Identity Header */}
      <header className="surface-solid rounded-[18px] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-accent-text)]"
            >
              {initialsFor(cand.full_name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                  {cand.full_name}
                </h1>
                {cand.applications[0] && (
                  <StatusTag tone={stageTone(cand.applications[0].stage)}>
                    {STAGE_LABELS[cand.applications[0].stage]}
                  </StatusTag>
                )}
              </div>
              {cand.headline && (
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{cand.headline}</p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                <span>{cand.email}</span>
                {cand.location && (
                  <>
                    <span>·</span>
                    <span>{cand.location}</span>
                  </>
                )}
                <span>·</span>
                <span className="tabular-nums">{cand.years_of_experience} years experience</span>
                <span>·</span>
                <span>Consent {cand.consent_resume_processing ? "recorded" : "not granted"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/workspace/interviews">
              <Button variant="secondary" size="sm">Schedule interview</Button>
            </Link>
            <Link href="/workspace/pipeline">
              <Button variant="primary" size="sm">Open in pipeline</Button>
            </Link>
          </div>
        </div>
      </header>

      {feedbackBanner && (
        <div
          role="status"
          className="rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-text)]"
        >
          {feedbackBanner}
        </div>
      )}

      {/* Segmented Dossier Navigation */}
      <div
        role="tablist"
        aria-label="Candidate dossier sections"
        className="surface-segment-track inline-flex max-w-full flex-wrap gap-1 rounded-[12px] p-1"
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={`relative min-h-9 rounded-[9px] px-3.5 text-xs font-medium transition-colors ${
                selected
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="dossier-tab-pill"
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[9px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,21,0.08)] ring-1 ring-[var(--color-border)]"
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Resume Insights */}
      {tab === "intelligence" && (
        <div className="space-y-5">
          {/* Compact analysis run bar */}
          <section className="surface-solid flex flex-col gap-4 rounded-[16px] p-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-md">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Qualification evidence check
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Compares submitted resume text directly against published role criteria. Unmentioned items stay marked
                Not found and are never auto-rejected.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2.5 xl:flex-nowrap">
              <div className="min-w-44">
                <label htmlFor="an-doc" className="block text-xs text-[var(--color-text-secondary)]">Document</label>
                <Select id="an-doc" value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} className="mt-1 min-h-9 text-xs">
                  {cand.documents.length === 0 && <option value="">No document uploaded</option>}
                  {cand.documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.original_filename}</option>
                  ))}
                </Select>
              </div>
              <div className="min-w-48">
                <label htmlFor="an-app" className="block text-xs text-[var(--color-text-secondary)]">Compare with role</label>
                <Select id="an-app" value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} className="mt-1 min-h-9 text-xs">
                  <option value="">General extraction only</option>
                  {cand.applications.map((app) => (
                    <option key={app.id} value={app.id}>{app.job_title}</option>
                  ))}
                </Select>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                disabled={!selectedDocId || analyzeMutation.isPending}
                onClick={() => analyzeMutation.mutate()}
              >
                <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze resume"}
              </Button>
            </div>
          </section>

          {!latestAnalysis ? (
            <StatePanel
              title="No resume analysis recorded yet"
              description="Select a submitted PDF or DOCX resume above to extract structured qualifications and verbatim evidence."
            />
          ) : (
            <div className="space-y-5">
              {latestAnalysis.prompt_injection_flags.length > 0 && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-[14px] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-4 text-sm text-[var(--color-warning)]"
                >
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Prompt-injection text detected and ignored</p>
                    <ul className="mt-1 list-disc pl-4 text-xs">
                      {latestAnalysis.prompt_injection_flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.95fr]">
                {/* Left Editorial Dossier Sheet (uncluttered, avoids nested cards) */}
                <article className="surface-solid divide-y divide-[var(--color-border)] rounded-[18px]">
                  {/* Metadata header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusTag tone={latestAnalysis.analysis_mode === "rule_based" ? "neutral" : "accent"}>
                        {latestAnalysis.analysis_mode === "rule_based"
                          ? "Rule-based review"
                          : `AI-assisted (${formatProviderName(latestAnalysis.provider_name)})`}
                      </StatusTag>
                      {latestAnalysis.human_reviewed ? (
                        <StatusTag tone="success">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Verified by {latestAnalysis.reviewed_by_name}
                        </StatusTag>
                      ) : (
                        <StatusTag tone="warning">Awaiting human review</StatusTag>
                      )}
                    </div>
                    <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                      {latestAnalysis.job_title ? `${latestAnalysis.job_title} · ` : ""}
                      {formatDateTime(latestAnalysis.created_at)}
                    </span>
                  </div>

                  {/* Extracted summary & skills */}
                  <section className="px-6 py-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      Extracted from submitted resume
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {latestAnalysis.structured_output.qualification_coverage_summary}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
                      {latestAnalysis.structured_output.professional_summary}
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Technical skills</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {latestAnalysis.structured_output.extracted_technical_skills.map((s) => (
                            <span
                              key={s}
                              className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Professional skills</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {latestAnalysis.structured_output.extracted_professional_skills.length > 0 ? (
                            latestAnalysis.structured_output.extracted_professional_skills.map((s) => (
                              <span
                                key={s}
                                className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-0.5 text-xs text-[var(--color-text)]"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--color-text-secondary)]">None explicitly listed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Required qualifications evidence */}
                  <section className="px-6 py-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      Required qualifications evidence
                    </h3>
                    <ul className="mt-3 divide-y divide-[var(--color-border)]">
                      {latestAnalysis.structured_output.required_qualifications_evidence.map((ev) => (
                        <li key={ev.criterion} className="py-3.5 first:pt-1 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-[var(--color-text)]">{ev.criterion}</p>
                            <StatusTag
                              tone={
                                ev.status === "evidence_found"
                                  ? "success"
                                  : ev.status === "ambiguous"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {ev.status === "evidence_found"
                                ? "Found"
                                : ev.status === "ambiguous"
                                ? "Verify"
                                : "Not found"}
                            </StatusTag>
                          </div>
                          {ev.evidence_excerpt && (
                            <blockquote className="mt-2 border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                              {ev.evidence_excerpt}
                            </blockquote>
                          )}
                          {ev.notes && (
                            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">{ev.notes}</p>
                          )}
                        </li>
                      ))}
                    </ul>

                    {latestAnalysis.structured_output.preferred_qualifications_evidence.length > 0 && (
                      <div className="mt-6 border-t border-[var(--color-border)] pt-5">
                        <h4 className="text-xs font-semibold text-[var(--color-text)]">
                          Preferred qualifications
                        </h4>
                        <ul className="mt-2.5 divide-y divide-[var(--color-border)]">
                          {latestAnalysis.structured_output.preferred_qualifications_evidence.map((ev) => (
                            <li key={ev.criterion} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                              <span className="text-[var(--color-text)]">{ev.criterion}</span>
                              <StatusTag tone={ev.status === "evidence_found" ? "success" : "neutral"}>
                                {ev.status === "evidence_found" ? "Found" : ev.status === "ambiguous" ? "Verify" : "Not found"}
                              </StatusTag>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                </article>

                {/* Right Column: Reviewer guidance, limitations, and human verification */}
                <div className="space-y-5">
                  <section className="surface-solid rounded-[16px] p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--color-text)]">
                        Suggested interview questions
                      </h3>
                      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                        Reviewer aid
                      </span>
                    </div>
                    <ol className="mt-3 list-decimal space-y-2.5 pl-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {latestAnalysis.structured_output.suggested_interview_questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  </section>

                  <section className="surface-solid divide-y divide-[var(--color-border)] rounded-[16px]">
                    {latestAnalysis.structured_output.uncertain_or_ambiguous.length > 0 && (
                      <div className="p-5">
                        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                          <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
                          Details to verify in conversation
                        </h3>
                        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {latestAnalysis.structured_output.uncertain_or_ambiguous.map((u) => (
                            <li key={u}>• {u}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-[var(--color-text)]">
                        Scope and limitations
                      </h3>
                      <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                        {latestAnalysis.structured_output.analysis_limitations.map((lim) => (
                          <li key={lim}>• {lim}</li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="surface-solid rounded-[16px] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      Human reviewer verification
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Confirm you inspected the source resume and log any corrections.
                    </p>
                    <Textarea
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Optional verification note or correction..."
                      className="mt-3"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate(latestAnalysis.id)}
                      >
                        {reviewMutation.isPending ? "Saving..." : "Mark as human reviewed"}
                      </Button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Profile and Documents */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <article className="surface-solid divide-y divide-[var(--color-border)] rounded-[18px]">
            <section className="p-6">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Professional summary</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {cand.professional_summary || "No summary provided."}
              </p>
            </section>
            <section className="p-6">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Experience history</h2>
              <div className="mt-4 space-y-5">
                {cand.work_experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-[var(--color-border-strong)] pl-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {exp.role} · {exp.company}
                      </p>
                      <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                        {exp.start_date} to {exp.end_date || "Present"}
                      </span>
                    </div>
                    {exp.highlights && (
                      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                        {exp.highlights.map((h) => <li key={h}>• {h}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="p-6">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Education</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {cand.education.map((ed, idx) => (
                  <li key={idx}>
                    <strong className="font-medium text-[var(--color-text)]">{ed.degree}</strong>, {ed.institution}{" "}
                    {ed.end_year ? `(${ed.end_year})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          </article>

          <aside className="space-y-5">
            <section className="surface-solid rounded-[16px] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Uploaded documents</h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Stored privately and served via expiring signed links.
              </p>
              <ul className="mt-3 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {cand.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-text)]">{doc.original_filename}</p>
                      <p className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                        {formatFileSize(doc.file_size_bytes)} · {formatShortDate(doc.created_at)}
                      </p>
                    </div>
                    {doc.signed_download_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void downloadAuthenticatedBlob(doc.signed_download_url!, doc.original_filename)}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Download
                      </Button>
                    )}
                  </li>
                ))}
              </ul>

              {canUpload && (
                <div className="mt-4 rounded-[12px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] p-4">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={uploadConsent}
                      onChange={(e) => setUploadConsent(e.target.checked)}
                    />
                    Candidate consent recorded for resume processing
                  </label>
                  <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--color-accent-text)]">
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Upload PDF or DOCX resume (max 5 MB)</span>
                    <input type="file" accept=".pdf,.docx" onChange={handleUpload} className="sr-only" />
                  </label>
                </div>
              )}
            </section>
          </aside>
        </div>
      )}

      {/* Tab: Applications and Interviews */}
      {tab === "applications" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="surface-solid rounded-[16px] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Applications</h2>
            <ul className="mt-3 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {cand.applications.map((app) => (
                <li key={app.id} className="py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/workspace/jobs/${app.job_id}`}
                      className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-accent)]"
                    >
                      {app.job_title}
                    </Link>
                    <StatusTag tone={stageTone(app.stage)}>{STAGE_LABELS[app.stage]}</StatusTag>
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-[var(--color-text-secondary)]">
                    Applied {formatShortDate(app.applied_at)} · Source: {app.source}
                  </p>
                  {app.decision_reason && (
                    <p className="mt-2 text-xs text-[var(--color-text)]">Rationale: {app.decision_reason}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-solid rounded-[16px] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Interview history</h2>
            {cand.interviews.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                No interviews scheduled for this candidate yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {cand.interviews.map((iv) => (
                  <li key={iv.id} className="py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">{iv.title}</p>
                      <StatusTag tone={iv.status === "completed" ? "success" : "accent"}>{iv.status}</StatusTag>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{iv.job_title}</p>
                    <p className="mt-1 text-xs tabular-nums text-[var(--color-text-secondary)]">
                      {formatDateTime(iv.scheduled_start)} · {iv.duration_minutes} min
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Tab: Private Notes */}
      {tab === "notes" && (
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2.5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-xs text-[var(--color-text-secondary)]">
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--color-text)]" aria-hidden="true" />
            <span>Private notes stay visible strictly to your hiring team and are never exposed to candidates.</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (noteContent.trim().length >= 2) noteMutation.mutate();
            }}
            className="surface-solid rounded-[16px] p-5"
          >
            <label htmlFor="recruiter-note-input" className="block text-xs font-medium text-[var(--color-text)]">
              Add private note
            </label>
            <Textarea
              id="recruiter-note-input"
              rows={3}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Record screening context, panel alignment, or follow-up questions..."
              className="mt-1.5"
            />
            <div className="mt-3 flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={noteMutation.isPending || noteContent.trim().length < 2}>
                {noteMutation.isPending ? "Saving..." : "Save note"}
              </Button>
            </div>
          </form>

          <ul className="space-y-3">
            {cand.notes.map((n) => (
              <li key={n.id} className="surface-solid rounded-[14px] p-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span className="font-medium text-[var(--color-text)]">{n.author_name}</span>
                  <span className="tabular-nums">{formatRelativeTime(n.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {n.content}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab: Activity Timeline */}
      {tab === "activity" && (
        <div className="surface-solid max-w-3xl rounded-[16px] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Activity history</h2>
          {cand.activity.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No activity recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {cand.activity.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-[var(--color-text)]">{ev.summary}</span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-secondary)]">
                    {formatRelativeTime(ev.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
