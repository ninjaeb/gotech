// Every page in the business portal, split into the two groups a partner
// actually thinks in — running their own public listing, versus their
// referral partnership with Gotka — in menu order. The single source of
// truth for both the portal's own hamburger (src/components/referrals/
// partner-nav.tsx) and the public directory's hamburger when a signed-in
// business owner is browsing it (src/components/directory/directory-nav-menu.tsx),
// so the two always list the same pages, grouped and ordered the same way.
export const BUSINESS_NAV_ITEMS = [
  { href: "/business-portal", label: "Overview" },
  { href: "/business-portal/listings", label: "My listings" },
  { href: "/business-portal/directory-leads", label: "Directory leads" },
  { href: "/business-portal/profile", label: "Profile" },
] as const;

// The referral/affiliate side of the account — leads and commissions from
// referring Gotka itself, unrelated to the partner's own directory listing
// above.
export const PARTNERSHIP_NAV_ITEMS = [
  { href: "/business-portal/leads", label: "Partner Leads Status" },
  { href: "/business-portal/commissions", label: "Partner Commission" },
] as const;
