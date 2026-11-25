"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  Clock,
  Kanban,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserCircle,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getResolvedTheme } from "@/lib/theme";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  canCreateJob: boolean;
}

interface SearchResponse {
  jobs: Array<{ id: string; title: string; department: string; status: string }>;
  candidates: Array<{ id: string; full_name: string; headline: string | null; location: string | null }>;
}

interface RecentAction {
  id: string;
  label: string;
  subtitle?: string;
  href: string;
}

interface CommandItem {
  id: string;
  group: "Recent" | "Jobs" | "Candidates" | "Quick actions" | "Navigation";
  label: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

const RECENT_STORAGE_KEY = "talentos-recent-commands";

const NAVIGATION_ITEMS = [
  { id: "nav-overview", label: "Overview", subtitle: "Workspace summary", href: "/workspace", icon: LayoutDashboard },
  { id: "nav-jobs", label: "Jobs", subtitle: "Open roles and drafts", href: "/workspace/jobs", icon: Briefcase },
  { id: "nav-candidates", label: "Candidates", subtitle: "Applicant directory", href: "/workspace/candidates", icon: Users },
  { id: "nav-pipeline", label: "Pipeline", subtitle: "Hiring stages board", href: "/workspace/pipeline", icon: Kanban },
  { id: "nav-interviews", label: "Interviews", subtitle: "Calendar and feedback", href: "/workspace/interviews", icon: Calendar },
  { id: "nav-analytics", label: "Analytics", subtitle: "Hiring funnel metrics", href: "/workspace/analytics", icon: BarChart3 },
  { id: "nav-notifications", label: "Notifications", subtitle: "Recent alerts", href: "/workspace/notifications", icon: Bell },
  { id: "nav-team", label: "Team", subtitle: "Members and roles", href: "/workspace/team", icon: Users },
  { id: "nav-settings", label: "Settings", subtitle: "Organization and appearance", href: "/workspace/settings", icon: Settings },
];

function readRecentActions(): RecentAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 4);
  } catch {
    return [];
  }
}

function recordRecentAction(entry: RecentAction) {
  if (typeof window === "undefined") return;
  try {
    const existing = readRecentActions().filter((item) => item.href !== entry.href);
    const next = [entry, ...existing].slice(0, 4);
    window.sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors in restricted browsing modes.
  }
}

export function CommandPalette({ open, onClose, canCreateJob }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useAuth();
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResponse | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [recent, setRecent] = React.useState<RecentAction[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setRecent(readRecentActions());
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => {
      el.returnValue = "";
      setQuery("");
      setResults(null);
      onClose();
    };
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setSearching(false);
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
    }, 150);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const navigate = React.useCallback(
    (label: string, href: string, subtitle?: string) => {
      recordRecentAction({ id: `recent-${href}`, label, href, subtitle });
      dialogRef.current?.close();
      router.push(href);
    },
    [router]
  );

  const resolvedTheme = getResolvedTheme(theme);
  const normalized = query.trim().toLowerCase();

  const items = React.useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    if (!normalized && recent.length > 0) {
      recent.forEach((item) => {
        list.push({
          id: item.id,
          group: "Recent",
          label: item.label,
          subtitle: item.subtitle,
          icon: Clock,
          run: () => navigate(item.label, item.href, item.subtitle),
        });
      });
    }

    if (results?.jobs.length) {
      results.jobs.forEach((job) => {
        list.push({
          id: `job-${job.id}`,
          group: "Jobs",
          label: job.title,
          subtitle: `${job.department} · ${job.status}`,
          icon: Briefcase,
          run: () => navigate(job.title, `/workspace/jobs/${job.id}`, job.department),
        });
      });
    }

    if (results?.candidates.length) {
      results.candidates.forEach((cand) => {
        list.push({
          id: `cand-${cand.id}`,
          group: "Candidates",
          label: cand.full_name,
          subtitle: cand.location || cand.headline || "Candidate profile",
          icon: UserCircle,
          run: () => navigate(cand.full_name, `/workspace/candidates/${cand.id}`, cand.headline || undefined),
        });
      });
    }

    const quickActions: CommandItem[] = [];
    if (canCreateJob) {
      quickActions.push({
        id: "action-new-job",
        group: "Quick actions",
        label: "Create new job opening",
        subtitle: "Draft and publish a role",
        icon: Plus,
        run: () => navigate("Create new job opening", "/workspace/jobs/new", "Jobs"),
      });
    }
    quickActions.push({
      id: "action-theme",
      group: "Quick actions",
      label: resolvedTheme === "dark" ? "Switch to light appearance" : "Switch to dark appearance",
      subtitle: "Theme",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      run: () => {
        toggleTheme();
        dialogRef.current?.close();
      },
    });

    quickActions
      .filter((action) => !normalized || action.label.toLowerCase().includes(normalized))
      .forEach((action) => list.push(action));

    NAVIGATION_ITEMS.filter(
      (item) =>
        !normalized ||
        item.label.toLowerCase().includes(normalized) ||
        item.subtitle.toLowerCase().includes(normalized)
    ).forEach((item) => {
      list.push({
        id: item.id,
        group: "Navigation",
        label: item.label,
        subtitle: item.subtitle,
        icon: item.icon,
        run: () => navigate(item.label, item.href, item.subtitle),
      });
    });

    return list;
  }, [canCreateJob, navigate, normalized, recent, resolvedTheme, results, toggleTheme]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, results]);

  const grouped = React.useMemo(() => {
    const groups: Array<{ name: CommandItem["group"]; entries: Array<{ item: CommandItem; index: number }> }> = [];
    const map = new Map<CommandItem["group"], Array<{ item: CommandItem; index: number }>>();
    items.forEach((item, index) => {
      const bucket = map.get(item.group) || [];
      bucket.push({ item, index });
      map.set(item.group, bucket);
    });
    const order: CommandItem["group"][] = ["Recent", "Jobs", "Candidates", "Quick actions", "Navigation"];
    order.forEach((name) => {
      const entries = map.get(name);
      if (entries && entries.length > 0) {
        groups.push({ name, entries });
      }
    });
    return groups;
  }, [items]);

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (items.length > 0) {
        setActiveIndex((prev) => (prev + 1) % items.length);
      }
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (items.length > 0) {
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const selected = items[activeIndex];
      if (selected) {
        selected.run();
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Spotlight workspace search"
      onClick={(ev) => {
        if (ev.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      }}
      className="talentos-dialog surface-glass-overlay mx-auto mt-[11vh] w-[min(94vw,620px)] max-h-[76dvh] overflow-hidden rounded-[20px] p-0 text-[var(--color-text)]"
    >
      {/* Spotlight search bar */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
        <Search className="h-[18px] w-[18px] shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
        <label htmlFor="spotlight-search-input" className="sr-only">
          Search jobs, candidates, and workspace views
        </label>
        <input
          ref={inputRef}
          id="spotlight-search-input"
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls="spotlight-results-list"
          aria-activedescendant={items[activeIndex] ? `spotlight-item-${items[activeIndex].id}` : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search jobs, candidates, or actions..."
          className="w-full bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
        />
        <kbd className="hidden shrink-0 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)] sm:inline-block">
          Esc
        </kbd>
      </div>

      {/* Results list */}
      <div id="spotlight-results-list" role="listbox" className="flex-1 overflow-y-auto px-2.5 py-2.5">
        {searching && (
          <p className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">Searching workspace...</p>
        )}

        {!searching && grouped.length === 0 && (
          <div className="px-3 py-10 text-center">
            <p className="text-sm font-medium text-[var(--color-text)]">No matching results</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Try a candidate name, job title, or workspace section.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.name}>
              <p className="px-3 pb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                {group.name}
              </p>
              <ul className="space-y-0.5">
                {group.entries.map(({ item, index }) => {
                  const Icon = item.icon;
                  const active = index === activeIndex;
                  return (
                    <li key={item.id} role="option" id={`spotlight-item-${item.id}`} aria-selected={active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={item.run}
                        className={`flex w-full min-h-10 items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                            : "text-[var(--color-text)] hover:bg-[var(--color-glass-active)]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
                            }`}
                          />
                          <span className="truncate font-medium">{item.label}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {item.subtitle && (
                            <span
                              className={`hidden max-w-[200px] truncate text-xs sm:inline ${
                                active ? "text-[var(--color-accent-text)]/80" : "text-[var(--color-text-secondary)]"
                              }`}
                            >
                              {item.subtitle}
                            </span>
                          )}
                          {active && <ArrowRight className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Subtle footer shortcut bar */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5 text-[11px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-1 py-0.5 text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-1 py-0.5 text-[10px]">↵</kbd>
            Open
          </span>
        </div>
        <span>TalentOS Spotlight</span>
      </div>
    </dialog>
  );
}
