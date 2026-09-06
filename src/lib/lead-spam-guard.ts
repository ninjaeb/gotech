// Extra bot/spam resistance for the public lead form, layered on top of
// the honeypot field already checked by each caller (submitLead,
// /api/public/lead). Both checks below are deliberately silent to the
// caller when they trip — same reasoning as the honeypot's "pretend
// success" response: an error just teaches a bot to route around it,
// where a fake success doesn't.

// A bot that fills every field and submits within a fraction of a second
// of the form appearing didn't read anything — no human types this fast.
// Callers pass how long ago (ms, Date.now()-based) the visitor's form was
// first rendered; missing or malformed input counts as suspicious too,
// since a bot that never executed the page's JS won't have sent it.
export const MIN_FILL_MS = 1500;

export function isSuspiciouslyFast(renderedAtRaw: unknown): boolean {
  const renderedAt = Number(renderedAtRaw);
  if (!Number.isFinite(renderedAt)) return true;
  return Date.now() - renderedAt < MIN_FILL_MS;
}

// Per-IP throttle for submissions that get past the checks above — catches
// a scripted bot that waits out the timer and leaves the honeypot blank
// but still hammers the endpoint with different fake data each time.
// In-memory rather than a DB table: this is abuse mitigation, not a
// security boundary, so losing counts on a redeploy is harmless. Grows by
// one small entry per distinct IP that ever submits, with no eviction —
// fine at the volume a lead-gen contact form actually sees; a
// high-traffic public endpoint would need a real store or a cleanup sweep.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const attemptsByIp = new Map<string, number[]>();

export function isRateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const recent = (attemptsByIp.get(ip) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  attemptsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_ATTEMPTS;
}
