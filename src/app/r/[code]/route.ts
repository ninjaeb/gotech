import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { findPartnerByReferralCode } from "@/lib/referrals";
import { getReferralSettings } from "@/lib/settings";
import { firstHopValue } from "@/lib/site-url";

// A partner's share link: /r/<code>. Logs the visit as a ReferralClick and
// 302s to the marketing landing page with ?ref=<code> appended, where the
// lead-capture widget picks the code up and sends it back with any
// submission (see public/embed/lead-form.js). Going through the CRM first,
// rather than linking to the landing page with ?ref= directly, is what
// makes "clicks" countable at all — the landing page is someone else's
// site. Public (see src/proxy.ts): the visitor is a stranger, not a user.
//
// An unknown code still redirects, just without ?ref= — the visitor did
// nothing wrong and shouldn't land on an error page for a partner's typo.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [partner, settings] = await Promise.all([findPartnerByReferralCode(code), getReferralSettings()]);

  const target = new URL(settings.landingUrl);
  if (partner) {
    target.searchParams.set("ref", code.trim().toLowerCase());
    // A one-way hash, never the address itself — enough to approximate
    // unique visitors later without holding PII. Best-effort: a logging
    // failure must never turn into a broken link for the visitor.
    const ip = firstHopValue(request.headers.get("x-forwarded-for"));
    await db.referralClick
      .create({
        data: {
          partnerId: partner.id,
          ipHash: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null,
          userAgent: request.headers.get("user-agent")?.slice(0, 191) ?? null,
          referer: request.headers.get("referer")?.slice(0, 191) ?? null,
        },
      })
      .catch((error) => console.error("Failed to log referral click:", error));
  }

  return NextResponse.redirect(target, 302);
}
