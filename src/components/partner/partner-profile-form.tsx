"use client";

import { useActionState, useSyncExternalStore } from "react";
import { updatePartnerProfile } from "@/app/actions/partner-profile";
import { Label, Input, RequiredMark, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PHONE_FORMAT_HINT } from "@/lib/phone";
import { useActionToast } from "@/components/ui/toast";

// A fixed list of IANA zone names, the same in every environment (unlike
// the *current* zone below, it doesn't depend on where the browser
// actually is) — safe to compute once, and identically on the server and
// the client, so it can never cause a hydration mismatch.
const TIMEZONES = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

export function PartnerProfileForm({
  name,
  companyName,
  email,
  title,
  phone,
  timezone,
}: {
  name: string;
  companyName: string | null;
  email: string;
  title: string | null;
  phone: string | null;
  timezone: string | null;
}) {
  const [state, formAction, pending] = useActionState(updatePartnerProfile, undefined);
  useActionToast(state, "Profile updated.", { toastErrors: false });

  // After a successful save, the action's own returned value is the
  // source of truth for what's now saved — not the `timezone` prop.
  // Next's action-triggered page refresh (revalidatePath) resolves that
  // prop too late to rely on here: it can still hand the client a render
  // generated just before this mutation landed, one save behind.
  const savedTimezone = state && "success" in state ? state.timezone : timezone;

  // The browser's own timezone never changes at runtime, so this needs no
  // real subscription, just a way to read it after hydration without the
  // server (which has no browser timezone to agree with) and client
  // disagreeing about the very first render. Only ever used as a fallback
  // (see timezoneDefault below): a zone the partner's already saved is
  // never silently overwritten by it.
  const detectedTimezone = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
  const timezoneDefault = savedTimezone || detectedTimezone;

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

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        {/* Uncontrolled (defaultValue, not value+onChange) — matching
            Name/Company name/etc. above, and deliberately so: a
            React 19 action resets its <form> on a successful submit,
            reverting every field to its default. An uncontrolled field's
            default is a real "selected" attribute baked into the DOM, so
            that reset just reaffirms the same value; a controlled select's
            "selected" option only ever lives in React's virtual value, so
            the same reset would silently blank it out instead. Keying on
            timezoneDefault forces a fresh mount — and a fresh default —
            whenever the true value changes (after a save, or once the
            browser's own zone resolves post-hydration). */}
        <Select key={timezoneDefault} id="timezone" name="timezone" defaultValue={timezoneDefault}>
          <option value="">Select a timezone…</option>
          {!TIMEZONES.includes(timezoneDefault) && timezoneDefault && (
            <option value={timezoneDefault}>{timezoneDefault}</option>
          )}
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-slate-400">
          Detected from your browser — correct it if you&apos;re somewhere else. Used to show visitors whether your
          listings are open right now.
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
