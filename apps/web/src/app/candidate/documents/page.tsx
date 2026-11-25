"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, Upload } from "lucide-react";
import type { CandidateDocument } from "@talentos/contracts";
import { Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { ApiError, apiRequest, downloadAuthenticatedBlob } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatFileSize, formatShortDate } from "@/lib/format";

export default function CandidateDocumentsPage() {
  const queryClient = useQueryClient();
  const { announce } = useAuth();
  const [consent, setConsent] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const docsQuery = useQuery({
    queryKey: ["candidate-documents"],
    queryFn: () => apiRequest<CandidateDocument[]>("/candidate/documents"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setMessage("Document removed from your private vault.");
      announce("Deleted document.");
      void queryClient.invalidateQueries({ queryKey: ["candidate-documents"] });
    },
    onError: (err) => {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not delete document.");
    },
  });

  const handleUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setMessage(null);
    if (!consent) {
      setErrorMsg("Confirm document processing consent before uploading.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", "resume");
      fd.append("consent_granted", "true");
      const created = await apiRequest<CandidateDocument>("/documents/upload", {
        method: "POST",
        body: fd,
      });
      setMessage(`Uploaded ${created.original_filename} securely.`);
      announce(`Uploaded ${created.original_filename}.`);
      void queryClient.invalidateQueries({ queryKey: ["candidate-documents"] });
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      ev.target.value = "";
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Documents and resumes
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          Upload PDF or DOCX resumes up to 5 MB. Files are validated and stored privately with expiring signed links.
        </p>
      </div>

      {message && (
        <div role="status" className="rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-text)]">
          {message}
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="rounded-[12px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]">
          {errorMsg}
        </div>
      )}

      <section className="surface-solid rounded-[18px] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Upload a new resume</h2>
        <label className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            I consent to TalentOS extracting text from this document so hiring teams I apply to can inspect
            qualification evidence. Decisions always stay human-led.
          </span>
        </label>
        <div className="mt-4">
          <label className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-ink)] shadow-[0_1px_2px_rgba(15,23,21,0.12)] transition-colors hover:bg-[var(--color-accent-hover)]">
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{uploading ? "Validating and uploading..." : "Choose PDF or DOCX file"}</span>
            <input type="file" accept=".pdf,.docx" disabled={uploading} onChange={handleUpload} className="sr-only" />
          </label>
        </div>
      </section>

      {docsQuery.isLoading && <LoadingRegion label="Loading your documents..." rows={3} />}
      {docsQuery.data && docsQuery.data.length === 0 && (
        <StatePanel
          title="No resumes uploaded yet"
          description="Upload a PDF or DOCX resume above so you can attach it when applying for roles."
        />
      )}

      {docsQuery.data && docsQuery.data.length > 0 && (
        <ul className="surface-solid divide-y divide-[var(--color-border)] overflow-hidden rounded-[16px]">
          {docsQuery.data.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">{doc.original_filename}</p>
                  {doc.is_demo && <StatusTag tone="neutral">Demo file</StatusTag>}
                </div>
                <p className="mt-0.5 text-xs tabular-nums text-[var(--color-text-secondary)]">
                  {formatFileSize(doc.file_size_bytes)} · Uploaded {formatShortDate(doc.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${doc.original_filename}`}
                  onClick={() => deleteMutation.mutate(doc.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-[var(--color-error)]" aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
