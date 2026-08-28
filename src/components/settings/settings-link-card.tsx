import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export function SettingsLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardBody>
        <Link href={href} className="flex items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">{title}</p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>
      </CardBody>
    </Card>
  );
}
