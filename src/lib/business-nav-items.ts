// Every page in the business portal, in menu order — the single source of
// truth for both the portal's own hamburger (src/components/referrals/
// partner-nav.tsx) and the public directory's hamburger when a signed-in
// business owner is browsing it (src/components/directory/directory-nav-menu.tsx),
// so the two always list the same pages in the same order.
export const BUSINESS_NAV_ITEMS = [
  { href: "/business", label: "Overview" },
  { href: "/business/listings", label: "My listings" },
  { href: "/business/leads", label: "Leads" },
  { href: "/business/directory-leads", label: "Directory leads" },
  { href: "/business/commissions", label: "Commissions" },
  { href: "/business/profile", label: "Profile" },
] as const;
