// No `import "server-only"` — also used by scripts/sync-email.ts, a plain
// CLI entry point that runs outside Next's bundler (see email-crypto.ts).
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/email-crypto";
import type { EmailAccount } from "@/generated/prisma/client";

type SyncState = Record<string, number>; // folder path -> highest UID synced

function parseSyncState(json: string): SyncState {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as SyncState;
  } catch {
    // fall through
  }
  return {};
}

async function connectImap(host: string, port: number, secure: boolean, user: string, pass: string): Promise<ImapFlow> {
  const client = new ImapFlow({ host, port, secure, auth: { user, pass }, logger: false });
  await client.connect();
  return client;
}

async function connectSmtp(host: string, port: number, secure: boolean, user: string, pass: string) {
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function openImap(account: EmailAccount): Promise<ImapFlow> {
  return connectImap(
    account.imapHost,
    account.imapPort,
    account.imapSecure,
    account.username,
    decryptSecret(account.encryptedPassword),
  );
}

function openSmtp(account: EmailAccount) {
  return connectSmtp(
    account.smtpHost,
    account.smtpPort,
    account.smtpSecure,
    account.username,
    decryptSecret(account.encryptedPassword),
  );
}

export type EmailConnectionConfig = {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string; // plaintext — this runs before we've decided to encrypt+save anything
};

// Verifies both IMAP and SMTP actually accept the given credentials before
// we save them — a mailbox connection nobody can use is worse than no
// connection at all (silent, confusing sync failures every cron run).
export async function testEmailConnection(config: EmailConnectionConfig) {
  const imapClient = await connectImap(config.imapHost, config.imapPort, config.imapSecure, config.username, config.password);
  await imapClient.logout();

  const smtpTransport = await connectSmtp(config.smtpHost, config.smtpPort, config.smtpSecure, config.username, config.password);
  await smtpTransport.verify();
}

const COMMON_SENT_FOLDER_NAMES = ["Sent", "Sent Items", "INBOX.Sent", "[Gmail]/Sent Mail"];

async function findSentFolder(client: ImapFlow): Promise<string | null> {
  const mailboxes = await client.list();
  const bySpecialUse = mailboxes.find((mailbox) => mailbox.specialUse === "\\Sent");
  if (bySpecialUse) return bySpecialUse.path;
  const byName = mailboxes.find((mailbox) => COMMON_SENT_FOLDER_NAMES.includes(mailbox.path));
  return byName?.path ?? null;
}

function extractAddresses(...fields: (AddressObject | AddressObject[] | undefined)[]): string[] {
  const addresses = new Set<string>();
  for (const field of fields) {
    if (!field) continue;
    const list = Array.isArray(field) ? field : [field];
    for (const group of list) {
      for (const entry of group.value) {
        if (entry.address) addresses.add(entry.address.toLowerCase());
      }
    }
  }
  return [...addresses];
}

// When a matched contact has exactly one deal still open (not won/lost),
// attach the auto-logged activity to it too — unambiguous, so worth doing;
// two-or-more open deals would just be a guess, so we leave dealId unset.
async function findUnambiguousOpenDeal(contactId: string): Promise<string | null> {
  const openDeals = await db.deal.findMany({
    where: { contactId, pipelineStage: { isWon: false, isLost: false } },
    select: { id: true },
    take: 2,
  });
  return openDeals.length === 1 ? openDeals[0].id : null;
}

function snippet(text: string | undefined, max = 240): string {
  if (!text) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

async function syncFolder(
  client: ImapFlow,
  accountId: string,
  folder: string,
  direction: "received" | "sent",
  state: SyncState,
): Promise<{ logged: number }> {
  const lock = await client.getMailboxLock(folder);
  let logged = 0;
  try {
    const uidNext = client.mailbox && typeof client.mailbox === "object" ? client.mailbox.uidNext : undefined;
    if (uidNext === undefined) return { logged: 0 };

    const lastUid = state[folder];
    if (lastUid === undefined) {
      // First time seeing this folder: bootstrap the checkpoint at "now"
      // rather than importing the entire mailbox history.
      state[folder] = uidNext - 1;
      return { logged: 0 };
    }
    if (lastUid >= uidNext - 1) return { logged: 0 };

    let highestSeen = lastUid;
    for await (const message of client.fetch(`${lastUid + 1}:*`, { source: true, uid: true }, { uid: true })) {
      highestSeen = Math.max(highestSeen, message.uid);
      if (!message.source) continue;

      const parsed = await simpleParser(message.source);
      const addresses = extractAddresses(parsed.from, parsed.to, parsed.cc);
      if (addresses.length === 0) continue;

      const contacts = await db.contact.findMany({
        where: { email: { in: addresses } },
        select: { id: true },
      });

      for (const contact of contacts) {
        const externalId = `${accountId}:${folder}:${message.uid}:${contact.id}`;
        const dealId = await findUnambiguousOpenDeal(contact.id);
        const label = direction === "received" ? "Received" : "Sent";
        try {
          await db.activity.create({
            data: {
              type: "EMAIL",
              content: `${label} email — "${parsed.subject || "(no subject)"}"${
                parsed.text ? `: ${snippet(parsed.text)}` : ""
              }`,
              contactId: contact.id,
              dealId,
              externalId,
              createdAt: parsed.date ?? new Date(),
            },
          });
          logged += 1;
        } catch (error) {
          // P2002 = unique constraint violation on externalId — already logged.
          if (!(error instanceof Object && "code" in error && error.code === "P2002")) throw error;
        }
      }
    }
    state[folder] = Math.max(highestSeen, uidNext - 1);
  } finally {
    lock.release();
  }
  return { logged };
}

export async function syncEmailAccount(account: EmailAccount): Promise<{ logged: number }> {
  const client = await openImap(account);
  const state = parseSyncState(account.syncState);
  let totalLogged = 0;
  try {
    const results = [await syncFolder(client, account.id, "INBOX", "received", state)];
    const sentFolder = await findSentFolder(client);
    if (sentFolder) {
      results.push(await syncFolder(client, account.id, sentFolder, "sent", state));
    }
    totalLogged = results.reduce((sum, r) => sum + r.logged, 0);

    await db.emailAccount.update({
      where: { id: account.id },
      data: { syncState: JSON.stringify(state), lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (error) {
    await db.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncError: error instanceof Error ? error.message : "Sync failed" },
    });
    throw error;
  } finally {
    await client.logout().catch(() => {});
  }
  return { logged: totalLogged };
}

export async function sendEmailViaAccount(
  account: EmailAccount,
  message: { to: string; subject: string; text: string },
) {
  const transport = await openSmtp(account);
  await transport.sendMail({ from: account.email, to: message.to, subject: message.subject, text: message.text });
}

export { findUnambiguousOpenDeal };
