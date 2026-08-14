import type { Prisma } from "@/generated/prisma/client";

type Numeric = number | string | Prisma.Decimal;

export function lineItemTotal(item: { quantity: Numeric; unitPrice: Numeric }) {
  return Number(item.quantity) * Number(item.unitPrice);
}

export function quoteTotal(items: { quantity: Numeric; unitPrice: Numeric }[]) {
  return items.reduce((sum, item) => sum + lineItemTotal(item), 0);
}
