import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Usage terms and scope limitations for the TalentOS recruitment platform portfolio project.",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <article className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
            Terms of Use
          </h1>

          <div className="surface-solid mt-8 space-y-6 rounded-[18px] p-6 sm:p-8 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">Portfolio showcase scope</h2>
              <p className="mt-2">
                TalentOS is an independent software engineering portfolio project authored by Dandi
                Setiawan. Demonstration organizations, job openings, candidate records, and meeting
                links seeded in demo mode are fictional and provided solely to evaluate software
                functionality.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">Human responsibility for hiring decisions</h2>
              <p className="mt-2">
                Any automated or AI-assisted resume extraction provided by TalentOS is an informational
                review aid only. Authorized human reviewers remain solely responsible for verifying
                candidate qualifications and making employment decisions in compliance with applicable
                local labor and privacy laws.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">Acceptable use of demo sessions</h2>
              <p className="mt-2">
                Do not upload sensitive real personal documents, government identifiers, or confidential
                corporate records into public demo environments. Demo sessions are isolated per
                visitor, rate-limited, and subject to periodic reset.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">Implemented capabilities and limits</h2>
              <p className="mt-2">
                Calendar integration is delivered through standards-compliant downloadable ICS files
                rather than external OAuth calendar sync. Email delivery requires SMTP configuration
                by the operator; when unconfigured, notifications remain available in-app.
              </p>
            </section>
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
