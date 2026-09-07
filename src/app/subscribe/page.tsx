import { NewsletterSubscribeForm } from "@/components/newsletters/newsletter-subscribe-form";
import { Card, CardBody } from "@/components/ui/card";

export default function NewsletterSubscribePage() {
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
          <CardBody>
            <NewsletterSubscribeForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
