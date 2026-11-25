import * as React from "react";
import { cn } from "./utils";

interface BrandMarkProps {
  className?: string;
  size?: number;
  monochrome?: boolean;
}

export function BrandMark({ className, size = 28, monochrome = false }: BrandMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="4" y="5" width="24" height="5" rx="1.25" fill="currentColor" />
      <rect x="10" y="13.5" width="10" height="5" rx="1.25" fill="currentColor" />
      <rect x="13.5" y="18.5" width="5" height="8.5" rx="1.25" fill="currentColor" />
      <rect
        x="23"
        y="13.5"
        width="5"
        height="5"
        rx="1.25"
        fill={monochrome ? "currentColor" : "var(--color-accent)"}
        fillOpacity={monochrome ? 0.5 : 1}
      />
    </svg>
  );
}

interface BrandWordmarkProps {
  className?: string;
  markSize?: number;
  compact?: boolean;
}

export function BrandWordmark({ className, markSize = 26, compact = false }: BrandWordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[var(--color-text)]", className)}>
      <BrandMark size={markSize} />
      {!compact && (
        <span className="font-semibold tracking-[-0.03em] text-[1.0625rem] leading-none">
          Talent<span className="text-[var(--color-accent)]">OS</span>
        </span>
      )}
    </span>
  );
}
