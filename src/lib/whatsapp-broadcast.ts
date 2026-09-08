import { db } from "@/lib/db";
import { getListContacts } from "@/lib/contact-list-query";

// Must match an approved template in Meta Business Manager exactly — see
// the README's WhatsApp section for the submitted text. {{1}} is the
// broadcast's headline, {{2}} is its link — see WhatsAppBroadcast.headline
// / .link. A template, not plain text, since a marketing send is
// necessarily business-initiated and outside any contact's 24h reply
// window — same reasoning as the other sendWhatsAppTemplateMessage callers
// in src/lib/whatsapp.ts.
export const NEW_UPDATE_TEMPLATE_NAME = "gotech_new_update";
export const NEW_UPDATE_TEMPLATE_LANGUAGE = "en";

type AudienceList = { id: string; type: "STATIC" | "DYNAMIC"; filterDefinition: unknown };

function eligibleContacts<T extends { phone: string | null; whatsappMarketingOptIn: boolean }>(contacts: T[]): T[] {
  return contacts.filter((contact) => contact.phone && contact.whatsappMarketingOptIn);
}

// How many of a list's contacts would actually receive this broadcast —
// same role getNewsletterAudienceCount plays for the email side (see
// src/lib/newsletters.ts).
export async function getWhatsAppBroadcastAudienceCount(list: AudienceList): Promise<number> {
  const contacts = await getListContacts(list);
  return eligibleContacts(contacts).length;
}

// Snapshots a list's currently-eligible contacts into
// WhatsAppBroadcastRecipient rows — called once, right when the broadcast
// is created (this feature always sends immediately, no draft/schedule
// step), so the cron script (scripts/send-whatsapp-broadcasts.ts) has a
// fixed, resumable queue to work through instead of re-resolving list
// membership on every tick. skipDuplicates makes this safe to call more
// than once for the same broadcast.
export async function materializeWhatsAppBroadcastRecipients(broadcastId: string, list: AudienceList): Promise<number> {
  const contacts = await getListContacts(list);
  const recipients = eligibleContacts(contacts);
  if (recipients.length === 0) return 0;

  await db.whatsAppBroadcastRecipient.createMany({
    data: recipients.map((contact) => ({ broadcastId, contactId: contact.id })),
    skipDuplicates: true,
  });
  return recipients.length;
}
