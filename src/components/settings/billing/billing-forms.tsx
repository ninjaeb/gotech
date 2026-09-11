"use client";

import { useActionState, useState } from "react";
import {
  updateBusinessDetails,
  updateDocumentDefaults,
  updateNumberingSettings,
  updateTaxSettings,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";
import { formatDocumentNumber } from "@/lib/documents/numbering-format";
import type { BillingSettings } from "@/lib/settings";

function ErrorLine({ state }: { state: { error: string } | { success: true } | undefined }) {
  return state && "error" in state ? <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p> : null;
}

export function BusinessDetailsForm({ settings, logoUrl }: { settings: BillingSettings; logoUrl: string | null }) {
  const [state, formAction, pending] = useActionState(updateBusinessDetails, undefined);
  useActionToast(state, "Business details saved.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="businessName">Business name (as printed on documents)</Label>
          <Input id="businessName" name="businessName" defaultValue={settings.businessName} placeholder="Gotka Sdn. Bhd." />
        </div>
        <div>
          <Label htmlFor="businessRegistrationNo">Registration no. (SSM)</Label>
          <Input id="businessRegistrationNo" name="businessRegistrationNo" defaultValue={settings.businessRegistrationNo ?? ""} placeholder="202301012345 (1234567-X)" />
        </div>
        <div>
          <Label htmlFor="businessPhone">Phone</Label>
          <Input id="businessPhone" name="businessPhone" defaultValue={settings.businessPhone ?? ""} />
        </div>
        <div>
          <Label htmlFor="businessEmail">Email</Label>
          <Input id="businessEmail" name="businessEmail" type="email" defaultValue={settings.businessEmail ?? ""} />
        </div>
        <div>
          <Label htmlFor="businessWebsite">Website</Label>
          <Input id="businessWebsite" name="businessWebsite" defaultValue={settings.businessWebsite ?? ""} placeholder="gotka.com" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="businessAddress">Address</Label>
          <Textarea id="businessAddress" name="businessAddress" rows={3} defaultValue={settings.businessAddress ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="logo">Logo</Label>
          <div className="flex flex-wrap items-center gap-4">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- our own blob route
              <img src={logoUrl} alt="Current logo" className="h-12 w-auto max-w-[8rem] rounded border border-slate-200 object-contain p-1 dark:border-neutral-800" />
            )}
            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="text-sm text-slate-600 dark:text-slate-400" />
            {logoUrl && (
              <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                <input type="checkbox" name="removeLogo" className="h-4 w-4 rounded border-slate-300 dark:border-neutral-700" />
                Remove logo
              </label>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">PNG, JPEG, WebP or SVG, up to 1 MB. Printed at the top of every quote and invoice.</p>
        </div>
      </div>
      <ErrorLine state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function TaxSettingsForm({ settings }: { settings: BillingSettings }) {
  const [state, formAction, pending] = useActionState(updateTaxSettings, undefined);
  useActionToast(state, "Tax settings saved.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="taxLabel">Tax label</Label>
          <Input id="taxLabel" name="taxLabel" defaultValue={settings.taxLabel} placeholder="SST" />
        </div>
        <div>
          <Label htmlFor="taxRate">Rate (%)</Label>
          <Input id="taxRate" name="taxRate" type="number" min="0" max="100" step="0.01" inputMode="decimal" defaultValue={settings.taxRate} />
        </div>
        <div>
          <Label htmlFor="taxRegistrationNo">Tax registration no.</Label>
          <Input id="taxRegistrationNo" name="taxRegistrationNo" defaultValue={settings.taxRegistrationNo ?? ""} placeholder="W10-1808-12345678" />
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Leave the rate at 0 until the business is registered — no tax line is printed and the per-line &quot;taxable&quot; controls stay hidden.
        Documents already issued keep the rate they were issued with.
      </p>
      <ErrorLine state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function NumberingForm({
  settings,
  nextQuoteNumber,
  nextInvoiceNumber,
}: {
  settings: BillingSettings;
  nextQuoteNumber: number;
  nextInvoiceNumber: number;
}) {
  const [state, formAction, pending] = useActionState(updateNumberingSettings, undefined);
  useActionToast(state, "Numbering saved.", { toastErrors: false });
  const [quotePrefix, setQuotePrefix] = useState(settings.quoteNumberPrefix);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoiceNumberPrefix);
  const [padding, setPadding] = useState(String(settings.numberPadding));
  const pad = Math.min(8, Math.max(3, Number(padding) || 4));

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="quoteNumberPrefix">Quote prefix</Label>
          <Input id="quoteNumberPrefix" name="quoteNumberPrefix" value={quotePrefix} onChange={(e) => setQuotePrefix(e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">Next: {formatDocumentNumber(quotePrefix, nextQuoteNumber, pad)}</p>
        </div>
        <div>
          <Label htmlFor="invoiceNumberPrefix">Invoice prefix</Label>
          <Input id="invoiceNumberPrefix" name="invoiceNumberPrefix" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">Next: {formatDocumentNumber(invoicePrefix, nextInvoiceNumber, pad)}</p>
        </div>
        <div>
          <Label htmlFor="numberPadding">Digits</Label>
          <Input id="numberPadding" name="numberPadding" type="number" min="3" max="8" value={padding} onChange={(e) => setPadding(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Numbers run continuously and are never reused — a quote gets its number the moment it&apos;s issued, never as a draft. Changing the prefix
        or digits only affects numbers issued from then on.
      </p>
      <ErrorLine state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function DocumentDefaultsForm({ settings }: { settings: BillingSettings }) {
  const [state, formAction, pending] = useActionState(updateDocumentDefaults, undefined);
  useActionToast(state, "Defaults saved.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="quoteValidityDays">Quotes valid for (days)</Label>
          <Input id="quoteValidityDays" name="quoteValidityDays" type="number" min="1" max="365" defaultValue={settings.quoteValidityDays} />
        </div>
        <div>
          <Label htmlFor="invoiceDueDays">Invoices due in (days)</Label>
          <Input id="invoiceDueDays" name="invoiceDueDays" type="number" min="0" max="365" defaultValue={settings.invoiceDueDays} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="defaultQuoteTerms">Default quote terms</Label>
          <Textarea id="defaultQuoteTerms" name="defaultQuoteTerms" rows={4} defaultValue={settings.defaultQuoteTerms ?? ""} placeholder="50% deposit to commence, balance on completion…" />
          <p className="mt-1 text-xs text-slate-400">Prefilled into the terms box of every new quote; edit per quote as needed.</p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="paymentInstructions">Payment instructions (printed on invoices)</Label>
          <Textarea id="paymentInstructions" name="paymentInstructions" rows={3} defaultValue={settings.paymentInstructions ?? ""} placeholder="Bank, account name and number, DuitNow ID…" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="defaultInvoiceNotes">Default invoice notes</Label>
          <Textarea id="defaultInvoiceNotes" name="defaultInvoiceNotes" rows={2} defaultValue={settings.defaultInvoiceNotes ?? ""} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          name="syncDealValueFromAcceptedQuote"
          defaultChecked={settings.syncDealValueFromAcceptedQuote}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-neutral-700"
        />
        <span>
          When a quote is accepted, set the deal&apos;s value to the quote total
          <span className="block text-xs text-slate-400">The leaderboard and referral commissions read the deal value, so this keeps them honest.</span>
        </span>
      </label>
      <ErrorLine state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
