"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { respondToQuote } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

// The client's accept/decline on the public quote page. Accepting asks for a
// name (and optionally an email) and a tick on the terms, so the acceptance
// on record says who agreed and to what.
export function QuoteResponseButtons({ shareKey, hasTerms }: { shareKey: string; hasTerms: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "accepting" | "declining">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(decision: "ACCEPTED" | "DECLINED") {
    setError(null);
    setMode(decision === "ACCEPTED" ? "accepting" : "declining");
    startTransition(async () => {
      const result = await respondToQuote(shareKey, { decision, name, email, agreed });
      if (result?.error) {
        setError(result.error);
        setMode("idle");
        return;
      }
      router.refresh();
    });
  }

  if (mode === "accepting") {
    return (
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit("ACCEPTED");
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="accept-name">Your name</Label>
            <Input id="accept-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Full name" />
          </div>
          <div>
            <Label htmlFor="accept-email">Email (optional)</Label>
            <Input id="accept-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-neutral-700"
          />
          <span>I accept this quotation{hasTerms ? " and the terms above" : ""} on behalf of the client named on it.</span>
        </label>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isPending} className="flex-1">
            <Check className="h-4 w-4" />
            {isPending ? "Accepting…" : "Confirm acceptance"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode("idle")} disabled={isPending}>
            Back
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setMode("accepting")} disabled={isPending} className="flex-1">
          <Check className="h-4 w-4" />
          Accept this quote
        </Button>
        <Button variant="secondary" onClick={() => submit("DECLINED")} disabled={isPending} className="flex-1">
          <X className="h-4 w-4" />
          {isPending && mode === "declining" ? "Declining…" : "Decline"}
        </Button>
      </div>
    </div>
  );
}
