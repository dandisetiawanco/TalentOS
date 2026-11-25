"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ShieldCheck, UserCheck, Users } from "lucide-react";
import { Button } from "@talentos/ui";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

const DEMO_ROLES = [
  {
    id: "recruiter" as const,
    title: "Recruiter workspace",
    persona: "Rafi Pratama · Lead Technical Recruiter",
    icon: Briefcase,
    destination: "/workspace",
    description:
      "Full recruitment operations across 8 synthetic roles, 40 candidates, a 7-stage pipeline, rule-based resume review, interview scheduling, and analytics exports.",
    permissions: [
      "Create, edit, and publish job openings",
      "Move candidates across pipeline stages with rationale",
      "Inspect resume evidence checks and record human reviews",
      "Schedule interviews with conflict checks and ICS export",
    ],
  },
  {
    id: "hiring_manager" as const,
    title: "Hiring manager workspace",
    persona: "Daniel Kowalski · Director of Engineering",
    icon: Users,
    destination: "/workspace",
    description:
      "Focused reviewer perspective to inspect assigned candidates, review resume evidence, leave private hiring notes, and submit structured interview feedback.",
    permissions: [
      "Review candidate dossiers, resumes, and private notes",
      "Submit structured interview feedback rubrics",
      "Inspect pipeline progress and department analytics",
      "Restricted from organization settings or team role edits",
    ],
  },
  {
    id: "candidate" as const,
    title: "Candidate portal",
    persona: "Nadia Kusuma · Staff Frontend Applicant",
    icon: UserCheck,
    destination: "/candidate",
    description:
      "Dedicated applicant experience completely separated from internal team views. Edit your profile, manage resumes, track timelines, and download interview invites.",
    permissions: [
      "Track live application progress and stage milestones",
      "View confirmed interviews and download ICS invitations",
      "Upload PDF or DOCX resumes and manage privacy consent",
      "Private team notes and other candidates stay hidden",
    ],
  },
];

export default function DemoPage() {
  const router = useRouter();
  const { startDemo, announce } = useAuth();
  const [loadingRole, setLoadingRole] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleLaunch = async (role: "recruiter" | "hiring_manager" | "candidate", destination: string) => {
    setError(null);
    setLoadingRole(role);
    try {
      await startDemo(role);
      announce(`Started isolated ${role.replace("_", " ")} demo session.`);
      router.push(destination);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to start demo session. Verify that the FastAPI server is running on port 8000."
      );
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <section className="mx-auto max-w-[1160px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
              Try TalentOS with realistic hiring data.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              Choose a role below to launch a private sandbox seeded with 8 openings, 40 synthetic candidates, 60
              applications, 12 interviews, and sample PDF resumes. Your session stays isolated from other visitors.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-[12px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]"
            >
              {error}
            </div>
          )}

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {DEMO_ROLES.map((item) => {
              const Icon = item.icon;
              const isPending = loadingRole === item.id;
              return (
                <article
                  key={item.id}
                  className="surface-solid flex flex-col rounded-[18px] p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[var(--color-text)]">{item.title}</h2>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">{item.persona}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {item.description}
                  </p>

                  <ul className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text)]">
                    {item.permissions.map((perm) => (
                      <li key={perm} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                        />
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Button
                      variant={item.id === "recruiter" ? "primary" : "secondary"}
                      className="w-full"
                      disabled={loadingRole !== null}
                      onClick={() => void handleLaunch(item.id, item.destination)}
                    >
                      {isPending ? "Preparing isolated session..." : `Launch ${item.title.toLowerCase()}`}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="surface-glass-nav mt-8 flex items-start gap-3.5 rounded-[16px] p-5 text-sm text-[var(--color-text-secondary)]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <p className="leading-relaxed">
              Demo sessions run built-in rule-based resume analysis locally so every workflow functions without paid
              external API keys. Destructive workspace operations are safely guarded inside demo organizations.
            </p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
