import { NewsletterSubscribeForm } from "@/components/newsletters/newsletter-subscribe-form";
import { Card, CardBody } from "@/components/ui/card";

export default function NewsletterSubscribePage() {
  return (
    <div className="min-h-full bg-slate-50 px-4 py-12 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img src="/icon-192.png" alt="" className="h-9 w-9 shrink-0" />
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gotka</span>
        </div>

        <Card>
          <CardBody>
            <NewsletterSubscribeForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
