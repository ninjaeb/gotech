"use client";

import { useActionState } from "react";
import { submitLead } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";

export function LeadCaptureForm() {
  const [state, formAction, pending] = useActionState(submitLead, undefined);

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
        <Input id="name" name="name" required placeholder="Jane Smith" />
      </FieldGroup>
      <FieldGroup label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required placeholder="jane@company.com" />
      </FieldGroup>
      <FieldGroup label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" placeholder="Optional" />
      </FieldGroup>
      <FieldGroup label="Company" htmlFor="companyName">
        <Input id="companyName" name="companyName" placeholder="Optional" />
      </FieldGroup>
      <FieldGroup label="What are you looking to build?" htmlFor="message">
        <Textarea id="message" name="message" rows={4} placeholder="Tell us a bit about your project…" />
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
