"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Link2, Pencil, Trash2 } from "lucide-react";
import { deleteCompanyResource, updateCompanyResource } from "@/app/actions/company-resources";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export function CompanyResourceRow({
  companyId,
  resource,
}: {
  companyId: string;
  resource: { id: string; title: string; url: string };
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="py-2.5">
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateCompanyResource(companyId, resource.id, formData);
              setEditing(false);
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <Input name="title" defaultValue={resource.title} required className="min-w-[9rem] flex-1" />
          <Input name="url" defaultValue={resource.url} required className="min-w-[12rem] flex-[2]" />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-2 text-sm hover:text-indigo-600"
      >
        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate font-medium text-slate-800 dark:text-slate-200">{resource.title}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </a>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit resource"
          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-slate-200"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <form action={deleteCompanyResource.bind(null, companyId, resource.id)}>
          <ConfirmSubmitButton
            confirmMessage="Remove this resource link?"
            variant="ghost"
            size="sm"
            className="!px-1.5 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </ConfirmSubmitButton>
        </form>
      </div>
    </li>
  );
}
