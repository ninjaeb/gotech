// No `import "server-only"` — also used by scripts/send-newsletters.ts, a
// plain CLI entry point that runs outside Next's bundler (same reasoning as
// email-crypto.ts and email.ts).
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/email-crypto";
import type { NewsletterSender } from "@/generated/prisma/client";

export function getNewsletterSender() {
  return db.newsletterSender.findUnique({ where: { id: "singleton" } });
}

export type NewsletterSmtpConfig = {
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string; // plaintext — this runs before we've decided to encrypt+save anything
};

// Verifies the SMTP credentials actually work before saving them — same
// reasoning as testEmailConnection in src/lib/email.ts, minus the IMAP half
// (nothing reads mail back through this account, so there's nothing to
// verify there).
export async function testNewsletterSmtp(config: NewsletterSmtpConfig) {
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.username, pass: config.password },
  });
  await transport.verify();
}

// One message at a time — see scripts/send-newsletters.ts for the batching/
// pacing around repeated calls to this. A fresh transport per call (rather
// than one pooled/reused connection) mirrors sendEmailViaAccount in
// src/lib/email.ts; the cron script's own inter-send delay is what actually
// protects the sending mailbox from provider rate limits, not connection
// reuse.
export async function sendNewsletterEmail(
  sender: NewsletterSender,
  message: {
    to: string;
    subject: string;
    text: string;
    html: string;
    // Overrides the sender's own configured name for this one send — e.g.
    // a partner directory reply shows the partner's company name rather
    // than Gotka's, even though the address underneath is still this one
    // shared mailbox. The address itself never changes: it's what actually
    // has to accept a bounce/reply.
    fromName?: string;
  },
) {
  const transport = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpSecure,
    auth: { user: sender.username, pass: decryptSecret(sender.encryptedPassword) },
  });
  await transport.sendMail({
    from: { name: message.fromName ?? sender.fromName, address: sender.fromEmail },
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
