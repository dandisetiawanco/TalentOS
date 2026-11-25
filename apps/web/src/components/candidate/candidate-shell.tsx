"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { BrandWordmark, Button, LoadingRegion } from "@talentos/ui";
import { useAuth } from "@/lib/auth-context";
import { getResolvedTheme } from "@/lib/theme";

const CANDIDATE_NAV = [
  { href: "/candidate", label: "Home", exact: true },
  { href: "/candidate/applications", label: "Applications", exact: false },
  { href: "/candidate/interviews", label: "Interviews", exact: false },
  { href: "/candidate/documents", label: "Documents", exact: false },
  { href: "/candidate/profile", label: "Profile", exact: false },
  { href: "/candidate/settings", label: "Settings", exact: false },
];

export function CandidateShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, theme, toggleTheme, logout } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerRef = React.useRef<HTMLDialogElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.account_type !== "candidate") {
        router.replace("/workspace");
      }
    }
  }, [isLoading, router, user]);

  if (isLoading || !user || user.account_type !== "candidate") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <LoadingRegion label="Loading your candidate portal..." rows={4} />
      </div>
    );
  }

  const resolvedTheme = mounted ? getResolvedTheme(theme) : "light";

  const openDrawer = () => {
    if (drawerRef.current && !drawerRef.current.open) {
      drawerRef.current.showModal();
      setDrawerOpen(true);
    }
  };
  const closeDrawer = () => {
    if (drawerRef.current?.open) drawerRef.current.close();
    setDrawerOpen(false);
  };

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-canvas)]">
      {user.is_demo && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-2 text-xs text-[var(--color-accent-text)] sm:px-6">
          <p>
            <strong>Candidate demo session:</strong> Signed in as {user.full_name} (synthetic applicant dataset). Internal recruiter notes remain hidden.
          </p>
          <Link href="/demo" className="font-medium underline underline-offset-4">
            Switch demo role
          </Link>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/candidate" aria-label="TalentOS candidate portal home" className="inline-flex min-h-11 items-center gap-2">
              <BrandWordmark markSize={22} />
              <span className="hidden rounded-[4px] border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-text-secondary)] sm:inline">
                Candidate
              </span>
            </Link>

            <nav aria-label="Candidate navigation" className="hidden items-center gap-1 md:flex">
              {CANDIDATE_NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center rounded-[6px] px-3 text-sm transition-colors ${
                      active
                        ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent-text)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/careers"
              className="inline-flex min-h-10 items-center rounded-[6px] border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
            >
              Browse jobs
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              aria-label="Sign out"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[6px] px-2.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-[var(--color-border)] text-[var(--color-text)]"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={openDrawer}
              aria-expanded={drawerOpen}
              aria-controls="candidate-mobile-drawer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[7px] border border-[var(--color-border-strong)] px-3 text-sm font-medium text-[var(--color-text)]"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-5">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-2 px-4 text-xs text-[var(--color-text-secondary)] sm:px-6">
          <span>TalentOS Candidate Portal</span>
          <div className="flex gap-4">
            <Link href="/careers" className="hover:text-[var(--color-text)]">Open roles</Link>
            <Link href="/privacy" className="hover:text-[var(--color-text)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--color-text)]">Terms</Link>
          </div>
        </div>
      </footer>

      <dialog
        ref={drawerRef}
        id="candidate-mobile-drawer"
        aria-label="Candidate navigation drawer"
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === drawerRef.current) closeDrawer();
        }}
        className="talentos-drawer"
      >
        <div className="flex min-h-dvh w-[min(85vw,300px)] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <BrandWordmark markSize={22} />
            <button
              type="button"
              onClick={closeDrawer}
              autoFocus
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-[var(--color-border)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav className="mt-4 flex flex-col gap-1">
            {CANDIDATE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                className="flex min-h-11 items-center rounded-[6px] px-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/careers"
              onClick={closeDrawer}
              className="flex min-h-11 items-center rounded-[6px] px-3 text-sm font-medium text-[var(--color-accent-text)] hover:bg-[var(--color-accent-soft)]"
            >
              Browse open jobs
            </Link>
          </nav>
          <div className="mt-auto border-t border-[var(--color-border)] pt-4">
            <Button variant="secondary" className="w-full" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
