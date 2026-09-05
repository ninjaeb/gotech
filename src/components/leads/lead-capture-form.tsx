"use client";

import { useActionState, useState } from "react";
import { submitLead } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { PHONE_FORMAT_HINT } from "@/lib/phone";

export function LeadCaptureForm() {
  const [state, formAction, pending] = useActionState(submitLead, undefined);

  // Controlled fields, deliberately — React clears every uncontrolled
  // input back to empty once a Server Action dispatched from this form
  // resolves, success OR error. Without this, a validation failure (e.g.
  // a badly-formatted phone number) would wipe out the name/email/message
  // the visitor already typed, not just flag the one field that's wrong.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");

  if (state?.status === "success") {
    return (
      <p className="rounded-md bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        Thanks! We&apos;ll be in touch shortly.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot: hidden from real visitors, often filled in by bots. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

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
          placeholder="+60 12 345 6789"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">{PHONE_FORMAT_HINT}</p>
      </FieldGroup>
      <FieldGroup label="Company" htmlFor="companyName">
        <Input
          id="companyName"
          name="companyName"
          placeholder="Optional"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
        />
      </FieldGroup>
      <FieldGroup label="What are you looking to build?" htmlFor="message">
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Tell us a bit about your project…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </FieldGroup>

      {state?.status === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.message}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Get in touch"}
      </Button>
    </form>
  );
}
