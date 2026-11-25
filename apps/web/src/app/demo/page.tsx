"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ShieldCheck, UserCheck, Users } from "lucide-react";
import { Button, StatusTag } from "@talentos/ui";
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
      "Full recruitment operations: manage all 8 synthetic roles, filter 40 candidates, drag candidates across the 7-stage Kanban board, run rule-based resume evidence extraction, schedule interviews, and export analytics CSVs.",
    permissions: [
      "Create, edit, and publish job openings",
      "Move candidates across pipeline stages with audit rationale",
      "Upload resumes, inspect evidence, and record human reviews",
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
      "Focused reviewer perspective: inspect assigned candidates, review resume evidence checks, add private hiring-team notes, and submit structured interview feedback scorecards while org-admin mutations stay restricted.",
    permissions: [
      "Review candidate profiles, resumes, and private notes",
      "Submit structured interview feedback rubrics",
      "View pipeline status and department analytics",
      "Restricted from modifying organization settings or team roles",
    ],
  },
  {
    id: "candidate" as const,
    title: "Candidate portal",
    persona: "Nadia Kusuma · Staff Frontend Applicant",
    icon: UserCheck,
    destination: "/candidate",
    description:
      "Dedicated applicant experience completely separated from recruiter administration: edit personal profile, manage uploaded resumes with consent controls, track application timelines, and download interview ICS invites.",
    permissions: [
      "Track real-time application progress and stage timeline",
      "View confirmed interviews and download .ics invitations",
      "Upload PDF or DOCX resumes and manage privacy consent",
      "Zero visibility into private recruiter notes or other candidates",
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
            <StatusTag tone="accent">Isolated per-visitor sandbox</StatusTag>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
              Explore TalentOS with synthetic recruitment data
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              Launching any role below provisions a dedicated isolated organization seeded with 8
              openings, 40 synthetic candidates, 60 applications, 12 interviews, and generated PDF
              resumes. Your changes never affect other visitors.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-[8px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]"
            >
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {DEMO_ROLES.map((item) => {
              const Icon = item.icon;
              const isPending = loadingRole === item.id;
              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-accent)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {item.id.replace("_", " ")}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-semibold text-[var(--color-text)]">{item.title}</h2>
                  <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">{item.persona}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {item.description}
                  </p>

                  <ul className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text)]">
                    {item.permissions.map((perm) => (
                      <li key={perm} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 pt-2">
                    <Button
                      variant={item.id === "recruiter" ? "primary" : "secondary"}
                      className="w-full"
                      disabled={loadingRole !== null}
                      onClick={() => void handleLaunch(item.id, item.destination)}
                    >
                      {isPending ? "Provisioning isolated session..." : `Launch ${item.title.toLowerCase()}`}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-secondary)]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <p>
              Public demo sessions use deterministic rule-based resume analysis so everything works
              without paid external API keys. Destructive workspace operations (deleting jobs or
              wiping accounts) are intentionally guarded in demo sessions.
            </p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
