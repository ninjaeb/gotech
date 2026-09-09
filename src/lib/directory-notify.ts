import { db } from "@/lib/db";
import { getNewsletterSender, sendNewsletterEmail } from "@/lib/newsletter-sender";
import { getSiteOrigin } from "@/lib/site-url";
import { textToHtml } from "@/lib/email";
import { notifyDirectoryLeadViaWhatsApp } from "@/lib/whatsapp";
import type { DirectoryLead, PartnerListing } from "@/generated/prisma/client";

// Fires once, right after a visitor's inquiry is saved. There's no CRM
// inbox a partner can see, so WhatsApp is the only *proactive* ping
// possible; email is the second channel regardless of whether WhatsApp
// fired, so a partner not actively watching the portal still hears about
// it. Every failure here is swallowed, same convention as every other
// proactive notifier in this app (see src/lib/whatsapp.ts) — the lead
// itself is already saved either way, this is best-effort on top of that.
export async function notifyPartnerOfNewLead(listing: PartnerListing, lead: DirectoryLead): Promise<void> {
  const path = `/partner/directory-leads/${lead.id}`;
  await notifyDirectoryLeadViaWhatsApp(listing.partnerId, lead.name, lead.company ?? "", path);

  const sender = await getNewsletterSender();
  if (!sender) return;
  const partner = await db.user.findUnique({ where: { id: listing.partnerId }, select: { email: true } });
  if (!partner) return;

  const link = `${await getSiteOrigin()}${path}`;
  const text =
    `${lead.name}${lead.company ? ` (${lead.company})` : ""} sent an inquiry through your ` +
    `${listing.companyName} listing:\n\n"${lead.message}"\n\nReply from your partner portal: ${link}`;
  try {
    await sendNewsletterEmail(sender, {
      to: partner.email,
      subject: `New inquiry: ${lead.name}${lead.company ? ` — ${lead.company}` : ""}`,
      text,
      html: textToHtml(text),
    });
  } catch (error) {
    console.error(
      `New directory lead email failed for partner ${listing.partnerId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

export type ReplyEmailResult = { sent: true } | { sent: false; error: string };

// The partner's reply, sent from Gotka's own system address (see
// src/lib/newsletter-sender.ts) with the partner's company name as the
// display name — never the partner's own address, since that's exactly the
// direct-contact detail this feature deliberately keeps out of the
// visitor's hands. Returns rather than throws so the caller can still save
// the reply row (with this as its sendError) even when delivery fails —
// the partner shouldn't lose what they wrote just because the send did.
export async function sendDirectoryLeadReply(
  listing: PartnerListing,
  lead: DirectoryLead,
  body: string,
): Promise<ReplyEmailResult> {
  const sender = await getNewsletterSender();
  if (!sender) {
    return {
      sent: false,
      error: "No system email sender is configured — ask an admin to set one up in Settings → Newsletter.",
    };
  }

  const text = `${body}\n\n—\n${listing.companyName}\n(sent via the Gotka partner directory)`;
  try {
    await sendNewsletterEmail(sender, {
      to: lead.email,
      subject: `Re: your inquiry to ${listing.companyName}`,
      text,
      html: textToHtml(text),
      fromName: listing.companyName,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Failed to send the reply email." };
  }
}
