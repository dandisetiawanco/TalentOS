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
  const [scrolled, setScrolled] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const drawerRef = React.useRef<HTMLDialogElement | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      <header
        className={`sticky top-0 z-40 transition-colors duration-150 ${
          scrolled
            ? "border-b border-[var(--color-border)] bg-[var(--color-canvas)]/95 backdrop-blur-sm"
            : "border-b border-transparent bg-[var(--color-canvas)]"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="TalentOS home"
            className="inline-flex min-h-11 items-center rounded-[6px] pr-2"
          >
            <BrandWordmark markSize={24} />
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-[6px] px-3.5 text-sm transition-colors ${
                    isActive
                      ? "font-medium text-[var(--color-text)] bg-[var(--color-surface-muted)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <Link
              href={workspaceHref}
              className="inline-flex min-h-11 items-center rounded-[7px] px-3.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
            >
              {user ? (user.account_type === "candidate" ? "Candidate portal" : "Open workspace") : "Sign in"}
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center rounded-[7px] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Explore demo
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
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
              className="inline-flex min-h-11 items-center gap-2 rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)]"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

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
        <div className="flex min-h-dvh w-[min(85vw,320px)] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <BrandWordmark markSize={22} />
            <button
              type="button"
              onClick={closeDrawer}
              autoFocus
              aria-label="Close navigation menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-[var(--color-border)] text-[var(--color-text)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile links" className="mt-4 flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                className="flex min-h-11 items-center rounded-[6px] px-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
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
                Explore demo
              </Button>
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
