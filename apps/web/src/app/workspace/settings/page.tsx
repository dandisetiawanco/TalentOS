"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, StatusTag, Textarea } from "@talentos/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ThemePreference } from "@/lib/theme";

export default function WorkspaceSettingsPage() {
  const { user, theme, setTheme, refreshUser, announce } = useAuth();
  const org = user?.organization;
  const isOwner = user?.role === "organization_owner";

  const [orgName, setOrgName] = React.useState(org?.name || "");
  const [website, setWebsite] = React.useState(org?.website || "");
  const [industry, setIndustry] = React.useState(org?.industry || "");
  const [timezone, setTimezone] = React.useState(org?.default_timezone || "UTC");
  const [retentionDays, setRetentionDays] = React.useState(String(org?.document_retention_days || 180));
  const [description, setDescription] = React.useState(org?.description || "");
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  const [notifyNewApp, setNotifyNewApp] = React.useState(user?.preferences.notify_new_application ?? true);
  const [notifyInterviews, setNotifyInterviews] = React.useState(user?.preferences.notify_interview_updates ?? true);
  const [notifyResume, setNotifyResume] = React.useState(user?.preferences.notify_resume_analysis ?? true);

  const saveOrgMutation = useMutation({
    mutationFn: () =>
      apiRequest("/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({
          name: orgName,
          website: website || null,
          industry: industry || null,
          default_timezone: timezone,
          document_retention_days: Number(retentionDays) || 180,
          description: description || null,
        }),
      }),
    onSuccess: async () => {
      await refreshUser();
      setStatusMsg("Organization settings updated.");
      announce("Saved organization settings.");
    },
    onError: (err) => {
      setStatusMsg(err instanceof ApiError ? err.message : "Failed to save organization settings.");
    },
  });

  const savePrefsMutation = useMutation({
    mutationFn: () =>
      apiRequest("/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          theme,
          notify_new_application: notifyNewApp,
          notify_interview_updates: notifyInterviews,
          notify_resume_analysis: notifyResume,
        }),
      }),
    onSuccess: async () => {
      await refreshUser();
      setStatusMsg("Personal preferences saved.");
      announce("Saved personal preferences.");
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
          Workspace settings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Configure appearance, notification rules, and organization-level retention policies.
        </p>
      </div>

      {statusMsg && (
        <div role="status" className="rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-text)]">
          {statusMsg}
        </div>
      )}

      {/* Three-state theme control (System / Light / Dark) */}
      <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Appearance</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Choose whether TalentOS follows your operating system color scheme or locks to light or dark mode.
        </p>
        <div role="radiogroup" aria-label="Theme preference" className="mt-4 grid grid-cols-3 gap-2.5">
          {(
            [
              { value: "system", label: "System default" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ] as Array<{ value: ThemePreference; label: string }>
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => setTheme(option.value)}
              className={`min-h-11 rounded-[7px] border px-3 text-sm font-medium transition-colors ${
                theme === option.value
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-canvas)] text-[var(--color-text)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Notification preferences */}
      <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Notification preferences</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          In-app notifications are persisted per user. External email dispatch is disabled until SMTP is configured.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={notifyNewApp} onChange={(e) => setNotifyNewApp(e.target.checked)} />
            Notify when a new candidate applies
          </label>
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={notifyInterviews} onChange={(e) => setNotifyInterviews(e.target.checked)} />
            Notify when interviews are scheduled or rescheduled
          </label>
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={notifyResume} onChange={(e) => setNotifyResume(e.target.checked)} />
            Notify when resume evidence analysis completes
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => savePrefsMutation.mutate()} disabled={savePrefsMutation.isPending}>
            Save notification preferences
          </Button>
        </div>
      </section>

      {/* Organization Settings */}
      <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">Organization &amp; data retention</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Document retention windows govern how long uploaded resumes are stored per organization.
            </p>
          </div>
          {!isOwner && <StatusTag tone="neutral">Owner read-only</StatusTag>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveOrgMutation.mutate();
          }}
          className="mt-5 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="org-name" className="block text-xs font-medium text-[var(--color-text)]">Organization name</label>
              <Input id="org-name" disabled={!isOwner} value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="org-ind" className="block text-xs font-medium text-[var(--color-text)]">Industry</label>
              <Input id="org-ind" disabled={!isOwner} value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="org-web" className="block text-xs font-medium text-[var(--color-text)]">Website</label>
              <Input id="org-web" disabled={!isOwner} value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="org-tz" className="block text-xs font-medium text-[var(--color-text)]">Default timezone</label>
              <Input id="org-tz" disabled={!isOwner} value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="org-ret" className="block text-xs font-medium text-[var(--color-text)]">Retention (days)</label>
              <Input id="org-ret" type="number" min={30} max={1095} disabled={!isOwner} value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <label htmlFor="org-desc" className="block text-xs font-medium text-[var(--color-text)]">Description</label>
            <Textarea id="org-desc" rows={3} disabled={!isOwner} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          {isOwner && (
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={saveOrgMutation.isPending}>
                {saveOrgMutation.isPending ? "Saving..." : "Save organization settings"}
              </Button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
