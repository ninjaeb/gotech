import "server-only";

import type { Prisma, DocumentEventType } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient | typeof db;

export type DocumentEventInput = {
  type: DocumentEventType;
  quoteId?: string;
  invoiceId?: string;
  actorId?: string | null;
  actorLabel?: string | null;
  payload?: Record<string, unknown> | null;
};

// Written inside the same transaction as the transition it records, so the
// audit trail can never show a step the document didn't actually take.
export async function logDocumentEvent(client: Client, event: DocumentEventInput): Promise<void> {
  await client.documentEvent.create({
    data: {
      type: event.type,
      quoteId: event.quoteId,
      invoiceId: event.invoiceId,
      actorId: event.actorId ?? null,
      actorLabel: event.actorLabel ?? null,
      payload: event.payload ? JSON.stringify(event.payload) : null,
    },
  });
}

export function parseEventPayload(payload: string | null): Record<string, unknown> {
  if (!payload) return {};
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
