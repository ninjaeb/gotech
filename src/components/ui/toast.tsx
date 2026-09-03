"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "motion-reduce:animate-none pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2",
              toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
            )}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="min-w-0 flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastContextValue {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

// Shared wiring for the app's common useActionState shape:
// `{ error: string } | { success: true } | undefined`. Fires a toast the
// moment `state` transitions into a success or error variant (not on the
// initial pristine render, and not again on every re-render while it stays
// the same object) — pass a static or memoized successMessage.
//
// `toastErrors` defaults to true (most call sites had no error feedback at
// all before this). Pass false for forms that already show the error
// inline and should stay visible while the user fixes and resubmits,
// rather than also flashing past in a toast.
export function useActionToast(
  state: { error: string } | { success: true } | undefined,
  successMessage: string,
  { toastErrors = true }: { toastErrors?: boolean } = {},
) {
  const toast = useToast();
  const seenRef = useRef<typeof state>(undefined);

  useEffect(() => {
    if (state === seenRef.current) return;
    seenRef.current = state;
    if (!state) return;
    if ("success" in state) toast.success(successMessage);
    else if ("error" in state && toastErrors) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast identity is stable (memoized in ToastProvider), and re-running on a successMessage/toastErrors-only change is undesirable
  }, [state]);
}
