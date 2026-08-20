"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

const dealResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  url: z.string().trim().min(1, "URL is required"),
});

// Users paste links from all over (Google Docs, Slides, Drive, a client
// portal) and don't reliably include a scheme — treat a bare
// "docs.google.com/..." the same as "https://docs.google.com/...".
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export async function addDealResource(dealId: string, formData: FormData) {
  const parsed = dealResourceSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid resource");
  }

  await db.dealResource.create({
    data: {
      dealId,
      title: parsed.data.title,
      url: normalizeUrl(parsed.data.url),
    },
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function deleteDealResource(dealId: string, id: string, formData: FormData) {
  void formData;
  await db.dealResource.delete({ where: { id, dealId } });
  revalidatePath(`/deals/${dealId}`);
}
