import * as React from "react";
import { cn } from "./utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[var(--color-accent)] text-[var(--color-accent-ink)] border border-transparent shadow-[0_1px_2px_rgba(15,23,21,0.12)] hover:bg-[var(--color-accent-hover)] active:scale-[0.985]",
      secondary:
        "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] shadow-[0_1px_2px_rgba(15,23,21,0.03)] hover:bg-[var(--color-surface-subtle)] active:scale-[0.985]",
      ghost:
        "bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:bg-[var(--color-glass-active)] hover:text-[var(--color-text)]",
      danger:
        "bg-[var(--color-error)] text-white border border-transparent shadow-[0_1px_2px_rgba(180,35,24,0.2)] hover:opacity-92 active:scale-[0.985]",
    };

    const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "min-h-9 px-3 text-xs font-medium rounded-[9px] gap-1.5",
      md: "min-h-10 px-4 text-sm font-medium rounded-[10px] gap-2",
      lg: "min-h-11 px-5 text-sm font-medium rounded-[11px] gap-2",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,transform,opacity] duration-150 disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={hasError || undefined}
      className={cn(
        "w-full min-h-10 rounded-[10px] border bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] transition-colors",
        hasError
          ? "border-[var(--color-error)]"
          : "border-[var(--color-border-strong)] hover:border-[var(--color-text-secondary)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={hasError || undefined}
      className={cn(
        "w-full min-h-24 rounded-[10px] border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] transition-colors",
        hasError
          ? "border-[var(--color-error)]"
          : "border-[var(--color-border-strong)] hover:border-[var(--color-text-secondary)]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={hasError || undefined}
      className={cn(
        "w-full min-h-10 rounded-[10px] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors",
        hasError
          ? "border-[var(--color-error)]"
          : "border-[var(--color-border-strong)] hover:border-[var(--color-text-secondary)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export interface StatusTagProps {
  tone?: "neutral" | "accent" | "success" | "warning" | "error";
  children: React.ReactNode;
  className?: string;
}

export function StatusTag({ tone = "neutral", children, className }: StatusTagProps) {
  const dotStyles: Record<NonNullable<StatusTagProps["tone"]>, string> = {
    neutral: "bg-[var(--color-text-secondary)]",
    accent: "bg-[var(--color-accent)]",
    success: "bg-[var(--color-success)]",
    warning: "bg-[var(--color-warning)]",
    error: "bg-[var(--color-error)]",
  };
  const textStyles: Record<NonNullable<StatusTagProps["tone"]>, string> = {
    neutral: "text-[var(--color-text-secondary)] bg-[var(--color-surface-subtle)] border-[var(--color-border)]",
    accent: "text-[var(--color-accent-text)] bg-[var(--color-accent-soft)] border-transparent",
    success: "text-[var(--color-accent-text)] bg-[var(--color-accent-soft)] border-transparent",
    warning: "text-[var(--color-warning)] bg-[var(--color-warning-soft)] border-transparent",
    error: "text-[var(--color-error)] bg-[var(--color-error-soft)] border-transparent",
  };
  const showDot = typeof children === "string";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[7px] border px-2 py-0.5 text-xs font-medium leading-5",
        textStyles[tone],
        className
      )}
    >
      {showDot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotStyles[tone])} />}
      {children}
    </span>
  );
}
