import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDocumentNumber } from "@/lib/documents/numbering-format";

export type SequenceKey = "QUOTE" | "INVOICE";

// Rows are pre-seeded by migration, but a fresh install (or a stream added
// later) must never hit the allocator without one — createMany with
// skipDuplicates is a no-op when the row exists. Call this BEFORE the
// issuing transaction: an upsert inside it could be emulated by Prisma as
// select-then-insert and race on the very first number.
export async function ensureSequenceRow(key: SequenceKey): Promise<void> {
  await db.documentSequence.createMany({ data: [{ key }], skipDuplicates: true });
}

// Must run inside the transaction that issues the document. The UPDATE takes
// the InnoDB row lock until commit, so concurrent issuers serialise, and if
// the issue rolls back so does the counter — no gaps, no duplicates.
export async function allocateDocumentNumber(
  tx: Prisma.TransactionClient,
  key: SequenceKey,
  prefix: string,
  padding: number,
): Promise<string> {
  const row = await tx.documentSequence.update({
    where: { key },
    data: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  return formatDocumentNumber(prefix, row.nextNumber - 1, padding);
}

const RETRYABLE_CODES = new Set(["P2002", "P2034"]);

// One retry for a unique-key clash or an InnoDB deadlock/lock-wait
// (Prisma P2002 / P2034) — both mean two issuers collided, and the second
// attempt sees the first one's committed state.
export async function withIssueRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE_CODES.has(error.code)) {
      return await fn();
    }
    throw error;
  }
}

export const ISSUE_TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 10000 } as const;
