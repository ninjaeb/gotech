import { Mail, MessageCircle } from "lucide-react";
import { whatsAppUrl } from "@/lib/format";

const iconLinkClasses =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-slate-200";

export function WhatsAppLink({ phone, className }: { phone: string; className?: string }) {
  return (
    <a
      href={whatsAppUrl(phone)}
      target="_blank"
      rel="noopener noreferrer"
      title="Message on WhatsApp"
      aria-label="Message on WhatsApp"
      className={className ?? iconLinkClasses}
    >
      <MessageCircle className="h-4 w-4" />
    </a>
  );
}

export function MailLink({ email, className }: { email: string; className?: string }) {
  return (
    <a
      href={`mailto:${email}`}
      title="Send email"
      aria-label="Send email"
      className={className ?? iconLinkClasses}
    >
      <Mail className="h-4 w-4" />
    </a>
  );
}
