import type { DocumentEventType } from "@/generated/prisma/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { parseEventPayload } from "@/lib/documents/events";
import { formatDateTime, formatDocumentDate, formatDocumentMoney } from "@/lib/format";
import { ACCEPTED_VIA_LABELS, DOCUMENT_EVENT_LABELS } from "@/lib/labels";
import type { AcceptedVia } from "@/generated/prisma/client";

type EventRow = {
  id: string;
  type: DocumentEventType;
  payload: string | null;
  actorLabel: string | null;
  createdAt: Date;
  actor: { name: string } | null;
};

// The audit trail under a document: who did what, when. Payload details are
// summarised per type; anything unrecognised just shows the label.
export function DocumentEventsCard({ events, currency }: { events: EventRow[]; currency: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardBody>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing recorded yet.</p>
        ) : (
          <ol className="space-y-2.5 text-sm">
            {events.map((event) => {
              const detail = describe(event, currency);
              return (
                <li key={event.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{DOCUMENT_EVENT_LABELS[event.type]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[event.actor?.name ?? event.actorLabel, detail].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400" dateTime={event.createdAt.toISOString()}>
                    {formatDateTime(event.createdAt)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function describe(event: EventRow, currency: string): string | null {
  const payload = parseEventPayload(event.payload);
  switch (event.type) {
    case "ISSUED": {
      const number = typeof payload.number === "string" ? payload.number : null;
      const revision = typeof payload.revision === "number" && payload.revision > 1 ? ` Rev ${payload.revision}` : "";
      const until = typeof payload.validUntil === "string" ? ` · valid until ${formatDocumentDate(payload.validUntil)}` : "";
      return number ? `${number}${revision}${until}` : null;
    }
    case "ACCEPTED":
    case "DECLINED": {
      const via = typeof payload.via === "string" ? ACCEPTED_VIA_LABELS[payload.via as AcceptedVia] : null;
      const reference = typeof payload.reference === "string" && payload.reference ? `ref. ${payload.reference}` : null;
      return [via, reference].filter(Boolean).join(" · ") || null;
    }
    case "WITHDRAWN":
      return typeof payload.reason === "string" ? payload.reason : null;
    case "VALIDITY_EXTENDED":
      return typeof payload.to === "string" ? `to ${formatDocumentDate(payload.to)}` : null;
    case "DEAL_VALUE_SYNCED":
      return typeof payload.from === "string" && typeof payload.to === "string"
        ? `${formatDocumentMoney(payload.from, currency)} → ${formatDocumentMoney(payload.to, currency)}`
        : null;
    case "SUPERSEDED":
      return typeof payload.revision === "number" ? `by Rev ${payload.revision}` : null;
    default:
      return null;
  }
}
