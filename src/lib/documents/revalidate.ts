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
