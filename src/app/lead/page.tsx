import { LeadCaptureForm } from "@/components/leads/lead-capture-form";
import { Card, CardBody } from "@/components/ui/card";

// ?ref=<partner code> attributes the lead to a partner (src/lib/referrals
// .ts) — the embed widget reads it off the host page itself, but an iframe
// or a direct link to this page has to carry it in this page's own URL.
export default async function LeadCapturePage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <div className="min-h-full bg-slate-50 px-4 py-12 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            G
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gotka</span>
        </div>

        <Card>
          <CardBody>
            <LeadCaptureForm referralCode={typeof ref === "string" ? ref : undefined} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
