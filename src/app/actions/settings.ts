"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setCurrency } from "@/lib/settings";
import { CURRENCY_CODES } from "@/lib/currency";

const currencySchema = z.enum(CURRENCY_CODES as [string, ...string[]]);

export async function updateCurrency(formData: FormData) {
  const parsed = currencySchema.safeParse(formData.get("currency"));
  if (!parsed.success) {
    throw new Error("Invalid currency");
  }
  await setCurrency(parsed.data);
  revalidatePath("/", "layout");
}
