export function formatCurrency(value: number | string, currency: string = "USD") {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

// formatCurrency rounds to whole units, which is right for deal values and
// stats but not for money actually owed to someone — a commission of
// 123.45 has to show as 123.45, not 123.
export function formatCurrencyExact(value: number | string, currency: string = "USD") {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Money on a client-facing document: 2dp with the local symbol ("RM 1,200.00"
// rather than "MYR 1,200.00"), falling back to the ISO code for currencies
// the runtime has no narrow symbol for.
export function formatDocumentMoney(value: number | string, currency: string) {
  const num = typeof value === "string" ? Number(value) : value;
  try {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return formatCurrencyExact(num, currency);
  }
}

// Date-only document fields are stored as UTC midnight (see
// src/lib/documents/dates.ts) — format them in UTC so the calendar day never
// shifts with the server's timezone.
export function formatDocumentDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

// WhatsApp's click-to-chat scheme wants the number as bare digits
// (country code included, no "+", spaces, or punctuation).
export function whatsAppUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function fullName(firstName: string, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

// Inverse of fullName: a visitor types one "Name" field, we store first/last
// separately like every other Contact source in this app.
export function splitFullName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Elapsed time between two instants, in the coarsest useful unit — a lead
// open for 40 minutes reads as "40m", one open a week reads as "5d", not a
// full calendar breakdown or "10080m". For "how long has this been open/
// running" style displays: pass now() (the default) as `to` while still
// running, or a fixed end instant (e.g. closedAt) once it's done, so the
// count freezes rather than continuing to grow after the fact.
export function formatDuration(from: Date | string, to: Date | string = new Date()): string {
  const start = typeof from === "string" ? new Date(from) : from;
  const end = typeof to === "string" ? new Date(to) : to;
  const minutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

export function relativeToToday(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}
