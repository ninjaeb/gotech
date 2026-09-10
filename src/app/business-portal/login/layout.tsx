import { DirectoryChrome } from "@/components/directory/directory-chrome";

// Same site chrome as /directory and /directory/signup (see
// directory-chrome.tsx) — this is a sibling of the (dashboard) route group,
// so it doesn't inherit business/(dashboard)/layout.tsx's authenticated
// portal shell, and gets this instead rather than a bare page.
//
// forceAnonymousNav: this page is only ever reached signed OUT of
// /business (a real business_session redirects away before it renders —
// see proxyBusinessRoute in src/proxy.ts), so the only "signed in" state
// the header could otherwise show is an unrelated staff session, which
// would read as "Sign out" sitting right next to a "Sign in to your
// business" form. Always showing the signed-out nav here avoids that.
export default function BusinessLoginLayout({ children }: { children: React.ReactNode }) {
  return <DirectoryChrome forceAnonymousNav>{children}</DirectoryChrome>;
}
