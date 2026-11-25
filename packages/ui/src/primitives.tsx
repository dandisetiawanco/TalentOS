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
        "bg-[var(--color-accent)] text-[var(--color-accent-ink)] border border-transparent hover:bg-[var(--color-accent-hover)] active:translate-y-px",
      secondary:
        "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)] active:translate-y-px",
      ghost:
        "bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]",
      danger:
        "bg-[var(--color-error)] text-white border border-transparent hover:opacity-90 active:translate-y-px",
    };

    const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "min-h-9 px-3 text-xs font-medium rounded-[6px] gap-1.5",
      md: "min-h-11 px-4 text-sm font-medium rounded-[7px] gap-2",
      lg: "min-h-12 px-5 text-sm font-medium rounded-[8px] gap-2",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150 disabled:opacity-50",
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
        "w-full min-h-11 rounded-[7px] border bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] transition-colors",
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
        "w-full min-h-24 rounded-[7px] border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] transition-colors",
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
        "w-full min-h-11 rounded-[7px] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors",
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
  const styles: Record<NonNullable<StatusTagProps["tone"]>, string> = {
    neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text)] border-[var(--color-border)]",
    accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] border-[var(--color-border)]",
    success: "bg-[var(--color-accent-soft)] text-[var(--color-success)] border-[var(--color-border)]",
    warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-border)]",
    error: "bg-[var(--color-error-soft)] text-[var(--color-error)] border-[var(--color-border)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs font-medium leading-5",
        styles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
