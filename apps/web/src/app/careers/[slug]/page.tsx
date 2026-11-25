"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileText, MapPin, Upload } from "lucide-react";
import type { CandidateDocument, JobRecord } from "@talentos/contracts";
import { EMPLOYMENT_TYPE_LABELS, WORK_ARRANGEMENT_LABELS } from "@talentos/contracts";
import { Button, Input, LoadingRegion, StatePanel, StatusTag, Textarea } from "@talentos/ui";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSalaryRange, formatShortDate } from "@/lib/format";

export default function PublicJobDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user, announce } = useAuth();

  const { data: job, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-job", slug],
    queryFn: () => apiRequest<JobRecord>(`/public/jobs/${slug}`),
    enabled: Boolean(slug),
  });

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [yearsExp, setYearsExp] = React.useState("3");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [coverNote, setCoverNote] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [resumeDocId, setResumeDocId] = React.useState<string | null>(null);
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<{
    application_id: string;
    job_title: string;
    organization_name: string;
    submitted_at: string;
  } | null>(null);

  React.useEffect(() => {
    if (user?.account_type === "candidate") {
      setFullName((prev) => prev || user.full_name);
      setEmail((prev) => prev || user.email);
    }
  }, [user]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!consent) {
      setFormError("Confirm resume processing consent before uploading a file.");
      return;
    }
    setFormError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", "resume");
      formData.append("consent_granted", "true");
      const doc = await apiRequest<CandidateDocument>("/documents/upload", {
        method: "POST",
        body: formData,
      });
      setResumeDocId(doc.id);
      setUploadedName(doc.original_filename);
      announce(`Uploaded resume ${doc.original_filename}.`);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Sign in as a candidate to attach a resume file directly, or submit without a file."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!consent) {
      setFormError("Please confirm consent for application and document processing.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        application_id: string;
        job_title: string;
        organization_name: string;
        submitted_at: string;
      }>(`/public/jobs/${slug}/apply`, {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || null,
          location: location || null,
          years_of_experience: Number(yearsExp) || 0,
          linkedin_url: linkedinUrl || null,
          cover_note: coverNote || null,
          resume_document_id: resumeDocId,
          consent_resume_processing: consent,
        }),
      });
      setConfirmation(res);
      announce(`Application submitted for ${res.job_title}.`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="mx-auto max-w-[1160px] px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/careers"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to open positions</span>
          </Link>

          {isLoading && <LoadingRegion label="Loading role specification..." rows={6} />}

          {isError && (
            <StatePanel
              tone="error"
              title="Role not found or unavailable"
              description="This opening may have been closed or the API service is offline."
              action={
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  Retry
                </Button>
              }
            />
          )}

          {job && (
            <div className="mt-4 grid gap-10 lg:grid-cols-[1.35fr_0.95fr]">
              <article>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusTag tone="neutral">{job.department}</StatusTag>
                  <StatusTag tone="accent">
                    {WORK_ARRANGEMENT_LABELS[job.work_arrangement] || job.work_arrangement}
                  </StatusTag>
                  {job.is_demo && <StatusTag tone="warning">Demonstration listing</StatusTag>}
                </div>

                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                  {job.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[var(--color-text-secondary)]">
                  <span>{job.organization_name}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {job.location}
                  </span>
                  <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}</span>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-[var(--color-text-secondary)]">Compensation range</dt>
                    <dd className="mt-1 font-mono text-sm font-medium text-[var(--color-text)]">
                      {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-text-secondary)]">Open seats</dt>
                    <dd className="mt-1 font-mono text-sm font-medium text-[var(--color-text)]">
                      {job.openings_count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-text-secondary)]">Closing date</dt>
                    <dd className="mt-1 font-mono text-sm font-medium text-[var(--color-text)]">
                      {formatShortDate(job.application_deadline)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-8 space-y-7 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  <section>
                    <h2 className="text-base font-semibold text-[var(--color-text)]">About the role</h2>
                    <p className="mt-2 whitespace-pre-line">{job.description}</p>
                  </section>

                  {job.responsibilities.length > 0 && (
                    <section>
                      <h2 className="text-base font-semibold text-[var(--color-text)]">Responsibilities</h2>
                      <ul className="mt-2.5 space-y-2">
                        {job.responsibilities.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {job.required_qualifications.length > 0 && (
                    <section>
                      <h2 className="text-base font-semibold text-[var(--color-text)]">Required qualifications</h2>
                      <ul className="mt-2.5 space-y-2">
                        {job.required_qualifications.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text)]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {job.preferred_qualifications.length > 0 && (
                    <section>
                      <h2 className="text-base font-semibold text-[var(--color-text)]">Preferred qualifications</h2>
                      <ul className="mt-2.5 space-y-2">
                        {job.preferred_qualifications.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-secondary)]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {job.required_skills.length > 0 && (
                    <section>
                      <h2 className="text-base font-semibold text-[var(--color-text)]">Key skills</h2>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {job.required_skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-xs text-[var(--color-text)]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </article>

              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6">
                  {confirmation ? (
                    <div role="status" className="space-y-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[7px] bg-[var(--color-accent-soft)] text-[var(--color-success)]">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h2 className="text-lg font-semibold text-[var(--color-text)]">
                        Application received
                      </h2>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Your application for <strong className="text-[var(--color-text)]">{confirmation.job_title}</strong> at{" "}
                        {confirmation.organization_name} has been recorded.
                      </p>
                      <p className="font-mono text-xs text-[var(--color-text-secondary)]">
                        Reference ID: {confirmation.application_id.slice(0, 8)}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {user?.account_type === "candidate" ? (
                          <Link href="/candidate/applications">
                            <Button variant="primary" size="sm">Track in candidate portal</Button>
                          </Link>
                        ) : (
                          <Link href="/register">
                            <Button variant="primary" size="sm">Create candidate account</Button>
                          </Link>
                        )}
                        <Link href="/careers">
                          <Button variant="secondary" size="sm">Browse more roles</Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-[var(--color-text)]">Apply for this role</h2>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Duplicate applications with the same email for this opening are prevented automatically.
                      </p>

                      {formError && (
                        <div
                          role="alert"
                          className="mt-4 rounded-[6px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-3 py-2.5 text-xs text-[var(--color-error)]"
                        >
                          {formError}
                        </div>
                      )}

                      <form onSubmit={handleApply} className="mt-5 space-y-3.5">
                        <div>
                          <label htmlFor="app-name" className="block text-xs font-medium text-[var(--color-text)]">
                            Full name
                          </label>
                          <Input
                            id="app-name"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your name"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <label htmlFor="app-email" className="block text-xs font-medium text-[var(--color-text)]">
                            Email address
                          </label>
                          <Input
                            id="app-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="app-location" className="block text-xs font-medium text-[var(--color-text)]">
                              Location
                            </label>
                            <Input
                              id="app-location"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="City, Country"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label htmlFor="app-years" className="block text-xs font-medium text-[var(--color-text)]">
                              Years experience
                            </label>
                            <Input
                              id="app-years"
                              type="number"
                              min={0}
                              max={60}
                              value={yearsExp}
                              onChange={(e) => setYearsExp(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="app-phone" className="block text-xs font-medium text-[var(--color-text)]">
                            Phone (optional)
                          </label>
                          <Input
                            id="app-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+62 ..."
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <label htmlFor="app-linkedin" className="block text-xs font-medium text-[var(--color-text)]">
                            Portfolio or LinkedIn URL (optional)
                          </label>
                          <Input
                            id="app-linkedin"
                            type="url"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            placeholder="https://"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <label htmlFor="app-note" className="block text-xs font-medium text-[var(--color-text)]">
                            Short note to the hiring team
                          </label>
                          <Textarea
                            id="app-note"
                            rows={3}
                            value={coverNote}
                            onChange={(e) => setCoverNote(e.target.value)}
                            placeholder="Highlight relevant experience for this role..."
                            className="mt-1"
                          />
                        </div>

                        <label className="flex items-start gap-2.5 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs text-[var(--color-text-secondary)]">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded"
                          />
                          <span>
                            I consent to processing my application and any uploaded resume for
                            evidence-based qualification review. Hiring decisions remain human-led.
                          </span>
                        </label>

                        {user?.account_type === "candidate" && (
                          <div className="rounded-[7px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-canvas)] p-3">
                            <label htmlFor="app-resume" className="flex items-center justify-between text-xs font-medium text-[var(--color-text)]">
                              <span className="inline-flex items-center gap-1.5">
                                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                                Attach resume (PDF or DOCX, max 5 MB)
                              </span>
                              {uploading && <span className="font-mono text-[11px]">Uploading...</span>}
                            </label>
                            <input
                              id="app-resume"
                              type="file"
                              accept=".pdf,.docx"
                              onChange={handleResumeUpload}
                              className="mt-2 block w-full text-xs text-[var(--color-text-secondary)]"
                            />
                            {uploadedName && (
                              <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-success)]">
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                Attached: {uploadedName}
                              </p>
                            )}
                          </div>
                        )}

                        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                          {submitting ? "Submitting application..." : "Submit application"}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
