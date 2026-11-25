"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
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
  stageTone,
} from "@/lib/format";

type CandidateTab = "overview" | "intelligence" | "applications" | "notes" | "activity";

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
      setFeedbackBanner(
        `Completed ${res.analysis_mode.replace("_", " ")} analysis using ${res.provider_name}. Review each evidence quote below.`
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
      setFeedbackBanner("Human review verification recorded on this analysis.");
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
      setFeedbackBanner(`Uploaded ${uploaded.original_filename}. You can now run qualification analysis.`);
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/workspace/candidates"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to candidate directory
        </Link>

        <div className="mt-2 flex flex-col gap-4 rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
                {cand.full_name}
              </h1>
              {cand.applications[0] && (
                <StatusTag tone={stageTone(cand.applications[0].stage)}>
                  {STAGE_LABELS[cand.applications[0].stage]}
                </StatusTag>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{cand.headline}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[var(--color-text-secondary)]">
              <span>{cand.email}</span>
              {cand.location && <span>{cand.location}</span>}
              <span>{cand.years_of_experience} years experience</span>
              <span>
                Consent: {cand.consent_resume_processing ? "Recorded" : "Not granted"}
              </span>
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
      </div>

      {feedbackBanner && (
        <div
          role="status"
          className="rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-text)]"
        >
          {feedbackBanner}
        </div>
      )}

      <div role="tablist" aria-label="Candidate profile sections" className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        {(
          [
            { id: "intelligence", label: `Resume intelligence (${cand.analyses.length})` },
            { id: "overview", label: "Profile & documents" },
            { id: "applications", label: `Applications & interviews (${cand.applications.length})` },
            { id: "notes", label: `Internal notes (${cand.notes.length})` },
            { id: "activity", label: "Activity timeline" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-10 rounded-[7px] border px-3.5 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab: Resume Intelligence */}
      {tab === "intelligence" && (
        <div className="space-y-5">
          <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text)]">
                  Run evidence-based qualification check
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  Compares submitted document text directly against the selected job opening&apos;s
                  published criteria. Missing phrases are labeled Not found, never auto-rejected.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2.5">
                <div className="min-w-44">
                  <label htmlFor="an-doc" className="block text-xs text-[var(--color-text-secondary)]">Document</label>
                  <Select id="an-doc" value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} className="mt-1 min-h-10 text-xs">
                    {cand.documents.length === 0 && <option value="">No document uploaded</option>}
                    {cand.documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.original_filename}</option>
                    ))}
                  </Select>
                </div>
                <div className="min-w-48">
                  <label htmlFor="an-app" className="block text-xs text-[var(--color-text-secondary)]">Compare against role</label>
                  <Select id="an-app" value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} className="mt-1 min-h-10 text-xs">
                    <option value="">General extraction only</option>
                    {cand.applications.map((app) => (
                      <option key={app.id} value={app.id}>{app.job_title}</option>
                    ))}
                  </Select>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedDocId || analyzeMutation.isPending}
                  onClick={() => analyzeMutation.mutate()}
                >
                  <FileSearch className="h-4 w-4" aria-hidden="true" />
                  {analyzeMutation.isPending ? "Analyzing..." : "Analyze resume"}
                </Button>
              </div>
            </div>
          </section>

          {!latestAnalysis ? (
            <StatePanel
              title="No resume analysis recorded yet"
              description="Select a submitted PDF or DOCX document above to extract structured qualifications and verbatim evidence."
            />
          ) : (
            <div className="space-y-5">
              {/* Header & Mode Disclosure */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusTag tone={latestAnalysis.analysis_mode === "rule_based" ? "neutral" : "accent"}>
                    {latestAnalysis.analysis_mode === "rule_based"
                      ? "Rule-based deterministic analysis"
                      : `AI-assisted (${latestAnalysis.provider_name})`}
                  </StatusTag>
                  {latestAnalysis.human_reviewed ? (
                    <StatusTag tone="success">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified by {latestAnalysis.reviewed_by_name}
                    </StatusTag>
                  ) : (
                    <StatusTag tone="warning">Pending human review</StatusTag>
                  )}
                  {latestAnalysis.job_title && (
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      Target role: {latestAnalysis.job_title}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                  Ran {formatDateTime(latestAnalysis.created_at)}
                </span>
              </div>

              {latestAnalysis.prompt_injection_flags.length > 0 && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-[8px] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-4 text-sm text-[var(--color-warning)]"
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

              <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
                {/* Left: Extracted facts vs job criteria evidence */}
                <div className="space-y-5">
                  <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      Extracted from submitted document
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {latestAnalysis.structured_output.qualification_coverage_summary}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
                      {latestAnalysis.structured_output.professional_summary}
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Technical skills extracted</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {latestAnalysis.structured_output.extracted_technical_skills.map((s) => (
                            <span key={s} className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-0.5 font-mono text-xs">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Professional skills extracted</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {latestAnalysis.structured_output.extracted_professional_skills.length > 0 ? (
                            latestAnalysis.structured_output.extracted_professional_skills.map((s) => (
                              <span key={s} className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-0.5 text-xs">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--color-text-secondary)]">None explicitly named</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      Required qualifications evidence
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {latestAnalysis.structured_output.required_qualifications_evidence.map((ev) => (
                        <li
                          key={ev.criterion}
                          className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5"
                        >
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
                                ? "Evidence found"
                                : ev.status === "ambiguous"
                                ? "Ambiguous"
                                : "Not found"}
                            </StatusTag>
                          </div>
                          {ev.evidence_excerpt && (
                            <blockquote className="mt-2 border-l-2 border-[var(--color-accent)] pl-3 text-xs text-[var(--color-text)]">
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
                      <>
                        <h4 className="mt-5 text-xs font-semibold text-[var(--color-text)]">
                          Preferred qualifications evidence
                        </h4>
                        <ul className="mt-2 space-y-2">
                          {latestAnalysis.structured_output.preferred_qualifications_evidence.map((ev) => (
                            <li
                              key={ev.criterion}
                              className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs"
                            >
                              <span className="text-[var(--color-text)]">{ev.criterion}</span>
                              <StatusTag tone={ev.status === "evidence_found" ? "success" : "neutral"}>
                                {ev.status === "evidence_found" ? "Found" : ev.status === "ambiguous" ? "Verify" : "Not found"}
                              </StatusTag>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </section>
                </div>

                {/* Right: Suggestions, limitations, and human review sign-off */}
                <div className="space-y-5">
                  <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--color-text)]">
                        Suggested interview questions
                      </h3>
                      <StatusTag tone="neutral">Suggestion</StatusTag>
                    </div>
                    <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-[var(--color-text-secondary)]">
                      {latestAnalysis.structured_output.suggested_interview_questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  </section>

                  {latestAnalysis.structured_output.uncertain_or_ambiguous.length > 0 && (
                    <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                        <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
                        Uncertain or ambiguous details
                      </h3>
                      <ul className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                        {latestAnalysis.structured_output.uncertain_or_ambiguous.map((u) => (
                          <li key={u}>• {u}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      Analysis limitations
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                      {latestAnalysis.structured_output.analysis_limitations.map((lim) => (
                        <li key={lim}>• {lim}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-[8px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      Human reviewer verification
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Confirm you have inspected the source resume and log any corrections.
                    </p>
                    <Textarea
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Optional reviewer note or skill correction..."
                      className="mt-3"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate(latestAnalysis.id)}
                      >
                        {reviewMutation.isPending ? "Saving review..." : "Mark as human reviewed"}
                      </Button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Profile & Documents */}
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Professional summary</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {cand.professional_summary || "No summary provided."}
              </p>
            </section>
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Work experience</h2>
              <div className="mt-2 space-y-3">
                {cand.work_experience.map((exp, idx) => (
                  <div key={idx} className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5">
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {exp.role} · {exp.company}
                    </p>
                    <p className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {exp.start_date} to {exp.end_date || "Present"}
                    </p>
                    {exp.highlights && (
                      <ul className="mt-2 space-y-1 text-xs text-[var(--color-text-secondary)]">
                        {exp.highlights.map((h) => <li key={h}>• {h}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Education</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                {cand.education.map((ed, idx) => (
                  <li key={idx}>
                    <strong className="font-medium text-[var(--color-text)]">{ed.degree}</strong>, {ed.institution}{" "}
                    {ed.end_year ? `(${ed.end_year})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Uploaded documents</h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Stored privately and served through expiring signed download links.
              </p>
              <ul className="mt-3 divide-y divide-[var(--color-border)]">
                {cand.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-text)]">{doc.original_filename}</p>
                      <p className="font-mono text-xs text-[var(--color-text-secondary)]">
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
                <div className="mt-4 rounded-[7px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-canvas)] p-3.5">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={uploadConsent}
                      onChange={(e) => setUploadConsent(e.target.checked)}
                    />
                    Candidate consent recorded for resume processing
                  </label>
                  <label className="mt-2.5 inline-flex items-center gap-2 text-xs font-medium text-[var(--color-accent-text)]">
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Upload PDF or DOCX resume (max 5 MB)</span>
                    <input type="file" accept=".pdf,.docx" onChange={handleUpload} className="sr-only" />
                  </label>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Tab: Applications & Interviews */}
      {tab === "applications" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Applications</h2>
            <ul className="mt-3 space-y-3">
              {cand.applications.map((app) => (
                <li key={app.id} className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/workspace/jobs/${app.job_id}`} className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-accent)]">
                      {app.job_title}
                    </Link>
                    <StatusTag tone={stageTone(app.stage)}>{STAGE_LABELS[app.stage]}</StatusTag>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
                    Applied {formatShortDate(app.applied_at)} · Source: {app.source}
                  </p>
                  {app.decision_reason && (
                    <p className="mt-2 text-xs text-[var(--color-text)]">Decision rationale: {app.decision_reason}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Interview history</h2>
            {cand.interviews.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No interviews scheduled for this candidate yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {cand.interviews.map((iv) => (
                  <li key={iv.id} className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">{iv.title}</p>
                      <StatusTag tone={iv.status === "completed" ? "success" : "accent"}>{iv.status}</StatusTag>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{iv.job_title}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
                      {formatDateTime(iv.scheduled_start)} ({iv.duration_minutes} min)
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Tab: Private Internal Recruiter Notes */}
      {tab === "notes" && (
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-xs text-[var(--color-text-secondary)]">
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--color-text)]" aria-hidden="true" />
            <span>Internal notes are visible strictly to authorized members of your organization and are never exposed to candidates.</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (noteContent.trim().length >= 2) noteMutation.mutate();
            }}
            className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <label htmlFor="recruiter-note-input" className="block text-xs font-medium text-[var(--color-text)]">
              Add internal hiring note
            </label>
            <Textarea
              id="recruiter-note-input"
              rows={3}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Record screening context, team alignment, or follow-up questions..."
              className="mt-1.5"
            />
            <div className="mt-3 flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={noteMutation.isPending || noteContent.trim().length < 2}>
                {noteMutation.isPending ? "Saving..." : "Save private note"}
              </Button>
            </div>
          </form>

          <ul className="space-y-3">
            {cand.notes.map((n) => (
              <li key={n.id} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span className="font-medium text-[var(--color-text)]">{n.author_name}</span>
                  <span className="font-mono">{formatRelativeTime(n.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-text-secondary)]">{n.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab: Activity Timeline */}
      {tab === "activity" && (
        <div className="max-w-3xl rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Audit timeline</h2>
          {cand.activity.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No activity recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-border)]">
              {cand.activity.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-[var(--color-text)]">{ev.summary}</span>
                  <span className="shrink-0 font-mono text-xs text-[var(--color-text-secondary)]">
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
