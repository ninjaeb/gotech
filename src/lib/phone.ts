// Not the same job as whatsapp.ts's normalizePhone (which strips the "+"
// entirely to match WhatsApp's bare-digit wire format) — this one keeps
// the "+", since the point here is a clean *stored* standard, not a
// matching key. Strips spaces, dashes, and parentheses so people can type
// a number however feels natural ("+60 12-345 6789") while what's stored
// stays a single consistent shape ("+60123456789").
export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s\-()]/g, "");
}

// Loose E.164 shape after normalizing: a leading "+", then 7-15 digits.
// Not a full E.164/ITU validator (no per-country length/prefix rules) —
// just enough to enforce "country code with a + sign" as the standard.
const PHONE_FORMAT = /^\+[1-9]\d{6,14}$/;

export function isValidPhoneFormat(phone: string): boolean {
  return PHONE_FORMAT.test(normalizePhone(phone));
}

export const PHONE_FORMAT_HINT = "Include the country code with a + sign, e.g. +60 12 345 6789.";
