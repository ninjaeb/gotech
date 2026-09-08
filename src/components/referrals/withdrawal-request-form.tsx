"use client";

import { useActionState } from "react";
import { requestReferralWithdrawal } from "@/app/actions/referrals";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";

export function WithdrawalRequestForm({ availableLabel }: { availableLabel: string }) {
  const [state, formAction, pending] = useActionState(requestReferralWithdrawal, undefined);
  useActionToast(state, "Withdrawal requested — we'll let you know once it's paid.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="paymentDetails">How should we pay you?</Label>
        <Textarea
          id="paymentDetails"
          name="paymentDetails"
          required
          rows={3}
          placeholder="Bank name, account number and account holder name — or an e-wallet ID"
        />
        <p className="mt-1 text-xs text-slate-400">
          Requests the full available balance of {availableLabel}. Paid out manually by our team, then marked as
          paid here.
        </p>
      </div>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Requesting…" : `Request withdrawal of ${availableLabel}`}
      </Button>
    </form>
  );
}
