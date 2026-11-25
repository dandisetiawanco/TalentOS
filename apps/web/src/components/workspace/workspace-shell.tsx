"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  ChevronRight,
  HelpCircle,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import type { NotificationItem } from "@talentos/contracts";
import { ROLE_LABELS } from "@talentos/contracts";
import { BrandWordmark, Button, LoadingRegion, NativeDialog, StatusTag } from "@talentos/ui";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { getResolvedTheme } from "@/lib/theme";
import { initialsFor } from "@/lib/format";
import { CommandPalette } from "./command-palette";

const MAIN_NAV = [
  { href: "/workspace", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/workspace/jobs", label: "Jobs", icon: Briefcase, exact: false },
  { href: "/workspace/candidates", label: "Candidates", icon: Users, exact: false },
  { href: "/workspace/pipeline", label: "Pipeline", icon: Kanban, exact: false },
  { href: "/workspace/interviews", label: "Interviews", icon: Calendar, exact: false },
  { href: "/workspace/analytics", label: "Analytics", icon: BarChart3, exact: false },
];

const ORG_NAV = [
  { href: "/workspace/team", label: "Team", icon: Users, exact: false },
  { href: "/workspace/settings", label: "Settings", icon: Settings, exact: false },
];

function buildBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split("/").filter(Boolean);
  const labels: Record<string, string> = {
    workspace: "Workspace",
    jobs: "Jobs",
    new: "New opening",
    candidates: "Candidates",
    pipeline: "Pipeline",
    interviews: "Interviews",
    analytics: "Analytics",
    team: "Team",
    notifications: "Notifications",
    settings: "Settings",
  };
  const crumbs: Array<{ label: string; href: string }> = [];
  let acc = "";
  segments.forEach((seg, idx) => {
    acc += `/${seg}`;
    const label = labels[seg] || (idx === segments.length - 1 ? "Details" : seg);
    crumbs.push({ label, href: acc });
  });
  return crumbs;
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, theme, toggleTheme, logout } = useAuth();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileDrawerRef = React.useRef<HTMLDialogElement | null>(null);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<NotificationItem[]>("/notifications"),
    enabled: Boolean(user && user.account_type !== "candidate"),
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.account_type === "candidate") {
        router.replace("/candidate");
      }
    }
  }, [isLoading, router, user]);

  React.useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openMobileNav = () => {
    const d = mobileDrawerRef.current;
    if (d && !d.open) {
      d.showModal();
      setMobileOpen(true);
    }
  };

  const closeMobileNav = () => {
    const d = mobileDrawerRef.current;
    if (d?.open) d.close();
    setMobileOpen(false);
  };

  if (isLoading || !user || user.account_type === "candidate") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <LoadingRegion label="Verifying workspace session..." rows={4} />
      </div>
    );
  }

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;
  const resolvedTheme = mounted ? getResolvedTheme(theme) : "light";
  const crumbs = buildBreadcrumbs(pathname);
  const canCreateJob = user.role === "organization_owner" || user.role === "recruiter";

  const renderNavList = (items: typeof MAIN_NAV, compact: boolean, onSelect?: () => void) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onSelect}
              aria-current={active ? "page" : undefined}
              title={compact ? item.label : undefined}
              className={`group relative flex min-h-11 items-center gap-2.5 rounded-[7px] px-3 text-sm transition-colors ${
                active
                  ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent-text)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              } ${compact ? "justify-center px-0" : ""}`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[var(--color-accent)]"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!compact ? <span>{item.label}</span> : <span className="sr-only">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-dvh flex bg-[var(--color-canvas)]">
      {/* Desktop sidebar rail */}
      <aside
        aria-label="Workspace navigation"
        className={`hidden lg:flex lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-150 ${
          collapsed ? "w-[72px]" : "w-[248px]"
        }`}
      >
        <div className={`flex h-16 items-center border-b border-[var(--color-border)] ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <Link href="/workspace" aria-label="TalentOS workspace home" className="inline-flex min-h-11 items-center">
            <BrandWordmark markSize={24} compact={collapsed} />
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-expanded={!collapsed}
              aria-label="Collapse sidebar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center border-b border-[var(--color-border)] py-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-expanded={!collapsed}
              aria-label="Expand sidebar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-medium text-[var(--color-text-secondary)]">
              Workspace
            </p>
          )}
          <nav aria-label="Main workspace">{renderNavList(MAIN_NAV, collapsed)}</nav>

          <div className="mt-6">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-medium text-[var(--color-text-secondary)]">
                Organization
              </p>
            )}
            <nav aria-label="Organization">{renderNavList(ORG_NAV, collapsed)}</nav>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] p-3 space-y-1">
          <button
            type="button"
            onClick={toggleTheme}
            title="Switch color theme"
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className={`flex min-h-10 w-full items-center gap-2.5 rounded-[7px] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {!collapsed && <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </button>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            title="Workspace help and shortcuts"
            aria-label="Open help and shortcuts"
            className={`flex min-h-10 w-full items-center gap-2.5 rounded-[7px] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Help &amp; shortcuts</span>}
          </button>

          <div className={`mt-2 flex items-center gap-2.5 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-2 ${collapsed ? "justify-center" : ""}`}>
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-accent-soft)] font-mono text-xs font-semibold text-[var(--color-accent-text)]"
            >
              {initialsFor(user.full_name)}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--color-text)]">{user.full_name}</p>
                <p className="truncate text-[11px] text-[var(--color-text-secondary)]">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main workspace column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {user.is_demo && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-2 text-xs text-[var(--color-accent-text)] sm:px-6">
            <p>
              <strong>Isolated demo workspace:</strong> {user.organization?.name || "Alder & Finch Systems (Demo)"} · Synthetic dataset with rule-based resume analysis.
            </p>
            <Link href="/demo" className="font-medium underline underline-offset-4">
              Switch demo role
            </Link>
          </div>
        )}

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={openMobileNav}
              aria-expanded={mobileOpen}
              aria-controls="workspace-mobile-drawer"
              className="inline-flex min-h-11 items-center gap-2 rounded-[7px] border border-[var(--color-border-strong)] px-3 text-sm font-medium text-[var(--color-text)] lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
              {crumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.href}>
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" aria-hidden="true" />}
                  {idx === crumbs.length - 1 ? (
                    <span className="truncate font-medium text-[var(--color-text)]">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="truncate text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              aria-label="Open command palette"
              className="inline-flex min-h-10 items-center gap-2.5 rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Search workspace...</span>
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/workspace/notifications"
              aria-label={`Notifications (${unreadCount} unread)`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 font-mono text-[10px] font-semibold text-[var(--color-accent-ink)]">
                  {unreadCount}
                </span>
              )}
            </Link>

            {canCreateJob && (
              <Link href="/workspace/jobs/new" className="hidden sm:inline-flex">
                <Button variant="primary" size="sm">
                  New job
                </Button>
              </Link>
            )}
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1320px]">{children}</div>
        </main>
      </div>

      {/* Mobile workspace navigation drawer */}
      <dialog
        ref={mobileDrawerRef}
        id="workspace-mobile-drawer"
        aria-label="Workspace navigation drawer"
        onClose={() => setMobileOpen(false)}
        onClick={(e) => {
          if (e.target === mobileDrawerRef.current) closeMobileNav();
        }}
        className="talentos-drawer"
      >
        <div className="flex min-h-dvh w-[min(86vw,300px)] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <BrandWordmark markSize={22} />
            <button
              type="button"
              onClick={closeMobileNav}
              autoFocus
              aria-label="Close workspace menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-[var(--color-border)] text-[var(--color-text)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto">
            <p className="mb-1.5 px-3 text-xs font-medium text-[var(--color-text-secondary)]">Workspace</p>
            {renderNavList(MAIN_NAV, false, closeMobileNav)}
            <p className="mt-5 mb-1.5 px-3 text-xs font-medium text-[var(--color-text-secondary)]">Organization</p>
            {renderNavList(ORG_NAV, false, closeMobileNav)}
          </div>
          <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-3">
            <div className="flex items-center justify-between px-2 text-xs">
              <span className="font-medium text-[var(--color-text)]">{user.full_name}</span>
              <StatusTag tone="neutral">{ROLE_LABELS[user.role]}</StatusTag>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={toggleTheme}>
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </dialog>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} canCreateJob={canCreateJob} />

      <NativeDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="TalentOS workspace guide"
        description="Keyboard shortcuts, role permissions, and responsible AI rules."
      >
        <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <div>
            <h2 className="font-semibold text-[var(--color-text)]">Keyboard navigation</h2>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono">Cmd/Ctrl + K</kbd> Open command palette to search jobs and candidates.</li>
              <li><kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono">Esc</kbd> Close any open modal or mobile drawer.</li>
              <li>Pipeline cards provide explicit stage-move controls alongside pointer drag-and-drop.</li>
            </ul>
          </div>
          <div className="rounded-[7px] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5 text-xs">
            <p className="font-semibold text-[var(--color-text)]">Responsible AI policy</p>
            <p className="mt-1">
              Resume extraction highlights verbatim evidence against job requirements. Only
              authorized human reviewers can move candidates to Hired or Rejected.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setHelpOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </NativeDialog>
    </div>
  );
}
