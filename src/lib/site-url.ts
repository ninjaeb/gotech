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
