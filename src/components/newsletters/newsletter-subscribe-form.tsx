"use client";

import { useActionState, useState } from "react";
import { submitNewsletterSubscribe } from "@/app/actions/newsletter-subscribe";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";
import { PHONE_FORMAT_HINT } from "@/lib/phone";

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Name is required",
  email_required: "Email is required",
  email_invalid: "Enter a valid email",
  phone_required: "Phone number is required",
  phone_invalid: "Enter a valid phone number",
  channel_invalid: "Choose how you'd like to get updates",
  rate_limited: "Too many attempts — please try again later.",
  invalid_submission: "Please check the form and try again.",
  not_configured: "Subscriptions aren't set up yet — please try again shortly.",
  generic: "Something went wrong. Please try again.",
};

const CHANNEL_OPTIONS = [
  { key: "whatsapp" as const, label: "WhatsApp" },
  { key: "email" as const, label: "Email" },
];

// `pattern` makes the browser catch a bad email/phone with its own native
// validation popup at submit time — the same one it already shows for an
// empty required field — instead of only finding out from the server and
// showing that as a separate paragraph at the bottom of the form. The
// server (newsletterSubscribeSchema) is still the real authority — this is
// just so the common case never has to make a round trip to find out.
// Deliberately looser than the server's own isValidPhoneFormat/zod .email()
// checks (e.g. allows spaces/dashes in a phone number), since this only
// needs to catch "clearly not this kind of value" (letters in a phone
// number, no domain extension in an email), not fully replicate them.
//
// The parens/dot inside PHONE_PATTERN's character class MUST be escaped
// (\(, \), \.) — modern browsers compile the `pattern` attribute with
// regex's newer "v" (unicodeSets) flag, which treats an unescaped ( ) . -
// inside [...] as a syntax error. A pattern that fails to compile isn't
// enforced at all — the browser silently treats the field as always valid,
// which is exactly how a bare "aa" was slipping through unpatterned before
// this was caught and fixed.
const EMAIL_PATTERN = String.raw`^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`;
const PHONE_PATTERN = String.raw`^\+[1-9][0-9\s\(\)\.\-]{5,18}$`;

export function NewsletterSubscribeForm() {
  const [state, formAction, pending] = useActionState(submitNewsletterSubscribe, undefined);

  // Controlled, same reasoning as LeadCaptureForm: a validation error
  // shouldn't wipe out what the visitor already typed in the other field.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // A checkbox each, both checked by default, rather than a single Email/
  // WhatsApp/Both radio choice. toggleChannel refuses to leave both
  // unchecked — "opted into nothing" isn't a real choice, so there's no
  // channel_invalid state to design a message for, only two valid ones.
  const [channels, setChannels] = useState({ email: true, whatsapp: true });
  function toggleChannel(key: "email" | "whatsapp") {
    setChannels((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next.email || next.whatsapp ? next : prev;
    });
  }
  const channel = channels.email && channels.whatsapp ? "BOTH" : channels.email ? "EMAIL" : "WHATSAPP";

  // The server rejects a submission that arrives less than MIN_FILL_MS
  // after this — see lead-spam-guard.ts (shared with the lead form).
  const [renderedAt] = useState(() => Date.now());

  if (state?.status === "success") {
    return (
      <p className="rounded-md bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        You&apos;re subscribed — thanks for signing up!
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Subscribe</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Practical tips and guides to help grow your business — delivered however you prefer.
      </p>

      <form action={formAction} className="space-y-4">
        {/* Honeypot: hidden from real visitors, often filled in by bots. */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="website">Leave this field blank</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input type="hidden" name="renderedAt" value={renderedAt} />

        {/* Same 2-up grid the lead-capture form uses (1 column below sm,
        2 above), and the same Input component, so every field on this
        page is the exact same height/width behavior as /lead's. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              placeholder="Jane Smith"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Email" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              required
              pattern={EMAIL_PATTERN}
              title="Enter a full email address, including the domain, e.g. jane@company.com"
              placeholder="jane@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup label="Phone" htmlFor="phone" required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              pattern={PHONE_PATTERN}
              title={PHONE_FORMAT_HINT}
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">{PHONE_FORMAT_HINT}</p>
          </FieldGroup>
          <div>
            <input type="hidden" name="channel" value={channel} />
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Get updates via<span className="text-rose-500"> *</span>
            </span>
            <div className="grid h-11 grid-cols-2 gap-2">
              {CHANNEL_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className={`flex cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${
                    channels[option.key]
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300"
                      : "border-slate-300 text-slate-600 hover:border-slate-400 dark:border-neutral-700 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={channels[option.key]}
                    onChange={() => toggleChannel(option.key)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {state?.status === "error" && (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {ERROR_MESSAGES[state.code] ?? ERROR_MESSAGES.generic}
          </p>
        )}

        <div className="flex items-center gap-3">
          <p className="flex-1 text-xs text-slate-400">
            No spam, ever — unsubscribe from email or WhatsApp updates at any time.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Subscribing…" : "Subscribe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
