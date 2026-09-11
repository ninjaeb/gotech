import "server-only";

import { revalidatePath } from "next/cache";

// Every quote mutation touches the same set of pages: the deal it hangs off,
// its own detail page, the dashboard tiles, and the client-facing views.
export function revalidateQuotePaths(dealId: string, quoteId?: string): void {
  revalidatePath("/system");
  revalidatePath("/system/deals");
  revalidatePath(`/system/deals/${dealId}`);
  if (quoteId) revalidatePath(`/system/deals/${dealId}/quotes/${quoteId}`);
  revalidatePath("/portal");
}

// Same shape as revalidateQuotePaths above, plus the Project page and
// /system/projects list a numbered invoice can also be reached from once
// it's linked to a Project (see convertQuoteToInvoice).
export function revalidateInvoicePaths(dealId: string | null, invoiceId?: string, projectId?: string | null): void {
  revalidatePath("/system");
  if (dealId) {
    revalidatePath("/system/deals");
    revalidatePath(`/system/deals/${dealId}`);
    if (invoiceId) revalidatePath(`/system/deals/${dealId}/invoices/${invoiceId}`);
  }
  if (projectId) {
    revalidatePath("/system/projects");
    revalidatePath(`/system/projects/${projectId}`);
  }
  revalidatePath("/portal");
}
