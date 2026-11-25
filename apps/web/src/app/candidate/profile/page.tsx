"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CandidateProfile } from "@talentos/contracts";
import { Button, Input, LoadingRegion, StatePanel, Textarea } from "@talentos/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function CandidateProfilePage() {
  const queryClient = useQueryClient();
  const { refreshUser, announce } = useAuth();
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["candidate-profile"],
    queryFn: () => apiRequest<CandidateProfile>("/candidate/profile"),
  });

  const [fullName, setFullName] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [timezone, setTimezone] = React.useState("UTC");
  const [yearsExp, setYearsExp] = React.useState("");
  const [skillsText, setSkillsText] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [portfolioUrl, setPortfolioUrl] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  React.useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data;
      setFullName(p.full_name || "");
      setHeadline(p.headline || "");
      setLocation(p.location || "");
      setPhone(p.phone || "");
      setTimezone(p.timezone || "UTC");
      setYearsExp(p.years_of_experience != null ? String(p.years_of_experience) : "");
      setSkillsText((p.skills || []).join(", "));
      setBio(p.bio || "");
      setLinkedinUrl(p.linkedin_url || "");
      setPortfolioUrl(p.portfolio_url || "");
      setConsent(p.consent_resume_processing);
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<CandidateProfile>("/candidate/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          headline: headline || null,
          location: location || null,
          phone: phone || null,
          timezone,
          years_of_experience: yearsExp ? Number(yearsExp) : null,
          skills: skillsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          bio: bio || null,
          linkedin_url: linkedinUrl || null,
          portfolio_url: portfolioUrl || null,
          consent_resume_processing: consent,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidate-profile"] });
      await refreshUser();
      setStatusMsg("Profile changes saved.");
      announce("Saved candidate profile.");
    },
    onError: (err) => {
      setStatusMsg(err instanceof ApiError ? err.message : "Could not save profile.");
    },
  });

  if (profileQuery.isLoading) return <LoadingRegion label="Loading your profile..." rows={6} />;
  if (profileQuery.isError) {
    return <StatePanel tone="error" title="Could not load profile" description="Try refreshing the page." />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
          Candidate profile
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Keep your contact details, summary, and skills up to date across your job applications.
        </p>
      </div>

      {statusMsg && (
        <div role="status" className="rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-text)]">
          {statusMsg}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4 rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cp-name" className="block text-sm font-medium text-[var(--color-text)]">Full name</label>
            <Input id="cp-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label htmlFor="cp-headline" className="block text-sm font-medium text-[var(--color-text)]">Professional headline</label>
            <Input id="cp-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Frontend Engineer" className="mt-1.5" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="cp-loc" className="block text-sm font-medium text-[var(--color-text)]">Location</label>
            <Input id="cp-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="mt-1.5" />
          </div>
          <div>
            <label htmlFor="cp-phone" className="block text-sm font-medium text-[var(--color-text)]">Phone</label>
            <Input id="cp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label htmlFor="cp-yrs" className="block text-sm font-medium text-[var(--color-text)]">Years experience</label>
            <Input id="cp-yrs" type="number" min={0} max={60} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="cp-tz" className="block text-sm font-medium text-[var(--color-text)]">Timezone</label>
            <Input id="cp-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label htmlFor="cp-li" className="block text-sm font-medium text-[var(--color-text)]">LinkedIn URL</label>
            <Input id="cp-li" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label htmlFor="cp-port" className="block text-sm font-medium text-[var(--color-text)]">Portfolio URL</label>
            <Input id="cp-port" type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <div>
          <label htmlFor="cp-skills" className="block text-sm font-medium text-[var(--color-text)]">Skills (comma-separated)</label>
          <Input id="cp-skills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="TypeScript, React, Next.js, Accessibility" className="mt-1.5" />
        </div>

        <div>
          <label htmlFor="cp-bio" className="block text-sm font-medium text-[var(--color-text)]">Professional summary</label>
          <Textarea id="cp-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5" />
        </div>

        <label className="flex items-start gap-2.5 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5 text-xs text-[var(--color-text-secondary)]">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            Allow hiring teams I apply to run structured resume evidence extraction on my uploaded
            documents. Decisions are always made by human reviewers.
          </span>
        </label>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
