import Link from "next/link";
import { BrandWordmark } from "@talentos/ui";

const FOOTER_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/careers", label: "Careers" },
  { href: "/demo", label: "Demo" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-[1160px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandWordmark markSize={20} />
            <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--color-text-secondary)]">
              Bring your hiring team, candidates, and recruitment workflows together in one thoughtful workspace.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/dandisetiawanco/talentos"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
            >
              GitHub
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Designed and built by{" "}
            <a
              href="https://dandisetiawan.id"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--color-text)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
            >
              Dandi Setiawan
            </a>
          </p>
          <p>Independent portfolio project. Demo organizations, openings, and resumes are synthetic.</p>
        </div>
      </div>
    </footer>
  );
}
