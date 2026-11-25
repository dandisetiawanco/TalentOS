"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { jobFormSchema, type JobRecord, type TeamMember } from "@talentos/contracts";
import { Button, Input, Select, Textarea } from "@talentos/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type JobFormInput = {
  title: string;
  department: string;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  work_arrangement: "remote" | "hybrid" | "onsite";
  location: string;
  salary_min?: number | "";
  salary_max?: number | "";
  salary_currency: string;
  description: string;
  responsibilities_text: string;
  required_qualifications_text: string;
  preferred_qualifications_text: string;
  required_skills_text: string;
  status: "draft" | "published" | "paused" | "closed";
  openings_count: number;
  application_deadline?: string;
};

function splitLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export default function NewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { announce } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [hiringManagerId, setHiringManagerId] = React.useState("");

  const teamQuery = useQuery({
    queryKey: ["workspace-team"],
    queryFn: () => apiRequest<TeamMember[]>("/team"),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobFormInput>({
    resolver: zodResolver(jobFormSchema) as never,
    defaultValues: {
      employment_type: "full_time",
      work_arrangement: "hybrid",
      salary_currency: "USD",
      status: "draft",
      openings_count: 1,
      responsibilities_text: "",
      required_qualifications_text: "",
      preferred_qualifications_text: "",
      required_skills_text: "",
    },
  });

  const submitJob = async (values: JobFormInput) => {
    setServerError(null);
    try {
      const created = await apiRequest<JobRecord>("/jobs", {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          department: values.department,
          employment_type: values.employment_type,
          work_arrangement: values.work_arrangement,
          location: values.location,
          salary_min: values.salary_min === "" ? null : Number(values.salary_min),
          salary_max: values.salary_max === "" ? null : Number(values.salary_max),
          salary_currency: values.salary_currency,
          description: values.description,
          responsibilities: splitLines(values.responsibilities_text),
          required_qualifications: splitLines(values.required_qualifications_text),
          preferred_qualifications: splitLines(values.preferred_qualifications_text),
          required_skills: values.required_skills_text
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          status: values.status,
          openings_count: Number(values.openings_count) || 1,
          application_deadline: values.application_deadline
            ? new Date(`${values.application_deadline}T23:59:59Z`).toISOString()
            : null,
          hiring_manager_id: hiringManagerId || null,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["workspace-jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["public-jobs"] });
      announce(`Saved job opening ${created.title}.`);
      router.push(`/workspace/jobs/${created.id}`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Failed to save job opening.");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/workspace/jobs"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to job openings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
          Create job opening
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Define clear required qualifications and skills. Resume evidence checks evaluate candidate
          documents directly against the criteria you specify here.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-[8px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]"
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(submitJob)}
        noValidate
        className="space-y-5 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="job-title" className="block text-sm font-medium text-[var(--color-text)]">
              Job title
            </label>
            <Input
              id="job-title"
              placeholder="e.g. Senior Backend Engineer"
              hasError={Boolean(errors.title)}
              className="mt-1.5"
              {...register("title")}
            />
            {errors.title && <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="job-dept" className="block text-sm font-medium text-[var(--color-text)]">
              Department
            </label>
            <Input
              id="job-dept"
              placeholder="e.g. Engineering, Design, Product"
              hasError={Boolean(errors.department)}
              className="mt-1.5"
              {...register("department")}
            />
            {errors.department && <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">{errors.department.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="job-type" className="block text-sm font-medium text-[var(--color-text)]">
              Employment type
            </label>
            <Select id="job-type" className="mt-1.5" {...register("employment_type")}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </Select>
          </div>
          <div>
            <label htmlFor="job-work" className="block text-sm font-medium text-[var(--color-text)]">
              Workplace arrangement
            </label>
            <Select id="job-work" className="mt-1.5" {...register("work_arrangement")}>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </Select>
          </div>
          <div>
            <label htmlFor="job-location" className="block text-sm font-medium text-[var(--color-text)]">
              Location
            </label>
            <Input
              id="job-location"
              placeholder="e.g. Jakarta / Remote APAC"
              hasError={Boolean(errors.location)}
              className="mt-1.5"
              {...register("location")}
            />
            {errors.location && <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">{errors.location.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="job-sal-min" className="block text-sm font-medium text-[var(--color-text)]">
              Salary min
            </label>
            <Input id="job-sal-min" type="number" min={0} placeholder="100000" className="mt-1.5" {...register("salary_min")} />
          </div>
          <div>
            <label htmlFor="job-sal-max" className="block text-sm font-medium text-[var(--color-text)]">
              Salary max
            </label>
            <Input id="job-sal-max" type="number" min={0} placeholder="135000" hasError={Boolean(errors.salary_max)} className="mt-1.5" {...register("salary_max")} />
            {errors.salary_max && <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">{errors.salary_max.message}</p>}
          </div>
          <div>
            <label htmlFor="job-curr" className="block text-sm font-medium text-[var(--color-text)]">
              Currency
            </label>
            <Input id="job-curr" className="mt-1.5" {...register("salary_currency")} />
          </div>
          <div>
            <label htmlFor="job-openings" className="block text-sm font-medium text-[var(--color-text)]">
              Open seats
            </label>
            <Input id="job-openings" type="number" min={1} max={100} className="mt-1.5" {...register("openings_count")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="job-deadline" className="block text-sm font-medium text-[var(--color-text)]">
              Application deadline
            </label>
            <Input id="job-deadline" type="date" className="mt-1.5" {...register("application_deadline")} />
          </div>
          <div>
            <label htmlFor="job-hm" className="block text-sm font-medium text-[var(--color-text)]">
              Hiring manager
            </label>
            <Select
              id="job-hm"
              value={hiringManagerId}
              onChange={(e) => setHiringManagerId(e.target.value)}
              className="mt-1.5"
            >
              <option value="">Unassigned</option>
              {(teamQuery.data || []).map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name} ({member.role.replace("_", " ")})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="job-desc" className="block text-sm font-medium text-[var(--color-text)]">
            Job description
          </label>
          <Textarea
            id="job-desc"
            rows={4}
            placeholder="Describe the team mission, scope of work, and day-to-day expectations..."
            hasError={Boolean(errors.description)}
            className="mt-1.5"
            {...register("description")}
          />
          {errors.description && <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">{errors.description.message}</p>}
        </div>

        <div>
          <label htmlFor="job-resp" className="block text-sm font-medium text-[var(--color-text)]">
            Responsibilities (one per line)
          </label>
          <Textarea
            id="job-resp"
            rows={3}
            placeholder="Build resilient Python REST APIs&#10;Collaborate on database migrations and testing"
            className="mt-1.5"
            {...register("responsibilities_text")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="job-req" className="block text-sm font-medium text-[var(--color-text)]">
              Required qualifications (one per line)
            </label>
            <Textarea
              id="job-req"
              rows={4}
              placeholder="5+ years Python and FastAPI experience&#10;PostgreSQL schema design and indexing"
              className="mt-1.5"
              {...register("required_qualifications_text")}
            />
          </div>
          <div>
            <label htmlFor="job-pref" className="block text-sm font-medium text-[var(--color-text)]">
              Preferred qualifications (one per line)
            </label>
            <Textarea
              id="job-pref"
              rows={4}
              placeholder="Experience with Docker and CI/CD&#10;Document parsing pipelines"
              className="mt-1.5"
              {...register("preferred_qualifications_text")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="job-skills" className="block text-sm font-medium text-[var(--color-text)]">
            Required skills (comma-separated)
          </label>
          <Input
            id="job-skills"
            placeholder="Python, FastAPI, PostgreSQL, SQLAlchemy, Pytest"
            className="mt-1.5"
            {...register("required_skills_text")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-5">
          <Link href="/workspace/jobs">
            <Button variant="ghost">Cancel</Button>
          </Link>
          <Button
            type="submit"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => setValue("status", "draft")}
          >
            Save as draft
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => setValue("status", "published")}
          >
            Publish job
          </Button>
        </div>
      </form>
    </div>
  );
}
