"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { BrandWordmark, Button } from "@talentos/ui";
import { useAuth } from "@/lib/auth-context";
import { getResolvedTheme } from "@/lib/theme";

const NAV_LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/features", label: "Features" },
  { href: "/careers", label: "Careers" },
  { href: "/about", label: "About" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { user, theme, toggleTheme } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const drawerRef = React.useRef<HTMLDialogElement | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const openDrawer = () => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
      setDrawerOpen(true);
    }
  };

  const closeDrawer = () => {
    const dialog = drawerRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    setDrawerOpen(false);
  };

  const resolvedTheme = mounted ? getResolvedTheme(theme) : "light";
  const workspaceHref = user
    ? user.account_type === "candidate"
      ? "/candidate"
      : "/workspace"
    : "/login";

  return (
    <>
      <div className="sticky top-3 z-40 px-4 sm:px-6 lg:px-8">
        <header className="surface-glass-nav mx-auto flex h-14 max-w-[1160px] items-center justify-between gap-4 rounded-[16px] px-3.5 sm:px-5">
          <Link
            href="/"
            aria-label="TalentOS home"
            className="inline-flex min-h-10 items-center rounded-[8px] pr-1"
          >
            <BrandWordmark markSize={22} />
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex h-9 items-center rounded-[9px] px-3 text-[13.5px] transition-colors ${
                    isActive
                      ? "bg-[var(--color-surface)] font-medium text-[var(--color-text)] shadow-[0_1px_2px_rgba(15,23,21,0.05)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
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
            <Link
              href={workspaceHref}
              className="inline-flex h-9 items-center rounded-[9px] px-3 text-[13.5px] font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-glass-active)]"
            >
              {user ? (user.account_type === "candidate" ? "Candidate portal" : "Open workspace") : "Sign in"}
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-9 items-center rounded-[10px] bg-[var(--color-accent)] px-3.5 text-[13.5px] font-medium text-[var(--color-accent-ink)] shadow-[0_1px_2px_rgba(15,23,21,0.12)] transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Try the demo
            </Link>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
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
              aria-controls="public-mobile-drawer"
              aria-label="Open navigation menu"
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 text-sm font-medium text-[var(--color-text)]"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>
        </header>
      </div>

      <dialog
        ref={drawerRef}
        id="public-mobile-drawer"
        aria-label="Mobile navigation"
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === drawerRef.current) closeDrawer();
        }}
        className="talentos-drawer"
      >
        <div className="surface-glass-overlay m-3 flex h-[calc(100dvh-24px)] w-[min(86vw,310px)] flex-col rounded-[20px] p-5">
          <div className="flex items-center justify-between pb-4">
            <BrandWordmark markSize={22} />
            <button
              type="button"
              onClick={closeDrawer}
              autoFocus
              aria-label="Close navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--color-text)] hover:bg-[var(--color-glass-active)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile links" className="mt-2 flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                className="flex min-h-11 items-center rounded-[10px] px-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-glass-active)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2.5 border-t border-[var(--color-border)] pt-4">
            <Link href={workspaceHref} onClick={closeDrawer} className="w-full">
              <Button variant="secondary" className="w-full">
                {user ? "Open workspace" : "Sign in"}
              </Button>
            </Link>
            <Link href="/demo" onClick={closeDrawer} className="w-full">
              <Button variant="primary" className="w-full">
                Try the demo
              </Button>
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
