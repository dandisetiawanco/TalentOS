"use client";

import * as React from "react";
import { cn } from "./utils";

interface NativeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  dismissOnBackdrop?: boolean;
}

/**
 * Accessible modal dialog built on the native HTML <dialog> element.
 * Avoids redundant role="dialog" / aria-modal attributes and preserves browser focus management.
 */
export function NativeDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  dismissOnBackdrop = true,
}: NativeDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleClose = () => {
      el.returnValue = "";
      onClose();
    };

    el.addEventListener("close", handleClose);

    // Fallback light-dismiss for browsers without native closedby="any" support.
    let pressedOutside = false;
    const isOutside = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return (
        ev.clientX < rect.left ||
        ev.clientX > rect.right ||
        ev.clientY < rect.top ||
        ev.clientY > rect.bottom
      );
    };
    const onPointerDown = (ev: PointerEvent) => {
      if (!dismissOnBackdrop) return;
      pressedOutside = isOutside(ev);
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (!dismissOnBackdrop) return;
      if (pressedOutside && isOutside(ev) && el.open) {
        el.close();
      }
      pressedOutside = false;
    };

    const supportsClosedBy = typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype;
    if (dismissOnBackdrop && !supportsClosedBy) {
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointerup", onPointerUp);
    }

    return () => {
      el.removeEventListener("close", handleClose);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [dismissOnBackdrop, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      {...({ closedby: dismissOnBackdrop ? "any" : "closerequest" } as Record<string, string>)}
      className={cn(
        "talentos-dialog m-auto w-[min(92vw,560px)] max-h-[88dvh] rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-0 text-[var(--color-text)] shadow-lg",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
        <div className="min-w-0">
          <h1 id={titleId} className="text-base font-semibold tracking-[-0.015em] text-[var(--color-text)]">
            {title}
          </h1>
          {description && (
            <p id={descId} className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close dialog"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
