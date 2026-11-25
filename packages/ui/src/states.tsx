import * as React from "react";
import { cn } from "./utils";

interface StatePanelProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "neutral" | "error";
  className?: string;
}

export function StatePanel({
  title,
  description,
  action,
  tone = "neutral",
  className,
}: StatePanelProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[14px] border p-6 text-left",
        tone === "error"
          ? "border-[var(--color-error)] bg-[var(--color-error-soft)]"
          : "surface-solid",
        className
      )}
    >
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-[8px] bg-[var(--color-surface-muted)]", className)}
    />
  );
}

export function LoadingRegion({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="surface-solid space-y-3 rounded-[14px] p-5">
      <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
      {Array.from({ length: rows }).map((_, idx) => (
        <SkeletonBlock key={idx} className={idx === 0 ? "h-5 w-2/3" : "h-10 w-full"} />
      ))}
    </div>
  );
}
