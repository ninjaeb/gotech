// Deliberately not a full RFC-5322 validator — just enough to catch
// obviously broken entries (no @, no domain, no TLD, embedded spaces,
// multiple @ signs) without flagging real-world addresses as invalid.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_FORMAT.test(email.trim());
}
