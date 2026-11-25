import type { ApplicationStage } from "@talentos/contracts";

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "Recently";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatShortDate(iso);
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency = "USD"
): string {
  if (min == null && max == null) return "Compensation discussed during process";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  if (min != null && max != null) return `${fmt.format(min)} to ${fmt.format(max)}`;
  if (min != null) return `From ${fmt.format(min)}`;
  return `Up to ${fmt.format(max!)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function stageTone(stage: ApplicationStage | string): "neutral" | "accent" | "success" | "warning" | "error" {
  switch (stage) {
    case "hired":
      return "success";
    case "offer":
    case "interview":
      return "accent";
    case "shortlisted":
    case "screening":
      return "warning";
    case "rejected":
      return "error";
    default:
      return "neutral";
  }
}

export function jobStatusTone(status: string): "neutral" | "accent" | "success" | "warning" | "error" {
  switch (status) {
    case "published":
      return "success";
    case "paused":
      return "warning";
    case "closed":
      return "error";
    default:
      return "neutral";
  }
}

export function initialsFor(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, " ");
  const parts = cleaned
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) || "?").toUpperCase();
  if (parts.length === 2) return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}
