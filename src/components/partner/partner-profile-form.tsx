"use client";

import { useActionState } from "react";
import { updatePartnerProfile } from "@/app/actions/partner-profile";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PHONE_FORMAT_HINT } from "@/lib/phone";
import { useActionToast } from "@/components/ui/toast";

export function PartnerProfileForm({
  name,
  companyName,
  email,
  title,
  phone,
}: {
  name: string;
  companyName: string | null;
  email: string;
  title: string | null;
  phone: string | null;
}) {
  const [state, formAction, pending] = useActionState(updatePartnerProfile, undefined);
  useActionToast(state, "Profile updated.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">
          Name
          <RequiredMark />
        </Label>
        <Input id="name" name="name" required defaultValue={name} />
      </div>

      <div>
        <Label htmlFor="companyName">
          Company name
          <RequiredMark />
        </Label>
        <Input id="companyName" name="companyName" required defaultValue={companyName ?? ""} />
      </div>

      <div>
        <Label htmlFor="email">
          Email
          <RequiredMark />
        </Label>
        <Input id="email" name="email" type="email" required defaultValue={email} />
        <p className="mt-1 text-xs text-slate-400">Used to sign in, and where nothing else applies.</p>
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={title ?? ""} />
      </div>

      <div>
        <Label htmlFor="phone">Contact phone</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} placeholder="+60 12 345 6789" />
        <p className="mt-1 text-xs text-slate-400">
          {PHONE_FORMAT_HINT} Used to WhatsApp you when a directory inquiry comes in — never shown on your public
          listing, and never given to visitors.
        </p>
      </div>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <Button
        type="submit"
        disabled={pending}
        className="bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
      >
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
