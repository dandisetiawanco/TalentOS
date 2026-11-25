import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "About",
  description: "Architecture, engineering goals, and responsible AI design behind TalentOS by Dandi Setiawan.",
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <article className="mx-auto max-w-[840px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">About TalentOS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
            Built as an engineering flagship for human-led recruitment software
          </h1>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            <p>
              TalentOS is an independent portfolio application designed and developed by{" "}
              <a
                href="https://dandisetiawan.id"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--color-text)] underline underline-offset-4 hover:text-[var(--color-accent)]"
              >
                Dandi Setiawan
              </a>
              . It is not a commercial SaaS vendor and makes no claims about commercial customers,
              external certifications, or commercial SLAs.
            </p>
            <p>
              The project demonstrates full-stack system architecture across a Next.js App Router
              TypeScript frontend, a FastAPI and SQLAlchemy backend, Alembic relational migrations
              covering 20 normalized tables, Argon2id + JWT authentication, strict tenant isolation,
              accessible UI engineering, and responsible document intelligence.
            </p>

            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h2 className="text-base font-semibold text-[var(--color-text)]">Core engineering principles</h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li>
                  <strong className="font-medium text-[var(--color-text)]">Server-enforced RBAC:</strong>{" "}
                  Organization Owner, Recruiter, Hiring Manager, and Candidate boundaries are checked
                  on every API route and organization query, never only hidden in the UI.
                </li>
                <li>
                  <strong className="font-medium text-[var(--color-text)]">Transparent document analysis:</strong>{" "}
                  Uploaded PDF and DOCX resumes are validated by magic bytes, parsed safely, scanned
                  for prompt-injection instructions, and evaluated with rule-based extraction whenever
                  no external LLM key is configured.
                </li>
                <li>
                  <strong className="font-medium text-[var(--color-text)]">Isolated demo sandboxes:</strong>{" "}
                  Each interactive demo session clones a dedicated synthetic organization so visitors
                  can edit jobs, move pipeline cards, upload documents, and schedule interviews
                  without colliding with anyone else.
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center rounded-[7px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)]"
            >
              Launch interactive demo
            </Link>
            <a
              href="https://dandisetiawan.id"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
            >
              Visit Dandi Setiawan&apos;s portfolio
            </a>
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
