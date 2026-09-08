"use client";

import { useActionState, useState } from "react";
import { submitNewsletterSubscribe } from "@/app/actions/newsletter-subscribe";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Name is required",
  email_required: "Email is required",
  email_invalid: "Enter a valid email",
  rate_limited: "Too many attempts — please try again later.",
  invalid_submission: "Please check the form and try again.",
  not_configured: "Subscriptions aren't set up yet — please try again shortly.",
  generic: "Something went wrong. Please try again.",
};

export function NewsletterSubscribeForm() {
  const [state, formAction, pending] = useActionState(submitNewsletterSubscribe, undefined);

  // Controlled, same reasoning as LeadCaptureForm: a validation error
  // shouldn't wipe out what the visitor already typed in the other field.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Get our updates by email.</p>

      <form action={formAction} className="space-y-4">
        {/* Honeypot: hidden from real visitors, often filled in by bots. */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="website">Leave this field blank</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input type="hidden" name="renderedAt" value={renderedAt} />

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
            placeholder="jane@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Phone" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </FieldGroup>

        {state?.status === "error" && (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {ERROR_MESSAGES[state.code] ?? ERROR_MESSAGES.generic}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </form>
    </div>
  );
}
