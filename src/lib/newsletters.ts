import { db } from "@/lib/db";
import { getListContacts } from "@/lib/contact-list-query";

type AudienceList = { id: string; type: "STATIC" | "DYNAMIC"; filterDefinition: unknown };

function eligibleContacts<T extends { email: string | null; emailOptOut: boolean }>(contacts: T[]): T[] {
  return contacts.filter((contact) => contact.email && !contact.emailOptOut);
}

// How many of a list's contacts would actually receive a newsletter right
// now — used for the compose form's live audience preview, so "50 contacts
// in this list" and "38 will receive this newsletter" can both be shown
// rather than surprising an admin at send time.
export async function getNewsletterAudienceCount(list: AudienceList): Promise<number> {
  const contacts = await getListContacts(list);
  return eligibleContacts(contacts).length;
}

// Snapshots a list's currently-eligible contacts into NewsletterRecipient
// rows — called once, when a newsletter is scheduled (including "send now"),
// not re-resolved at actual send time. That's deliberate: the audience size
// is then fixed and knowable, and the cron script's job simplifies to
// "work through this newsletter's PENDING rows" without needing to also
// re-run list membership logic every tick. skipDuplicates makes this safe
// to call more than once for the same newsletter (@@unique([newsletterId,
// contactId]) already exists for the same reason).
export async function materializeNewsletterRecipients(newsletterId: string, list: AudienceList): Promise<number> {
  const contacts = await getListContacts(list);
  const recipients = eligibleContacts(contacts);
  if (recipients.length === 0) return 0;

  await db.newsletterRecipient.createMany({
    data: recipients.map((contact) => ({ newsletterId, contactId: contact.id })),
    skipDuplicates: true,
  });
  return recipients.length;
}

// Same fixed-offset "shift then read UTC getters as local" trick as
// src/lib/booking.ts (see generateAvailableSlots) — timeZone: "UTC" on the
// formatter stops it from applying a second, real-timezone shift on top of
// the manual one already baked into `local`.
export function formatScheduledAt(date: Date, utcOffsetMinutes: number): string {
  const local = new Date(date.getTime() + utcOffsetMinutes * 60_000);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(local);
}
