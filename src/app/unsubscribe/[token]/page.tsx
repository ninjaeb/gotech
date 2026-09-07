import { db } from "@/lib/db";
import { confirmUnsubscribe } from "@/app/actions/newsletter-unsubscribe";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await db.newsletterRecipient.findUnique({
    where: { unsubscribeToken: token },
    select: { contact: { select: { email: true, emailOptOut: true } } },
  });

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
          <CardBody className="space-y-3 text-center">
            {!recipient ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This unsubscribe link isn&apos;t valid — it may have expired or already been used.
              </p>
            ) : recipient.contact.emailOptOut ? (
              <>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">You&apos;re unsubscribed</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {recipient.contact.email} won&apos;t receive any more newsletters from us.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Unsubscribe?</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Stop sending newsletters to {recipient.contact.email}.
                </p>
                <form action={confirmUnsubscribe.bind(null, token)}>
                  <Button type="submit" variant="secondary" className="w-full">
                    Unsubscribe
                  </Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
