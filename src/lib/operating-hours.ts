// Pure, dependency-free on purpose — no `db` import, unlike the rest of
// src/lib/directory.ts (which re-exports these). OperatingHoursEditor is a
// client component and needs DAYS_OF_WEEK/OperatingHours at runtime, not
// just as types; importing them from directory.ts would pull that file's
// own top-level `db` import (and everything Prisma needs) into the browser
// bundle, which Next can't chunk — hence this split.

// Google-My-Business-style structured hours — one entry per day, each
// either a single open/close range or null (closed). Times are stored and
// displayed as plain 24-hour "HH:mm" (matching <input type="time"> and
// schema.org's own openingHours format), so there's no locale-dependent
// AM/PM formatting to get wrong.
export const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type DayHours = { open: string; close: string } | null;
export type OperatingHours = Record<DayOfWeek, DayHours>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

function isValidDayHours(value: unknown): value is DayHours {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.open === "string" && isValidTimeString(raw.open) && typeof raw.close === "string" && isValidTimeString(raw.close);
}

// Tolerant parse-back for PartnerListing.operatingHours / a published
// snapshot's own copy of it — never trust a JSON column's shape at the
// type level. Every day present with valid shape but all closed reads the
// same as "never set" (null), since neither has anything worth showing.
export function operatingHoursFromJson(value: unknown): OperatingHours | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const result = {} as OperatingHours;
  let hasOpenDay = false;
  for (const day of DAYS_OF_WEEK) {
    const dayValue = raw[day] ?? null;
    if (!isValidDayHours(dayValue)) return null;
    result[day] = dayValue;
    if (dayValue) hasOpenDay = true;
  }
  return hasOpenDay ? result : null;
}

export type DayGroup = { days: DayOfWeek[]; hours: DayHours };

// Collapses runs of consecutive days sharing identical hours (or all
// closed) into single groups — "Monday–Friday: 09:00–18:00" instead of
// five separate lines — for both the human-readable display and the
// schema.org openingHours string this feeds (see buildJsonLd in
// src/app/directory/[slug]/page.tsx).
export function groupOperatingHours(hours: OperatingHours): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const day of DAYS_OF_WEEK) {
    const dayHours = hours[day];
    const last = groups[groups.length - 1];
    const sameAsLast = last && (last.hours === null ? dayHours === null : dayHours !== null && last.hours.open === dayHours.open && last.hours.close === dayHours.close);
    if (last && sameAsLast) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], hours: dayHours });
    }
  }
  return groups;
}

const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};

// schema.org's own openingHours format (e.g. "Mo-Fr 09:00-18:00") — only
// possible now that hours are structured data rather than free text.
// Closed days are simply omitted, same as schema.org's own convention:
// openingHours only ever lists when a place IS open.
export function formatOpeningHoursSchema(hours: OperatingHours): string[] {
  return groupOperatingHours(hours)
    .filter((group) => group.hours !== null)
    .map((group) => {
      const first = DAY_ABBREVIATIONS[group.days[0]];
      const last = DAY_ABBREVIATIONS[group.days[group.days.length - 1]];
      const dayRange = group.days.length > 1 ? `${first}-${last}` : first;
      return `${dayRange} ${group.hours!.open}-${group.hours!.close}`;
    });
}
