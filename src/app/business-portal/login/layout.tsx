import { redirect } from "next/navigation";
import { getVerifiedPartnerOrNull } from "@/lib/auth/dal";
import { DirectoryChrome } from "@/components/directory/directory-chrome";

// Same site chrome as /directory and /directory/signup (see
// directory-chrome.tsx) — this is a sibling of the (dashboard) route group,
// so it doesn't inherit business/(dashboard)/layout.tsx's authenticated
// portal shell, and gets this instead rather than a bare page.
//
// A currently-valid partner session redirects away from here to the
// dashboard — verified against the database (getVerifiedPartnerOrNull),
// not just "a business_session cookie is present". This used to be a
// middleware-only check (proxyBusinessRoute in src/proxy.ts, cookie
// presence alone, no DB call), which meant a business_session cookie that
// had outlived the account behind it (role changed away from PARTNER, or
// the account deleted — the cookie is a stateless JWT good for 30 days
// with nothing to revoke it early) sent every visit here straight back to
// /business-portal, which itself immediately bounces a no-longer-valid
// session right back here — an infinite redirect loop with no way back to
// this form. Deciding it here instead, with the database as the source of
// truth, both fixes that loop and matches requirePartner's own reasoning
// downstream (a role that's since changed needs to sign in again at its
// own front door — it just needs to actually be *able* to reach that
// door).
//
// forceAnonymousNav: the only other "signed in" state the header could
// show here is an unrelated staff session, which would read as "Sign out"
// sitting right next to a "Sign in to your business" form. Always showing
// the signed-out nav here avoids that.
export default async function BusinessLoginLayout({ children }: { children: React.ReactNode }) {
  const partner = await getVerifiedPartnerOrNull();
  if (partner) redirect("/business-portal");

  return <DirectoryChrome forceAnonymousNav>{children}</DirectoryChrome>;
}
