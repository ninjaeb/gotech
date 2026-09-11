// Date-only fields on documents (validUntil, issue/due dates) are stored as
// UTC midnight of the calendar day — the convention `new Date("YYYY-MM-DD")`
// already gives Invoice.dueDate — and are compared only against orgToday(),
// the org's own calendar day derived from Settings.bookingUtcOffsetMinutes.
// Render them with formatDocumentDate (UTC) rather than formatDate, which
// uses the host's timezone and would print the previous day on a US host.

export function orgToday(utcOffsetMinutes: number, now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + utcOffsetMinutes * 60_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

export function toDateOnly(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function toDateInput(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export type QuoteDerivedInput = {
  status: string;
  validUntil: Date | null;
  withdrawnAt: Date | null;
  supersededById: string | null;
};

export function isQuoteExpired(quote: QuoteDerivedInput, utcOffsetMinutes: number, now: Date = new Date()): boolean {
  if (quote.status !== "SENT" && quote.status !== "VIEWED") return false;
  if (quote.withdrawnAt || quote.supersededById || !quote.validUntil) return false;
  return quote.validUntil < orgToday(utcOffsetMinutes, now);
}

// The one derived state that matters for a badge or a guard, in priority
// order: a superseded quote is "replaced" even if it also expired.
export type QuoteDerivedState = "superseded" | "withdrawn" | "expired" | null;

export function quoteDerivedState(
  quote: QuoteDerivedInput,
  utcOffsetMinutes: number,
  now: Date = new Date(),
): QuoteDerivedState {
  if (quote.supersededById) return "superseded";
  if (quote.withdrawnAt) return "withdrawn";
  if (isQuoteExpired(quote, utcOffsetMinutes, now)) return "expired";
  return null;
}

// Whether the client can still accept or decline it.
export function isQuoteOpen(quote: QuoteDerivedInput, utcOffsetMinutes: number, now: Date = new Date()): boolean {
  return (quote.status === "SENT" || quote.status === "VIEWED") && quoteDerivedState(quote, utcOffsetMinutes, now) === null;
}

export type InvoiceDerivedInput = {
  status: string;
  dueDate: Date | null;
};

// Unlike Quote's withdrawn/superseded, VOID is a real stored InvoiceStatus
// (see that model's own doc comment) — nothing to derive for it here.
export function isInvoiceOverdue(invoice: InvoiceDerivedInput, utcOffsetMinutes: number, now: Date = new Date()): boolean {
  if (invoice.status !== "SENT" && invoice.status !== "VIEWED") return false;
  if (!invoice.dueDate) return false;
  return invoice.dueDate < orgToday(utcOffsetMinutes, now);
}

export type InvoiceDerivedState = "overdue" | null;

export function invoiceDerivedState(invoice: InvoiceDerivedInput, utcOffsetMinutes: number, now: Date = new Date()): InvoiceDerivedState {
  return isInvoiceOverdue(invoice, utcOffsetMinutes, now) ? "overdue" : null;
}
