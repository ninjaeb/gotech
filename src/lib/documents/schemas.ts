import { z } from "zod";
import { MONEY_RE, PERCENT_RE, QUANTITY_RE, type DiscountType } from "@/lib/documents/money";

// The line-item contract shared by quotes, quote templates and (next)
// invoices: LineItemsForm posts this shape as hidden `itemsJson`, every
// action parses it with this schema. Money fields stay strings so a value
// like 1.005 is rejected at the door instead of rounding differently in JS
// and MySQL.
export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Each line item needs a description").max(2000),
  quantity: z
    .string()
    .trim()
    .regex(QUANTITY_RE, "Quantity must be a number with at most 2 decimals")
    .refine((v) => Number(v) > 0, "Quantity must be greater than zero"),
  unitPrice: z.string().trim().regex(MONEY_RE, "Price must be a number with at most 2 decimals"),
  unit: z.string().trim().max(50).optional().nullable(),
  taxable: z.boolean().default(true),
  servicePackageId: z.string().trim().optional().nullable(),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;

export const DISCOUNT_TYPES: DiscountType[] = ["NONE", "PERCENT", "AMOUNT"];

export const discountSchema = z
  .object({
    discountType: z.enum(DISCOUNT_TYPES as [DiscountType, ...DiscountType[]]).default("NONE"),
    discountValue: z.string().trim().default("0"),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === "PERCENT" && !(PERCENT_RE.test(value.discountValue) && Number(value.discountValue) <= 100)) {
      ctx.addIssue({ code: "custom", message: "Discount must be a percent between 0 and 100", path: ["discountValue"] });
    }
    if (value.discountType === "AMOUNT" && !MONEY_RE.test(value.discountValue)) {
      ctx.addIssue({ code: "custom", message: "Discount must be an amount with at most 2 decimals", path: ["discountValue"] });
    }
  });

export const billToSchema = z.object({
  billToName: z.string().trim().max(191).optional(),
  billToCompany: z.string().trim().max(191).optional(),
  billToRegistrationNo: z.string().trim().max(191).optional(),
  billToAddress: z.string().trim().max(2000).optional(),
  billToEmail: z.string().trim().max(191).optional(),
});

export function parseItemsJson(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("itemsJson") || "[]"));
  } catch {
    throw new Error("Line items could not be read — try again.");
  }
}

export function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}
