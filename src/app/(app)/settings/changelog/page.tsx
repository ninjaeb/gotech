import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHANGELOG } from "@/lib/changelog";
import { formatDate } from "@/lib/format";

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Changelog" }]}
        title="Changelog"
        description="Every feature and change shipped to the CRM, newest first."
      />

      <div className="space-y-4">
        {CHANGELOG.map((entry) => (
          <Card key={entry.version}>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-500/30">
                  v{entry.version}
                </Badge>
                <h2 className="font-medium text-slate-800 dark:text-slate-200">{entry.title}</h2>
                <span className="ml-auto text-xs text-slate-400">{formatDate(entry.date)}</span>
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
