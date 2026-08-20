"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import type { PageType, SectionLayout } from "@/lib/section-layout";

const PAGE_TYPES: PageType[] = ["deal", "company", "contact"];

export async function updateSectionLayout(pageType: PageType, layout: SectionLayout) {
  if (!PAGE_TYPES.includes(pageType)) return;

  const currentUser = await getCurrentUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: { sectionLayout: true },
  });

  let all: Record<string, SectionLayout> = {};
  if (user.sectionLayout) {
    try {
      const parsed: unknown = JSON.parse(user.sectionLayout);
      if (typeof parsed === "object" && parsed !== null) all = parsed as Record<string, SectionLayout>;
    } catch {
      all = {};
    }
  }
  all[pageType] = layout;

  await db.user.update({
    where: { id: currentUser.id },
    data: { sectionLayout: JSON.stringify(all) },
  });
}
