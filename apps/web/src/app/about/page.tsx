import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "About",
  description: "Architecture, product design philosophy, and responsible AI principles behind TalentOS by Dandi Setiawan.",
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <article className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
            Designed as an operating-system-inspired workspace for human-led hiring.
          </h1>

          <div className="mt-7 space-y-5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            <p>
              TalentOS is an independent portfolio project designed and engineered by{" "}
              <a
                href="https://dandisetiawan.id"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--color-text)] underline decoration-[var(--color-border-strong)] underline-offset-4 hover:text-[var(--color-accent)]"
              >
                Dandi Setiawan
              </a>
              . It is not a commercial software vendor and makes no claims about commercial customers or external
              certifications.
            </p>
            <p>
              Underneath the Liquid Glass workspace is a full-stack architecture built with Next.js App Router,
              strict TypeScript, FastAPI, SQLAlchemy, Alembic migrations spanning 20 normalized relational tables,
              Argon2id and JWT session handling, strict tenant boundaries, and evidence-first resume parsing.
            </p>

            <section className="surface-solid rounded-[16px] p-6">
              <h2 className="text-base font-semibold text-[var(--color-text)]">Core engineering principles</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <strong className="font-medium text-[var(--color-text)]">Server-enforced permissions:</strong>{" "}
                  Organization Owner, Recruiter, Hiring Manager, and Candidate boundaries are checked on every API
                  endpoint and database query.
                </li>
                <li>
                  <strong className="font-medium text-[var(--color-text)]">Transparent document analysis:</strong>{" "}
                  Uploaded PDF and DOCX resumes are validated by file signature, scanned for embedded prompt
                  directives, and evaluated locally using rule-based extraction whenever no external AI key is set.
                </li>
                <li>
                  <strong className="font-medium text-[var(--color-text)]">Isolated demo sandboxes:</strong>{" "}
                  Each interactive demo session clones a private synthetic organization so visitors can test real
                  edits without affecting anyone else.
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex h-11 items-center rounded-[11px] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Try the demo
            </Link>
            <a
              href="https://dandisetiawan.id"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-[11px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-subtle)]"
            >
              Visit dandisetiawan.id
            </a>
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
