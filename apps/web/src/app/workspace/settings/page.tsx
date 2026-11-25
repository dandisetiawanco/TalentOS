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
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          Configure appearance, notification rules, and organization retention policies.
        </p>
      </div>

      {statusMsg && (
        <div role="status" className="rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-text)]">
          {statusMsg}
        </div>
      )}

      {/* Three-state OS appearance control */}
      <section className="surface-solid rounded-[16px] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Appearance</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Match your system appearance or keep TalentOS in light or dark mode.
        </p>
        <div
          role="radiogroup"
          aria-label="Theme preference"
          className="surface-segment-track mt-4 grid grid-cols-3 gap-1.5 rounded-[12px] p-1"
        >
          {(
            [
              { value: "system", label: "System" },
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
              className={`min-h-9 rounded-[9px] px-3 text-sm font-medium transition-all ${
                theme === option.value
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_1px_2px_rgba(15,23,21,0.08)] ring-1 ring-[var(--color-border)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Notification preferences */}
      <section className="surface-solid rounded-[16px] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Notifications</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          In-app notifications stay synced per user. External email dispatch activates when SMTP is configured.
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
            Notify when resume qualification checks complete
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => savePrefsMutation.mutate()} disabled={savePrefsMutation.isPending}>
            Save preferences
          </Button>
        </div>
      </section>

      {/* Organization Settings */}
      <section className="surface-solid rounded-[16px] p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Organization and retention</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Control organization profile details and resume retention windows.
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
