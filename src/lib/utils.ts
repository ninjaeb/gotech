import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// For a server action that redirect()s straight to a fresh page on success
// (create-then-view, or back to a list after a delete) — the submitting
// component unmounts before any useActionState result could render a
// toast, so the confirmation rides along as a one-shot query param instead.
// See src/components/ui/flash-toast.tsx for the reader that consumes it.
export function withFlash(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}flash=${encodeURIComponent(message)}`;
}
