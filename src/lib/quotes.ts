import type { Prisma } from "@/generated/prisma/client";
import { lineTotal, sumMoney } from "@/lib/documents/money";

type Numeric = number | string | Prisma.Decimal;

// Thin wrappers over src/lib/documents/money.ts kept for the few callers
// that still total a template's items on the fly. Issued quotes carry a
// stored `total` — read that, never recompute.
export function lineItemTotal(item: { quantity: Numeric; unitPrice: Numeric }) {
  return lineTotal({ quantity: item.quantity.toString(), unitPrice: item.unitPrice.toString() });
}

export function quoteTotal(items: { quantity: Numeric; unitPrice: Numeric }[]) {
  return sumMoney(items.map((item) => lineItemTotal(item)));
}
