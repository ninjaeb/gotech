import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DirectoryLanguageSwitcher } from "@/components/directory/directory-language-switcher";
import { DirectoryNavMenu, type DirectoryViewer } from "@/components/directory/directory-nav-menu";
import { businessLogout, logout } from "@/app/actions/auth";
import { getSessionPayload } from "@/lib/auth/session";
import { getBusinessSessionPayload } from "@/lib/business/session";
import { db } from "@/lib/db";
import { getDirectoryLocale } from "@/lib/directory-locale";
import {
  DIRECTORY_LOCALES,
  DIRECTORY_STRINGS,
  directoryHomePath,
  directorySignupPath,
  type DirectoryLocale,
} from "@/lib/directory-i18n";

// /system and /business each have their own session cookie (src/proxy.ts,
// src/lib/business/session.ts) — a visitor here can be signed into either,
// neither, or both at once, so the nav menu needs to check both
// independently rather than reading one shared session. Checked in this
// order (business first) since a signed-in business owner is this page's
// primary audience; a staff member who's also signed into /business would
// see "My business" here rather than "Go to CRM", but /system is still
// reachable directly by URL either way. A DB lookup for the staff case
// rather than trusting the cookie's userId alone, since role isn't (and
// shouldn't be) part of that JWT payload itself.
async function getDirectoryViewer(): Promise<DirectoryViewer> {
  const businessSession = await getBusinessSessionPayload();
  if (businessSession?.userId) return "business";

  const staffSession = await getSessionPayload();
  if (!staffSession?.userId) return null;
  const user = await db.user.findUnique({ where: { id: staffSession.userId }, select: { role: true } });
  return user && user.role !== "PARTNER" ? "staff" : null;
}

// The site-like header/footer (sticky nav, language + theme switches,
// hamburger menu, footer tagline) shared by every public-facing partner
// page — the directory itself, its listing pages, and the two forms that
// sit outside it (the locale-prefixed .../business/signup and the bare
// /business/login) — rather than the minimal centered-card wrapper the
// CRM's own /system/login and internal forms use. A partner filling in a
// form should feel like they're on the same site the whole way through,
// not dropped onto a bare page.
export async function DirectoryChrome({
  children,
  locale: localeProp,
  forceAnonymousNav = false,
}: {
  children: React.ReactNode;
  // Every /[locale]/business/... page passes its own already-validated URL
  // segment here, so the header renders in exactly that language with no
  // extra cookie lookup. Omitted by pages outside the locale-prefixed tree
  // (currently just /business/login, which still shares this same header)
  // — those fall back to the cookie/Accept-Language guess as before.
  locale?: DirectoryLocale;
  // /business/login sets this — a staff member's system_session is real,
  // but showing "Go to CRM" / "Sign out" right next to a "Sign in to your
  // business" form reads as if the page thinks you're already signed in
  // *here*, which you never legitimately are: proxyBusinessRoute already
  // redirects anyone holding a real business_session away from this page
  // before it renders, so the only session this page could otherwise show
  // is a staff one that has nothing to do with what it's asking for.
  forceAnonymousNav?: boolean;
}) {
  const [locale, viewer] = await Promise.all([
    localeProp ? Promise.resolve(localeProp) : getDirectoryLocale(),
    forceAnonymousNav ? Promise.resolve(null) : getDirectoryViewer(),
  ]);
  const t = DIRECTORY_STRINGS[locale];
  // Points into the real /[locale]/business/... tree when the current page
  // already knows its locale; otherwise the old bare /directory/* URL,
  // which now just permanently redirects there anyway (see
  // src/app/directory/page.tsx) — one extra hop only from a page like
  // /business/login that isn't part of the locale-prefixed tree itself.
  const directoryHref = localeProp ? directoryHomePath(localeProp) : "/directory";
  const signupHref = localeProp ? directorySignupPath(localeProp) : "/directory/signup";

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-8">
          <Link href={directoryHref} className="flex shrink-0 items-center gap-2">
            <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0" />
            {/* "Gotka" only ever showed the wordmark, not what this page
                actually is — dropped entirely on mobile to save space
                (the icon alone is enough there), and replaced with the
                localized "Business Directory" name on wider screens. */}
            <span className="hidden text-lg font-semibold text-slate-900 dark:text-slate-100 sm:inline">
              {t.brandName}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* useSearchParams() (see directory-language-switcher.tsx, for
                preserving the query string across a language swap) requires
                a Suspense boundary around anything that might otherwise be
                statically prerendered — the fallback is sized/styled the
                same as the real switcher so there's no visible flash. */}
            <Suspense
              fallback={
                <div className="flex gap-1" aria-hidden="true">
                  {DIRECTORY_LOCALES.map((option) => (
                    <span key={option.code} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {option.label}
                    </span>
                  ))}
                </div>
              }
            >
              <DirectoryLanguageSwitcher current={locale} />
            </Suspense>
            <ThemeToggle />
            <DirectoryNavMenu
              viewer={viewer}
              logoutAction={viewer === "business" ? businessLogout : logout}
              loginLabel={t.navLoginRegister}
              listBusinessLabel={t.listBusinessCta}
              directoryLabel={t.brandName}
              myBusinessLabel={t.navMyBusiness}
              goToCrmLabel={t.navGoToCrm}
              signOutLabel={t.navSignOut}
              directoryHref={directoryHref}
              signupHref={signupHref}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-8 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="w-full px-4 text-center text-sm text-slate-500 dark:text-slate-400 sm:px-8">
          <p>{t.footerTagline}</p>
          <p className="mt-1">
            <a
              href="https://gotka.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-petrol hover:underline dark:text-petrol-light"
            >
              gotka.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
