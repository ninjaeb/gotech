"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { respondToQuote } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";

export function QuoteResponseButtons({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingDecision, setPendingDecision] = useState<"ACCEPTED" | "DECLINED" | null>(null);

  function respond(decision: "ACCEPTED" | "DECLINED") {
    setPendingDecision(decision);
    startTransition(async () => {
      await respondToQuote(quoteId, decision);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => respond("ACCEPTED")} disabled={isPending} className="flex-1">
        <Check className="h-4 w-4" />
        {isPending && pendingDecision === "ACCEPTED" ? "Accepting…" : "Accept this quote"}
      </Button>
      <Button variant="secondary" onClick={() => respond("DECLINED")} disabled={isPending} className="flex-1">
        <X className="h-4 w-4" />
        {isPending && pendingDecision === "DECLINED" ? "Declining…" : "Decline"}
      </Button>
    </div>
  );
}
