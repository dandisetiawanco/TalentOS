import Link from "next/link";
import { BrandWordmark } from "@talentos/ui";

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-md">
            <BrandWordmark markSize={22} />
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Better hiring. Built on intelligence. An independent recruitment platform portfolio
              project demonstrating human-led workflows, evidence-based document review, and
              role-based data isolation.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text)]">Platform</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/features" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  Public careers board
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  Interactive demo
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  About the architecture
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text)]">Governance and links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  Privacy notice
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  Terms of use
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/dandisetiawanco/talentos"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                >
                  GitHub repository
                </a>
              </li>
              <li>
                <a
                  href="https://dandisetiawan.id"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                >
                  dandisetiawan.id
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Designed and developed by{" "}
            <a
              href="https://dandisetiawan.id"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--color-text)] underline decoration-[var(--color-border-strong)] underline-offset-4 hover:text-[var(--color-accent)]"
            >
              Dandi Setiawan
            </a>
            .
          </p>
          <p>Portfolio concept. All demo organizations, jobs, and resumes are synthetic.</p>
        </div>
      </div>
    </footer>
  );
}
