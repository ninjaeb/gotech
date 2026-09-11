// The one place quote/invoice money is computed. Pure and dependency-free —
// no Prisma, no server-only — so the exact same arithmetic runs in server
// actions (authoritative), the client line-item editor (live preview), cron
// scripts and tests. Everything is integer cents (BigInt where a product
// could exceed 2^53), rounded half-up once per named step, so the stored
// figures on a document can never disagree with each other.

export type Numeric = number | string;
export type DiscountType = "NONE" | "PERCENT" | "AMOUNT";

export type LineInput = { quantity: Numeric; unitPrice: Numeric; taxable: boolean };

export type Totals = {
  lineTotals: number[];
  subtotal: number;
  discountAmount: number;
  taxableBase: number;
  taxAmount: number;
  total: number;
};

// Form inputs arrive as strings; these are what the zod schemas enforce so
// nothing with more than two decimals (or a float artefact) reaches the DB.
export const MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/;
export const QUANTITY_RE = /^\d{1,8}(\.\d{1,2})?$/;
export const PERCENT_RE = /^\d{1,3}(\.\d{1,2})?$/;

// Hundredths of a unit, parsed digit-by-digit for strings so "0.1" never
// becomes 0.1000000001 on the way in.
export function toCents(x: Numeric): number {
  if (typeof x === "number") return Math.round(x * 100);
  const text = x.trim();
  if (!text) return 0;
  const negative = text.startsWith("-");
  const [intPart, fracPart = ""] = (negative ? text.slice(1) : text).split(".");
  const cents = Number(intPart || "0") * 100 + Number((fracPart + "00").slice(0, 2));
  return negative ? -cents : cents;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

// Half-up to 2dp (the sen convention), via integer math.
export function round2(n: number): number {
  return fromCents(Math.round(n * 100));
}

// "1500" → "1500.00", "12.5" → "12.50" — the canonical string written to a
// Decimal(12,2) column.
export function normalizeMoney(x: Numeric): string {
  const cents = toCents(x);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function halfUpDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === BigInt(0)) return BigInt(0);
  return (numerator * BigInt(2) + denominator) / (BigInt(2) * denominator);
}

function lineTotalCents(line: { quantity: Numeric; unitPrice: Numeric }): number {
  // quantity (2dp) × unitPrice (2dp) is exact to 4dp; round once.
  const product = BigInt(toCents(line.quantity)) * BigInt(toCents(line.unitPrice));
  return Number(halfUpDiv(product, BigInt(100)));
}

export function lineTotal(line: { quantity: Numeric; unitPrice: Numeric }): number {
  return fromCents(lineTotalCents(line));
}

export function computeTotals(
  lines: LineInput[],
  opts: { discountType: DiscountType; discountValue: Numeric; taxRate: Numeric },
): Totals {
  const lineCents = lines.map(lineTotalCents);
  const subtotalCents = lineCents.reduce((sum, c) => sum + c, 0);
  const taxableCents = lines.reduce((sum, line, i) => sum + (line.taxable ? lineCents[i] : 0), 0);

  let discountCents = 0;
  if (opts.discountType === "PERCENT") {
    // discountValue is a percent with up to 2dp → hundredths of a percent.
    const percentHundredths = BigInt(toCents(opts.discountValue));
    discountCents = Number(halfUpDiv(BigInt(subtotalCents) * percentHundredths, BigInt(10000)));
  } else if (opts.discountType === "AMOUNT") {
    discountCents = Math.min(toCents(opts.discountValue), subtotalCents);
  }

  // The discount is apportioned pro-rata across taxable and non-taxable
  // lines, so a discounted document isn't taxed on money never charged.
  const apportionedCents =
    subtotalCents === 0 ? 0 : Number(halfUpDiv(BigInt(discountCents) * BigInt(taxableCents), BigInt(subtotalCents)));
  const taxableBaseCents = taxableCents - apportionedCents;

  const rateHundredths = BigInt(toCents(opts.taxRate));
  const taxCents = rateHundredths > BigInt(0) ? Number(halfUpDiv(BigInt(taxableBaseCents) * rateHundredths, BigInt(10000))) : 0;

  return {
    lineTotals: lineCents.map(fromCents),
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(discountCents),
    taxableBase: fromCents(taxableBaseCents),
    taxAmount: fromCents(taxCents),
    total: fromCents(subtotalCents - discountCents + taxCents),
  };
}

// For tiles and rollups — never Number() + Number() over Decimal strings,
// which drifts by a sen after a few hundred rows.
export function sumMoney(values: Numeric[]): number {
  return fromCents(values.reduce<number>((sum, v) => sum + toCents(v), 0));
}
