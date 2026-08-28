// Shared between sidebar.tsx and mobile-nav.tsx, which each render their
// own nav shell but should list the same Settings sub-menu. Sales/Team/
// Forms & Booking/Integrations are admin-only pages themselves (each calls
// requireAdmin) — shown only to admins so a Developer's sub-menu doesn't
// list links that just bounce them. General and Changelog have content for
// every role, so they stay visible to both.
export const SETTINGS_SUB_ITEMS = [
  { href: "/settings", label: "General", adminOnly: false },
  { href: "/settings/sales", label: "Sales", adminOnly: true },
  { href: "/settings/team", label: "Team", adminOnly: true },
  { href: "/settings/forms", label: "Forms & Booking", adminOnly: true },
  { href: "/settings/integrations", label: "Integrations", adminOnly: true },
  { href: "/settings/changelog", label: "Changelog", adminOnly: false },
];
