import { headers } from "next/headers";

// Builds an absolute URL for the incoming request's own host, for links that
// leave the app (quote share links sent over WhatsApp/email). cPanel's
// TLS-terminating proxy sets X-Forwarded-Proto/-Host (see server.js), so
// those take priority over the raw Host header, which would say http.
export async function getSiteOrigin() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

// Same job for a CLI script (send-task-digests-whatsapp.ts) instead of a
// request — there's no incoming Host header to read outside of Next's
// request context, so this needs its own env var. Optional everywhere else
// in the app (see site-url's other export), which is why it isn't just
// folded into DATABASE_URL/SESSION_SECRET's required set — only the WhatsApp
// task-reminder link needs it. Returns null, rather than guessing at
// localhost, so callers can skip the link entirely instead of sending a
// broken one.
export function getConfiguredSiteOrigin(): string | null {
  const url = process.env.SITE_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}
