import { cache } from "react";
import { db } from "@/lib/db";

const SETTINGS_ID = "singleton";

export const getSettings = cache(async () => {
  const settings = await db.settings.findUnique({ where: { id: SETTINGS_ID } });
  return settings ?? { id: SETTINGS_ID, currency: "USD" };
});

export async function getCurrency() {
  const settings = await getSettings();
  return settings.currency;
}

export async function setCurrency(currency: string) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, currency },
    update: { currency },
  });
}
