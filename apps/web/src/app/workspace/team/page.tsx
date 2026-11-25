"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { ROLE_LABELS, type TeamMember } from "@talentos/contracts";
import { Button, Input, LoadingRegion, NativeDialog, Select, StatePanel, StatusTag } from "@talentos/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatShortDate, initialsFor } from "@/lib/format";

export default function WorkspaceTeamPage() {
  const queryClient = useQueryClient();
  const { user, announce } = useAuth();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<TeamMember["role"]>("recruiter");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["workspace-team"],
    queryFn: () => apiRequest<TeamMember[]>("/team"),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiRequest<TeamMember>("/team/invite", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          role,
          title: title || null,
          department: department || null,
        }),
      }),
    onSuccess: (created) => {
      setInviteOpen(false);
      setFullName("");
      setEmail("");
      setTitle("");
      setDepartment("");
      setErrorMsg(null);
      announce(`Added ${created.full_name} to the team.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-team"] });
    },
    onError: (err) => {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not invite team member.");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, nextRole }: { id: string; nextRole: TeamMember["role"] }) =>
      apiRequest<TeamMember>(`/team/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      }),
    onSuccess: (updated) => {
      announce(`Updated role for ${updated.full_name}.`);
      void queryClient.invalidateQueries({ queryKey: ["workspace-team"] });
    },
  });

  const isOwner = user?.role === "organization_owner";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            Team
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Manage workspace members and role permissions enforced across your organization.
          </p>
        </div>
        {isOwner ? (
          <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Invite member
          </Button>
        ) : (
          <StatusTag tone="neutral">Owner permission required for role edits</StatusTag>
        )}
      </div>

      {teamQuery.isLoading && <LoadingRegion label="Loading team members..." rows={4} />}
      {teamQuery.isError && (
        <StatePanel tone="error" title="Could not load team directory" description="Try refreshing the page." />
      )}

      {teamQuery.data && (
        <div tabIndex={0} role="region" aria-label="Organization team directory" className="talentos-table-wrapper">
          <table className="talentos-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Department and title</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Added</th>
              </tr>
            </thead>
            <tbody>
              {teamQuery.data.map((member) => (
                <tr key={member.id}>
                  <td data-primary="true" data-label="Member">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs font-semibold text-[var(--color-text)]"
                      >
                        {initialsFor(member.full_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text)]">{member.full_name}</p>
                        <p className="truncate text-xs text-[var(--color-text-secondary)]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td data-label="Title" className="text-xs text-[var(--color-text-secondary)]">
                    {member.title || "Team member"} {member.department ? `· ${member.department}` : ""}
                  </td>
                  <td data-label="Role">
                    {isOwner && member.user_id !== user?.id ? (
                      <select
                        aria-label={`Change role for ${member.full_name}`}
                        value={member.role}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            id: member.id,
                            nextRole: e.target.value as TeamMember["role"],
                          })
                        }
                        className="min-h-8 rounded-[8px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-xs"
                      >
                        <option value="organization_owner">Organization Owner</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="hiring_manager">Hiring Manager</option>
                      </select>
                    ) : (
                      <StatusTag tone="accent">{ROLE_LABELS[member.role]}</StatusTag>
                    )}
                  </td>
                  <td data-label="Status">
                    <StatusTag tone={member.status === "active" ? "success" : "neutral"}>{member.status}</StatusTag>
                  </td>
                  <td data-label="Added" className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                    {formatShortDate(member.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NativeDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        description="Add a recruiter, hiring manager, or co-owner to your organization."
      >
        {errorMsg && (
          <div role="alert" className="mb-3 rounded-[10px] border border-[var(--color-error)] bg-[var(--color-error-soft)] p-3 text-xs text-[var(--color-error)]">
            {errorMsg}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate();
          }}
          className="space-y-3.5"
        >
          <div>
            <label htmlFor="inv-name" className="block text-xs font-medium text-[var(--color-text)]">Full name</label>
            <Input id="inv-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Colleague name" className="mt-1" />
          </div>
          <div>
            <label htmlFor="inv-email" className="block text-xs font-medium text-[var(--color-text)]">Work email</label>
            <Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-role" className="block text-xs font-medium text-[var(--color-text)]">Role</label>
              <Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as TeamMember["role"])} className="mt-1">
                <option value="recruiter">Recruiter</option>
                <option value="hiring_manager">Hiring Manager</option>
                <option value="organization_owner">Organization Owner</option>
              </Select>
            </div>
            <div>
              <label htmlFor="inv-dept" className="block text-xs font-medium text-[var(--color-text)]">Department</label>
              <Input id="inv-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" className="mt-1" />
            </div>
          </div>
          <div>
            <label htmlFor="inv-title" className="block text-xs font-medium text-[var(--color-text)]">Title</label>
            <Input id="inv-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Engineering Manager" className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Inviting..." : "Add team member"}
            </Button>
          </div>
        </form>
      </NativeDialog>
    </div>
  );
}
