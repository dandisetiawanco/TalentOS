"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
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
    <div className="min-h-dvh flex flex-col">
      {/* Floating Liquid Glass Candidate Navigation */}
      <div className="sticky top-3 z-30 px-4 sm:px-6">
        <header className="surface-glass-nav mx-auto flex h-14 max-w-[1060px] items-center justify-between gap-4 rounded-[16px] px-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/candidate"
              aria-label="TalentOS candidate portal home"
              className="inline-flex min-h-10 shrink-0 items-center gap-2"
            >
              <BrandWordmark markSize={22} />
            </Link>

            <nav aria-label="Candidate navigation" className="hidden items-center gap-0.5 lg:flex">
              {CANDIDATE_NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative inline-flex h-9 items-center rounded-[9px] px-3 text-[13.5px] transition-colors ${
                      active
                        ? "font-medium text-[var(--color-text)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="candidate-nav-pill"
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-[9px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,21,0.06)] ring-1 ring-[var(--color-border)]"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop actions switch to drawer below lg to prevent tablet overflow */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {user.is_demo && (
              <Link
                href="/demo"
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[var(--color-accent-soft)] px-2.5 text-xs font-medium text-[var(--color-accent-text)] transition-opacity hover:opacity-90"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
                <span>Demo · Switch</span>
              </Link>
            )}
            <Link
              href="/careers"
              className="inline-flex h-9 items-center whitespace-nowrap rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
            >
              Browse jobs
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              aria-label="Sign out"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>

          {/* Mobile & Tablet menu button */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--color-text)] hover:bg-[var(--color-glass-active)]"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={openDrawer}
              aria-expanded={drawerOpen}
              aria-controls="candidate-mobile-drawer"
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 text-sm font-medium text-[var(--color-text)]"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>
        </header>
      </div>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1060px] flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="mt-8 border-t border-[var(--color-border)] py-6">
        <div className="mx-auto flex max-w-[1060px] flex-wrap items-center justify-between gap-2 px-4 text-xs text-[var(--color-text-secondary)] sm:px-6">
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
        <div className="surface-glass-overlay m-3 flex h-[calc(100dvh-24px)] w-[min(86vw,304px)] flex-col rounded-[20px] p-4">
          <div className="flex items-center justify-between pb-3">
            <BrandWordmark markSize={22} />
            <button
              type="button"
              onClick={closeDrawer}
              autoFocus
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--color-text)] hover:bg-[var(--color-glass-active)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav className="mt-3 flex flex-col gap-1">
            {CANDIDATE_NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeDrawer}
                  className={`flex min-h-11 items-center rounded-[10px] px-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/careers"
              onClick={closeDrawer}
              className="mt-2 flex min-h-11 items-center rounded-[10px] px-3 text-sm font-medium text-[var(--color-accent-text)] hover:bg-[var(--color-accent-soft)]"
            >
              Browse open jobs
            </Link>
          </nav>
          <div className="mt-auto space-y-2.5 border-t border-[var(--color-border)] pt-4">
            {user.is_demo && (
              <Link
                href="/demo"
                onClick={closeDrawer}
                className="flex min-h-9 items-center justify-center rounded-[9px] bg-[var(--color-accent-soft)] text-xs font-medium text-[var(--color-accent-text)]"
              >
                Switch demo role
              </Link>
            )}
            <Button variant="secondary" className="w-full" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
