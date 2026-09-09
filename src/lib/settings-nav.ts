// Shared between sidebar.tsx and mobile-nav.tsx, which each render their
// own nav shell but should list the same Settings sub-menu. Sales/Team/
// Forms & Booking/Integrations are admin-only pages themselves (each calls
// requireAdmin) — shown only to admins so a Technical or Sales login's
// sub-menu doesn't list links that just bounce them. General and Changelog
// have content for every non-admin CRM role too (Partner never reaches
// Settings at all), so they stay visible to everyone else as well.
export const SETTINGS_SUB_ITEMS = [
  { href: "/settings", label: "General", adminOnly: false },
  { href: "/settings/sales", label: "Sales", adminOnly: true },
  { href: "/settings/newsletter", label: "Newsletter", adminOnly: true },
  { href: "/settings/team", label: "Team", adminOnly: true },
  { href: "/settings/forms", label: "Forms & Booking", adminOnly: true },
  { href: "/settings/referrals", label: "Referrals", adminOnly: true },
  { href: "/settings/directory", label: "Directory", adminOnly: true },
  { href: "/settings/integrations", label: "Integrations", adminOnly: true },
  { href: "/settings/changelog", label: "Changelog", adminOnly: false },
];
