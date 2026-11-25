"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCheck,
  ChevronsUpDown,
  ExternalLink,
  HelpCircle,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import type { NotificationItem } from "@talentos/contracts";
import { ROLE_LABELS } from "@talentos/contracts";
import { BrandWordmark, Button, LoadingRegion, NativeDialog } from "@talentos/ui";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { getResolvedTheme } from "@/lib/theme";
import { formatDateTime, initialsFor } from "@/lib/format";
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

function getToolbarContext(pathname: string): { title: string; backHref?: string; backLabel?: string } {
  if (pathname === "/workspace") return { title: "Overview" };
  if (pathname === "/workspace/jobs") return { title: "Jobs" };
  if (pathname === "/workspace/jobs/new") return { title: "New opening", backHref: "/workspace/jobs", backLabel: "Jobs" };
  if (pathname.startsWith("/workspace/jobs/")) return { title: "Job details", backHref: "/workspace/jobs", backLabel: "Jobs" };
  if (pathname === "/workspace/candidates") return { title: "Candidates" };
  if (pathname.startsWith("/workspace/candidates/")) return { title: "Candidate dossier", backHref: "/workspace/candidates", backLabel: "Candidates" };
  if (pathname === "/workspace/pipeline") return { title: "Pipeline" };
  if (pathname === "/workspace/interviews") return { title: "Interviews" };
  if (pathname === "/workspace/analytics") return { title: "Analytics" };
  if (pathname === "/workspace/team") return { title: "Team" };
  if (pathname === "/workspace/notifications") return { title: "Notifications" };
  if (pathname === "/workspace/settings") return { title: "Settings" };
  return { title: "Workspace" };
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
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
        <LoadingRegion label="Opening workspace..." rows={4} />
      </div>
    );
  }

  const unreadList = (notifications || []).filter((n) => !n.is_read);
  const unreadCount = unreadList.length;
  const recentNotifications = (notifications || []).slice(0, 5);
  const resolvedTheme = mounted ? getResolvedTheme(theme) : "light";
  const toolbarContext = getToolbarContext(pathname);
  const canCreateJob = user.role === "organization_owner" || user.role === "recruiter";
  const orgName = user.organization?.name || "Alder & Finch Systems";

  const renderNavList = (items: typeof MAIN_NAV, compact: boolean, onSelect?: () => void, animated = true) => (
    <ul className="space-y-0.5">
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
              className={`group relative flex min-h-[38px] items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] transition-colors ${
                active
                  ? "font-medium text-[var(--color-text)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
              } ${compact ? "justify-center px-0" : ""}`}
            >
              {active &&
                (animated ? (
                  <motion.span
                    layoutId="workspace-nav-pill"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[10px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,21,0.06)] ring-1 ring-[var(--color-border)]"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[10px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,21,0.06)] ring-1 ring-[var(--color-border)]"
                  />
                ))}
              <Icon
                className={`relative z-10 h-4 w-4 shrink-0 transition-colors ${
                  active ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)]"
                }`}
                aria-hidden="true"
              />
              {!compact ? (
                <span className="relative z-10 truncate">{item.label}</span>
              ) : (
                <span className="sr-only">{item.label}</span>
              )}
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
    <div className="min-h-dvh flex">
      {/* Floating Liquid Glass Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className={`surface-glass-nav hidden lg:flex lg:sticky lg:top-3 lg:my-3 lg:ml-3 lg:h-[calc(100dvh-24px)] lg:flex-col lg:shrink-0 rounded-[18px] transition-[width] duration-200 ease-out ${
          collapsed ? "w-[70px]" : "w-[248px]"
        }`}
      >
        {/* Top brand + collapse control */}
        <div
          className={`flex h-14 items-center px-3.5 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link href="/workspace" aria-label="TalentOS workspace home" className="inline-flex min-h-10 items-center">
            <BrandWordmark markSize={22} compact={collapsed} />
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-expanded={!collapsed}
              aria-label="Collapse sidebar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-expanded={!collapsed}
              aria-label="Expand sidebar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Organization switcher */}
        <div className="px-2.5 pb-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`Organization: ${orgName}`}
                className={`flex w-full items-center gap-2.5 rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface)]/75 p-2 text-left transition-colors hover:bg-[var(--color-surface)] ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-accent-text)]"
                >
                  {initialsFor(orgName)}
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-[var(--color-text)]">
                        {orgName}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--color-text-secondary)]">
                        {user.is_demo ? "Demo workspace" : ROLE_LABELS[user.role]}
                      </span>
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
                  </>
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={6}
                align="start"
                className="surface-glass-overlay z-50 w-60 rounded-[14px] p-1.5 text-sm text-[var(--color-text)]"
              >
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-[var(--color-text)]">{orgName}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                    Signed in as {ROLE_LABELS[user.role]}
                  </p>
                </div>
                <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                <DropdownMenu.Item asChild>
                  <Link
                    href="/workspace/settings"
                    className="flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-xs font-medium text-[var(--color-text)] outline-none hover:bg-[var(--color-glass-active)] focus:bg-[var(--color-glass-active)]"
                  >
                    <Building2 className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" aria-hidden="true" />
                    Organization settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link
                    href="/careers"
                    className="flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-xs font-medium text-[var(--color-text)] outline-none hover:bg-[var(--color-glass-active)] focus:bg-[var(--color-glass-active)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" aria-hidden="true" />
                    Public careers board
                  </Link>
                </DropdownMenu.Item>
                {user.is_demo && (
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/demo"
                      className="flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-xs font-medium text-[var(--color-accent-text)] outline-none hover:bg-[var(--color-accent-soft)] focus:bg-[var(--color-accent-soft)]"
                    >
                      <Users className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                      Switch demo persona
                    </Link>
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Navigation lists */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2">
          <nav aria-label="Main workspace">{renderNavList(MAIN_NAV, collapsed)}</nav>

          <div className="my-4 h-px bg-[var(--color-border)] mx-2" />

          <nav aria-label="Organization">{renderNavList(ORG_NAV, collapsed)}</nav>
        </div>

        {/* Footer utilities + User profile */}
        <div className="border-t border-[var(--color-border)] p-2.5 space-y-1">
          <div className={`flex items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
            <button
              type="button"
              onClick={toggleTheme}
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className={`flex min-h-9 flex-1 items-center gap-2 rounded-[9px] px-2.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)] ${
                collapsed ? "w-full justify-center px-0" : ""
              }`}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              {!collapsed && <span>{resolvedTheme === "dark" ? "Light" : "Dark"}</span>}
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              title="Keyboard shortcuts and guide"
              aria-label="Open help and shortcuts"
              className={`flex min-h-9 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)] ${
                collapsed ? "w-full justify-center px-0" : ""
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Guide</span>}
            </button>
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-[11px] bg-[var(--color-glass-active)] p-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
            >
              {initialsFor(user.full_name)}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--color-text)]">{user.full_name}</p>
                <p className="truncate text-[11px] text-[var(--color-text-secondary)]">{ROLE_LABELS[user.role]}</p>
              </div>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Unified Floating Liquid Glass Toolbar */}
        <div className="sticky top-3 z-30 mx-3 mt-3 sm:mx-5 lg:mx-7">
          <header className="surface-glass-nav flex h-[54px] items-center justify-between gap-3 rounded-[14px] px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={openMobileNav}
                aria-expanded={mobileOpen}
                aria-controls="workspace-mobile-drawer"
                aria-label="Open workspace menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-glass-active)] lg:hidden"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>

              {toolbarContext.backHref ? (
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={toolbarContext.backHref}
                    className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{toolbarContext.backLabel}</span>
                  </Link>
                  <span className="truncate text-sm font-semibold tracking-[-0.01em] text-[var(--color-text)]">
                    {toolbarContext.title}
                  </span>
                </div>
              ) : (
                <span className="truncate text-sm font-semibold tracking-[-0.01em] text-[var(--color-text)]">
                  {toolbarContext.title}
                </span>
              )}

              {user.is_demo && (
                <Link
                  href="/demo"
                  className="hidden items-center gap-1.5 rounded-[8px] bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent-text)] transition-opacity hover:opacity-90 xl:inline-flex"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
                  <span>Demo session · Switch role</span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                aria-label="Open Spotlight search"
                className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] sm:min-w-[200px] sm:justify-between sm:px-3"
              >
                <span className="inline-flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Search workspace</span>
                </span>
                <kbd className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                  ⌘K
                </kbd>
              </button>

              {/* Glass Overlay Notification Center Popover */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label={`Notifications (${unreadCount} unread)`}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-surface)]" />
                    )}
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    sideOffset={8}
                    align="end"
                    className="surface-glass-overlay z-50 w-[min(92vw,340px)] rounded-[16px] p-2 text-sm text-[var(--color-text)]"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllRead.mutate()}
                          className="inline-flex items-center gap-1 rounded-[7px] px-2 py-1 text-[11px] font-medium text-[var(--color-accent-text)] hover:bg-[var(--color-accent-soft)]"
                        >
                          <CheckCheck className="h-3 w-3" aria-hidden="true" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="my-1 h-px bg-[var(--color-border)]" />
                    {recentNotifications.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-[var(--color-text-secondary)]">
                        You are all caught up.
                      </p>
                    ) : (
                      <div className="max-h-72 space-y-0.5 overflow-y-auto">
                        {recentNotifications.map((item) => (
                          <DropdownMenu.Item key={item.id} asChild>
                            <Link
                              href="/workspace/notifications"
                              className="block rounded-[10px] px-2.5 py-2 outline-none transition-colors hover:bg-[var(--color-glass-active)] focus:bg-[var(--color-glass-active)]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-[var(--color-text)]">{item.title}</p>
                                {!item.is_read && (
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-secondary)]">
                                {item.body}
                              </p>
                              <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
                                {formatDateTime(item.created_at)}
                              </p>
                            </Link>
                          </DropdownMenu.Item>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 border-t border-[var(--color-border)] pt-1.5">
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/workspace/notifications"
                          className="flex w-full items-center justify-center rounded-[9px] py-1.5 text-xs font-medium text-[var(--color-accent-text)] outline-none hover:bg-[var(--color-accent-soft)] focus:bg-[var(--color-accent-soft)]"
                        >
                          View all notifications
                        </Link>
                      </DropdownMenu.Item>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {canCreateJob && (
                <Link href="/workspace/jobs/new" className="hidden sm:inline-flex">
                  <Button variant="primary" size="sm">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    New job
                  </Button>
                </Link>
              )}
            </div>
          </header>
        </div>

        {/* Workspace Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1300px]">{children}</div>
        </main>
      </div>

      {/* Mobile Floating Glass Drawer */}
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
        <div className="surface-glass-overlay m-3 flex h-[calc(100dvh-24px)] w-[min(86vw,304px)] flex-col rounded-[20px] p-4">
          <div className="flex items-center justify-between pb-3">
            <BrandWordmark markSize={22} />
            <button
              type="button"
              onClick={closeMobileNav}
              autoFocus
              aria-label="Close workspace menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--color-text)] hover:bg-[var(--color-glass-active)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mb-3 rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2">
            <p className="truncate text-xs font-semibold text-[var(--color-text)]">{orgName}</p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {user.is_demo ? "Demo workspace" : ROLE_LABELS[user.role]}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderNavList(MAIN_NAV, false, closeMobileNav, false)}
            <div className="my-4 h-px bg-[var(--color-border)]" />
            {renderNavList(ORG_NAV, false, closeMobileNav, false)}
          </div>
          <div className="mt-4 space-y-2.5 border-t border-[var(--color-border)] pt-3">
            {user.is_demo && (
              <Link
                href="/demo"
                onClick={closeMobileNav}
                className="flex min-h-9 items-center justify-center rounded-[9px] bg-[var(--color-accent-soft)] text-xs font-medium text-[var(--color-accent-text)]"
              >
                Switch demo role
              </Link>
            )}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="truncate font-medium text-[var(--color-text)]">{user.full_name}</span>
              <span className="text-[var(--color-text-secondary)]">{ROLE_LABELS[user.role]}</span>
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
        title="Workspace guide"
        description="Keyboard shortcuts and human-led decision boundaries."
      >
        <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Shortcuts</h2>
            <ul className="mt-2 space-y-2 text-xs">
              <li className="flex items-center justify-between gap-2">
                <span>Open Spotlight search</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-text)]">
                    ⌘K
                  </kbd>
                  <span className="text-[var(--color-text-secondary)]">or</span>
                  <kbd className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-text)]">
                    Ctrl K
                  </kbd>
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Dismiss open window or menu</span>
                <kbd className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-text)]">
                  Esc
                </kbd>
              </li>
            </ul>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 text-xs leading-relaxed">
            <p className="font-semibold text-[var(--color-text)]">Human-led hiring decisions</p>
            <p className="mt-1">
              Resume analysis surfaces verbatim evidence against role requirements to assist review.
              Stage transitions to Hired or Rejected always require explicit human approval.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setHelpOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </NativeDialog>
    </div>
  );
}
