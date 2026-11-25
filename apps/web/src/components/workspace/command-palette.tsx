"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Calendar,
  Kanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Users,
  UserCircle,
} from "lucide-react";
import { NativeDialog } from "@talentos/ui";
import { apiRequest } from "@/lib/api";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  canCreateJob: boolean;
}

interface SearchResponse {
  jobs: Array<{ id: string; title: string; department: string; status: string }>;
  candidates: Array<{ id: string; full_name: string; headline: string | null; location: string | null }>;
}

const STATIC_ROUTES = [
  { label: "Overview dashboard", href: "/workspace", icon: LayoutDashboard, group: "Navigate" },
  { label: "Job openings", href: "/workspace/jobs", icon: Briefcase, group: "Navigate" },
  { label: "Candidate directory", href: "/workspace/candidates", icon: Users, group: "Navigate" },
  { label: "Recruitment pipeline", href: "/workspace/pipeline", icon: Kanban, group: "Navigate" },
  { label: "Interview schedule", href: "/workspace/interviews", icon: Calendar, group: "Navigate" },
  { label: "Recruitment analytics", href: "/workspace/analytics", icon: BarChart3, group: "Navigate" },
  { label: "Team & roles", href: "/workspace/team", icon: Users, group: "Organization" },
  { label: "Workspace settings", href: "/workspace/settings", icon: Settings, group: "Organization" },
];

export function CommandPalette({ open, onClose, canCreateJob }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResponse | null>(null);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiRequest<SearchResponse>(`/search?q=${encodeURIComponent(trimmed)}`);
        setResults(res);
      } catch {
        setResults({ jobs: [], candidates: [] });
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const filteredStatic = STATIC_ROUTES.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Command palette"
      description="Jump to pages, search jobs and candidates, or trigger common actions."
      className="w-[min(94vw,600px)]"
    >
      <div className="relative">
        <label htmlFor="cmd-search-input" className="sr-only">
          Search commands, jobs, or candidates
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-secondary)]"
          aria-hidden="true"
        />
        <input
          id="cmd-search-input"
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jobs, candidates, or workspace views..."
          className="w-full min-h-11 rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-canvas)] pl-10 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="mt-4 max-h-[55dvh] space-y-4 overflow-y-auto">
        {searching && (
          <p className="px-2 text-xs text-[var(--color-text-secondary)]">Searching workspace records...</p>
        )}

        {results && results.jobs.length > 0 && (
          <div>
            <p className="px-2 text-xs font-medium text-[var(--color-text-secondary)]">Jobs</p>
            <ul className="mt-1.5 space-y-1">
              {results.jobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/workspace/jobs/${job.id}`)}
                    className="flex w-full min-h-10 items-center justify-between rounded-[6px] px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                  >
                    <span className="font-medium text-[var(--color-text)]">{job.title}</span>
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {job.department} · {job.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {results && results.candidates.length > 0 && (
          <div>
            <p className="px-2 text-xs font-medium text-[var(--color-text-secondary)]">Candidates</p>
            <ul className="mt-1.5 space-y-1">
              {results.candidates.map((cand) => (
                <li key={cand.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/workspace/candidates/${cand.id}`)}
                    className="flex w-full min-h-10 items-center justify-between gap-2 rounded-[6px] px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                  >
                    <span className="inline-flex items-center gap-2 font-medium text-[var(--color-text)]">
                      <UserCircle className="h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
                      {cand.full_name}
                    </span>
                    <span className="truncate text-xs text-[var(--color-text-secondary)]">
                      {cand.location || cand.headline || "Profile"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canCreateJob && (
          <div>
            <p className="px-2 text-xs font-medium text-[var(--color-text-secondary)]">Quick actions</p>
            <button
              type="button"
              onClick={() => navigate("/workspace/jobs/new")}
              className="mt-1.5 flex w-full min-h-10 items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-sm font-medium text-[var(--color-accent-text)] hover:bg-[var(--color-accent-soft)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create a new job opening</span>
            </button>
          </div>
        )}

        <div>
          <p className="px-2 text-xs font-medium text-[var(--color-text-secondary)]">Workspace pages</p>
          <ul className="mt-1.5 space-y-1">
            {filteredStatic.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => navigate(item.href)}
                    className="flex w-full min-h-10 items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </NativeDialog>
  );
}
