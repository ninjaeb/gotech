"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { withFlash } from "@/lib/utils";
import { WHATSAPP_ACCOUNT_ID } from "@/lib/whatsapp";
import { materializeWhatsAppBroadcastRecipients } from "@/lib/whatsapp-broadcast";

export type WhatsAppBroadcastFormState = { error: string } | undefined;

const broadcastSchema = z.object({
  headline: z.string().trim().min(1, "Headline is required"),
  link: z.string().trim().min(1, "Link is required").url("Enter a valid URL"),
  listId: z.string().trim().min(1, "Choose an audience"),
});

// Unlike Newsletter, there's no draft/schedule step here — a WhatsApp
// broadcast always sends as soon as it's created (materializing recipients
// and leaving the cron script, scripts/send-whatsapp-broadcasts.ts, to work
// through them), since a template-based send has no "compose now, send
// later" reason to exist the way a long-form email newsletter does.
export async function sendWhatsAppBroadcast(
  _prevState: WhatsAppBroadcastFormState,
  formData: FormData,
): Promise<WhatsAppBroadcastFormState> {
  const user = await requireAdminAction();
  const parsed = broadcastSchema.safeParse({
    headline: formData.get("headline"),
    link: formData.get("link"),
    listId: formData.get("listId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid broadcast" };
  }

  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (!account) {
    return { error: "WhatsApp Business isn't connected — see Settings → Integrations." };
  }

  const list = await db.contactList.findUnique({
    where: { id: parsed.data.listId },
    select: { id: true, type: true, filterDefinition: true },
  });
  if (!list) {
    return { error: "That list no longer exists — choose another." };
  }

  const broadcast = await db.whatsAppBroadcast.create({
    data: { headline: parsed.data.headline, link: parsed.data.link, listId: list.id, createdById: user.id },
  });

  const count = await materializeWhatsAppBroadcastRecipients(broadcast.id, list);
  if (count === 0) {
    // Nothing to send — delete rather than leave an empty, permanently
    // "Sending" broadcast around for the cron script to never finish.
    await db.whatsAppBroadcast.delete({ where: { id: broadcast.id } });
    return { error: "No eligible recipients in that list — everyone either has no phone on file or hasn't opted into WhatsApp." };
  }

  revalidatePath("/system/newsletters");
  redirect(withFlash("/system/newsletters", `Broadcast sending to ${count} recipient${count === 1 ? "" : "s"}.`));
}
