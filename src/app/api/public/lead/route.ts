import { NextResponse, type NextRequest } from "next/server";
import { createLeadFromSubmission, leadSchema, type LeadFormErrorCode } from "@/lib/leads";
import { isRateLimited, isSuspiciouslyFast } from "@/lib/lead-spam-guard";
import { firstHopValue } from "@/lib/site-url";

// Public, cross-origin — called by the embeddable widget script
// (public/embed/lead-form.js) from whatever marketing-site domain it's
// dropped into, so CORS is wide open on purpose: there's no way to know
// embedding domains in advance. The honeypot field, the fast-fill check,
// and the IP rate limit are the abuse-resistance here, same as the hosted
// /lead page — see lead-spam-guard.ts for why each responds as it does.
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
      { ok: false, code: "invalid_submission" satisfies LeadFormErrorCode },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  // Honeypot — hidden from real visitors in the widget's own form, so
  // anything in it means a bot filled every field it could find. Pretend
  // success so it doesn't learn to retry.
  if (String(record.website ?? "").trim()) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }
  if (isSuspiciouslyFast(record.renderedAt)) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  if (isRateLimited(firstHopValue(request.headers.get("x-forwarded-for")))) {
    return NextResponse.json(
      { ok: false, code: "rate_limited" satisfies LeadFormErrorCode },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  const parsed = leadSchema.safeParse({
    name: record.name,
    email: record.email,
    phone: record.phone,
    companyName: record.companyName,
    message: record.message,
    ref: typeof record.ref === "string" && record.ref ? record.ref : undefined,
  });
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message as LeadFormErrorCode) ?? "invalid_submission";
    return NextResponse.json({ ok: false, code }, { status: 400, headers: CORS_HEADERS });
  }

  const result = await createLeadFromSubmission(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code }, { status: 500, headers: CORS_HEADERS });
  }
  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
