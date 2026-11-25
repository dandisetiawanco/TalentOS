import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How TalentOS handles candidate profiles, uploaded resumes, consent, retention, and isolated demo data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <article className="mx-auto max-w-[840px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">Data governance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
            Privacy Notice
          </h1>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            Applies to the TalentOS portfolio application as currently implemented. TalentOS does not
            claim formal GDPR, ISO 27001, SOC 2, or Indonesian PDP certification.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">1. What data is stored</h2>
              <p className="mt-2">
                Accounts store name, email address, Argon2id-hashed passwords, profile information,
                job applications, interview schedules, and any PDF or DOCX documents uploaded with
                explicit processing consent. Public demonstration datasets contain strictly synthetic
                names, placeholder addresses, and generated resumes with zero real personal data.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">2. Resume processing and AI boundaries</h2>
              <p className="mt-2">
                Resume text extraction and qualification checks run only after explicit candidate
                consent is recorded. By default, TalentOS runs deterministic rule-based extraction
                locally without transmitting candidate files to third-party AI APIs. If an operator
                configures an external AI provider (OpenAI-compatible, Gemini, or local Ollama),
                only authorized recruiter actions trigger analysis, and public demo sessions remain
                locked to rule-based analysis unless explicitly overridden in server configuration.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">3. Access isolation and private files</h2>
              <p className="mt-2">
                Uploaded resumes are stored in private storage with randomized UUID filenames and
                served only via authenticated, expiring HMAC-signed download URLs. Recruiter notes,
                internal hiring discussions, and analytics are isolated per organization and never
                exposed to candidate accounts.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--color-text)]">4. Retention and deletion controls</h2>
              <p className="mt-2">
                Organizations can configure document retention periods (30 to 1095 days) in workspace
                settings. Non-demo candidate accounts can permanently delete their account, uploaded
                documents, and application records directly from Candidate Settings.
              </p>
            </section>
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
