"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button, NativeDialog } from "@talentos/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ThemePreference } from "@/lib/theme";

export default function CandidateSettingsPage() {
  const router = useRouter();
  const { user, theme, setTheme, logout, refreshUser, announce } = useAuth();
  const [notifyStatus, setNotifyStatus] = React.useState(user?.preferences.notify_status_updates ?? true);
  const [notifyInterviews, setNotifyInterviews] = React.useState(user?.preferences.notify_interview_updates ?? true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const savePrefs = useMutation({
    mutationFn: () =>
      apiRequest("/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          theme,
          notify_status_updates: notifyStatus,
          notify_interview_updates: notifyInterviews,
        }),
      }),
    onSuccess: async () => {
      await refreshUser();
      setStatusMsg("Preferences updated.");
      announce("Saved candidate preferences.");
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => apiRequest("/auth/account", { method: "DELETE" }),
    onSuccess: async () => {
      await logout();
      router.push("/");
    },
    onError: (err) => {
      setConfirmDeleteOpen(false);
      setErrorMsg(err instanceof ApiError ? err.message : "Could not delete account.");
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          Control appearance, application updates, and personal data deletion.
        </p>
      </div>

      {statusMsg && (
        <div role="status" className="rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent-text)]">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="rounded-[12px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]">
          {errorMsg}
        </div>
      )}

      <section className="surface-solid rounded-[16px] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Appearance</h2>
        <div
          role="radiogroup"
          aria-label="Color theme"
          className="surface-segment-track mt-3.5 grid grid-cols-3 gap-1.5 rounded-[12px] p-1"
        >
          {(
            [
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ] as Array<{ value: ThemePreference; label: string }>
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={theme === opt.value}
              onClick={() => setTheme(opt.value)}
              className={`min-h-9 rounded-[9px] px-3 text-sm font-medium transition-all ${
                theme === opt.value
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_1px_2px_rgba(15,23,21,0.08)] ring-1 ring-[var(--color-border)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="surface-solid rounded-[16px] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Notifications</h2>
        <div className="mt-3.5 space-y-2.5 text-sm text-[var(--color-text)]">
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={notifyStatus} onChange={(e) => setNotifyStatus(e.target.checked)} />
            In-app updates when my application stage changes
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={notifyInterviews} onChange={(e) => setNotifyInterviews(e.target.checked)} />
            In-app updates when an interview is scheduled or rescheduled
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => savePrefs.mutate()} disabled={savePrefs.isPending}>
            Save preferences
          </Button>
        </div>
      </section>

      <section className="surface-solid rounded-[16px] border-[var(--color-error)]/40 p-6">
        <h2 className="text-sm font-semibold text-[var(--color-error)]">Delete personal data</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Permanently remove your candidate account, profile details, uploaded resumes, and application records.
          Disabled inside public demo sessions.
        </p>
        <div className="mt-4">
          <Button
            variant="danger"
            size="sm"
            disabled={Boolean(user?.is_demo)}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            {user?.is_demo ? "Disabled in demo session" : "Delete my account and data"}
          </Button>
        </div>
      </section>

      <NativeDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Confirm permanent account deletion"
        description="This permanently deletes your candidate account, resumes, and application records."
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" autoFocus onClick={() => setConfirmDeleteOpen(false)}>
            Keep account
          </Button>
          <Button variant="danger" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}>
            {deleteAccount.isPending ? "Deleting..." : "Permanently delete"}
          </Button>
        </div>
      </NativeDialog>
    </div>
  );
}
