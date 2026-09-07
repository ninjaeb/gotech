import { NextResponse, type NextRequest } from "next/server";
import {
  subscribeToNewsletter,
  newsletterSubscribeSchema,
  type NewsletterSubscribeErrorCode,
} from "@/lib/newsletter-subscribe";
import { isRateLimited, isSuspiciouslyFast } from "@/lib/lead-spam-guard";
import { firstHopValue } from "@/lib/site-url";

// Public, cross-origin — called by the embeddable widget script
// (public/embed/newsletter-form.js) from whatever marketing-site domain
// it's dropped into, same reasoning as /api/public/lead: CORS is wide open
// since embedding domains can't be known in advance, and the honeypot/
// fast-fill/rate-limit checks are the abuse-resistance instead.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_submission" satisfies NewsletterSubscribeErrorCode },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if (String(record.website ?? "").trim()) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }
  if (isSuspiciouslyFast(record.renderedAt)) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  if (isRateLimited(firstHopValue(request.headers.get("x-forwarded-for")))) {
    return NextResponse.json(
      { ok: false, code: "rate_limited" satisfies NewsletterSubscribeErrorCode },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  const parsed = newsletterSubscribeSchema.safeParse({
    name: record.name,
    email: record.email,
  });
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message as NewsletterSubscribeErrorCode) ?? "invalid_submission";
    return NextResponse.json({ ok: false, code }, { status: 400, headers: CORS_HEADERS });
  }

  const result = await subscribeToNewsletter(parsed.data);
  if (!result.ok) {
    const status = result.code === "not_configured" ? 503 : 500;
    return NextResponse.json({ ok: false, code: result.code }, { status, headers: CORS_HEADERS });
  }
  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
