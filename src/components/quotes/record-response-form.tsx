"use client";

import { useActionState, useState } from "react";
import { markQuoteResponse } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";
import { ACCEPTED_VIA_LABELS, STAFF_ACCEPTED_VIAS } from "@/lib/labels";

// Staff logging an answer that arrived outside the link — a WhatsApp "yes",
// a signed PO, an email reply.
export function RecordResponseForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(markQuoteResponse.bind(null, quoteId), undefined);
  const [decision, setDecision] = useState<"ACCEPTED" | "DECLINED">("ACCEPTED");
  useActionToast(state, "Response recorded.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="response-decision">Decision</Label>
          <Select id="response-decision" name="decision" value={decision} onChange={(e) => setDecision(e.target.value as "ACCEPTED" | "DECLINED")}>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="response-via">Received via</Label>
          <Select id="response-via" name="acceptedVia" defaultValue="WHATSAPP">
            {STAFF_ACCEPTED_VIAS.map((via) => (
              <option key={via} value={via}>
                {ACCEPTED_VIA_LABELS[via]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="response-name">{decision === "ACCEPTED" ? "Accepted by" : "Declined by"} (optional)</Label>
        <Input id="response-name" name="acceptedByName" placeholder="Name of the person who replied" />
      </div>
      <div>
        <Label htmlFor="response-reference">Reference (optional)</Label>
        <Input id="response-reference" name="acceptedReference" placeholder="PO number, email subject, date of the message…" />
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Record response"}
      </Button>
    </form>
  );
}
