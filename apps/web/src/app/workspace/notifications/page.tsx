"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import type { NotificationItem } from "@talentos/contracts";
import { Button, LoadingRegion, StatePanel, StatusTag } from "@talentos/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/format";

export default function WorkspaceNotificationsPage() {
  const queryClient = useQueryClient();
  const { announce } = useAuth();
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const notifQuery = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => apiRequest<NotificationItem[]>(`/notifications?unread_only=${unreadOnly}`),
  });

  const readOne = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAll = useMutation({
    mutationFn: () => apiRequest("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      announce("Marked all notifications as read.");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = notifQuery.data || [];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Persistent in-app alerts for new applications, interviews, status updates, and resume
            analyses. Email delivery activates only when SMTP is configured on the server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
            {unreadOnly ? "Show all" : "Unread only"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all read
          </Button>
        </div>
      </div>

      {notifQuery.isLoading && <LoadingRegion label="Loading notifications..." rows={4} />}
      {notifQuery.isError && <StatePanel tone="error" title="Could not load notifications" description="Retry shortly." />}

      {!notifQuery.isLoading && items.length === 0 && (
        <StatePanel
          title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          description="Hiring workflow updates will appear here automatically."
        />
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                n.is_read ? "" : "bg-[var(--color-accent-soft)]/35"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-text)]">{n.title}</p>
                  {!n.is_read && <StatusTag tone="accent">Unread</StatusTag>}
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{n.body}</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
                  {formatRelativeTime(n.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {n.link_url && (
                  <Link href={n.link_url}>
                    <Button variant="secondary" size="sm" onClick={() => !n.is_read && readOne.mutate(n.id)}>
                      Open
                    </Button>
                  </Link>
                )}
                {!n.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => readOne.mutate(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
