"use client";

import { useEffect } from "react";

// A tab's already-loaded JS carries a fixed map of chunk IDs to files. If
// that map stops matching what the server actually has — a redeploy that
// replaced the build, or any other cause — the next chunk it tries to load
// fails, and there's no way to recover in place: the fix only exists in a
// fresh HTML/JS load, which retry() (re-rendering with the same stale
// runtime) can't provide. Reload once automatically so this resolves itself
// instead of leaving the user stuck on an error page. Gate it with a
// cooldown, not a one-shot flag: if reloading doesn't help (a real bug, not
// staleness), the same error fires again immediately, and without a cooldown
// that's an infinite reload loop instead of a fallback the user can act on.
const RELOAD_GUARD_KEY = "gotech-global-error-reload-at";
const RELOAD_COOLDOWN_MS = 10_000;

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk|failed to load chunk|infer type of chunk/i.test(error.message)
  );
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    let lastReloadAt = 0;
    try {
      lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0;
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — skip the
      // guard and just show the fallback UI below instead of reloading.
      return;
    }
    if (Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) return;
    try {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#1e293b",
          background: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#64748b", marginBottom: "1rem" }}>
            Reload the page to pick up the latest version.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              background: "#4f46e5",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
