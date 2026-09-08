"use client";

import { useActionState, useState } from "react";
import { submitNewsletterSubscribe } from "@/app/actions/newsletter-subscribe";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Name is required",
  email_required: "Email is required",
  email_invalid: "Enter a valid email",
  phone_required: "Phone number is required",
  channel_invalid: "Choose how you'd like to get updates",
  rate_limited: "Too many attempts — please try again later.",
  invalid_submission: "Please check the form and try again.",
  not_configured: "Subscriptions aren't set up yet — please try again shortly.",
  generic: "Something went wrong. Please try again.",
};

const CHANNEL_OPTIONS = [
  { value: "BOTH", label: "Both" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
] as const;

export function NewsletterSubscribeForm() {
  const [state, formAction, pending] = useActionState(submitNewsletterSubscribe, undefined);

  // Controlled, same reasoning as LeadCaptureForm: a validation error
  // shouldn't wipe out what the visitor already typed in the other field.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNEL_OPTIONS)[number]["value"]>("BOTH");

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
        <FieldGroup label="Phone" htmlFor="phone" required>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </FieldGroup>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Get updates via<span className="text-rose-500"> *</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {CHANNEL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  channel === option.value
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300"
                    : "border-slate-300 text-slate-600 hover:border-slate-400 dark:border-neutral-700 dark:text-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  value={option.value}
                  checked={channel === option.value}
                  onChange={() => setChannel(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          No spam, ever — unsubscribe from email or WhatsApp updates at any time.
        </p>

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
