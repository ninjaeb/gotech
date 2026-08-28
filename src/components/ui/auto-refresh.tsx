"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps a server-rendered page's data fresh while it's left open, for pages
// fed by something other than this browser's own actions (a webhook, another
// user) — where nothing on this page would otherwise trigger Next's usual
// post-action revalidation. Renders nothing; router.refresh() re-fetches the
// current route's Server Component tree without resetting client component
// state (e.g. an in-progress composer draft), since it only feeds fresh
// props to already-mounted components rather than remounting them.
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
