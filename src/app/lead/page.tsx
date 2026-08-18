import { LeadCaptureForm } from "@/components/leads/lead-capture-form";
import { Card, CardBody } from "@/components/ui/card";

export default function LeadCapturePage() {
  return (
    <div className="min-h-full bg-slate-50 px-4 py-12 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            G
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">GoTech</span>
        </div>

        <Card>
          <CardBody className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Let&apos;s build something
            </h1>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Tell us about your project and we&apos;ll get back to you.
            </p>
            <LeadCaptureForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
