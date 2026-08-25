"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";

const companyResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  url: z.string().trim().min(1, "URL is required"),
});

// Users paste links from all over (Google Docs, Slides, Drive, a client
// portal) and don't reliably include a scheme — treat a bare
// "docs.google.com/..." the same as "https://docs.google.com/...".
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export async function addCompanyResource(companyId: string, formData: FormData) {
  await requireAdminAction();
  const parsed = companyResourceSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid resource");
  }

  await db.companyResource.create({
    data: {
      companyId,
      title: parsed.data.title,
      url: normalizeUrl(parsed.data.url),
    },
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function updateCompanyResource(companyId: string, id: string, formData: FormData) {
  await requireAdminAction();
  const parsed = companyResourceSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid resource");
  }

  await db.companyResource.update({
    where: { id, companyId },
    data: {
      title: parsed.data.title,
      url: normalizeUrl(parsed.data.url),
    },
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyResource(companyId: string, id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.companyResource.delete({ where: { id, companyId } });
  revalidatePath(`/companies/${companyId}`);
}
