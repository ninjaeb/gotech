// Pure, dependency-free on purpose — no `db` import, unlike the rest of
// src/lib/directory.ts (which re-exports these). PartnerSlugForm is a
// client component and needs slugify at runtime (to turn a company name
// AI Auto Create just found into a suggested URL) — importing it from
// directory.ts would pull that file's own top-level `db` import (and
// everything Prisma needs) into the browser bundle, which Next can't
// chunk — hence this split, same reasoning as operating-hours.ts.

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 60;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Exported so every slug source — generateListingSlug (src/lib/directory.ts),
// a partner's own slug edit, and AI Auto Create's suggestion (both
// updateListingSlug/PartnerSlugForm in src/app/actions/directory.ts and
// src/components/directory/partner-slug-form.tsx) — normalizes the same
// way: typing "My Company!!" becomes "my-company" either way, rather than
// rejecting it and making the partner figure out valid syntax by hand.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents so "Jose" -> "jose"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

export function isValidSlugFormat(value: string): boolean {
  return value.length >= MIN_SLUG_LENGTH && value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}
