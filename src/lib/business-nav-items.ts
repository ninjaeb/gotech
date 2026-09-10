// Every page in the business portal, in menu order — the single source of
// truth for both the portal's own hamburger (src/components/referrals/
// partner-nav.tsx) and the public directory's hamburger when a signed-in
// business owner is browsing it (src/components/directory/directory-nav-menu.tsx),
// so the two always list the same pages in the same order.
export const BUSINESS_NAV_ITEMS = [
  { href: "/business-portal", label: "Overview" },
  { href: "/business-portal/listings", label: "My listings" },
  { href: "/business-portal/leads", label: "Leads" },
  { href: "/business-portal/directory-leads", label: "Directory leads" },
  { href: "/business-portal/commissions", label: "Commissions" },
  { href: "/business-portal/profile", label: "Profile" },
] as const;
