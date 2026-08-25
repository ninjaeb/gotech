"use client";

import { useRef, useTransition } from "react";
import { addCompanyResource } from "@/app/actions/company-resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function CompanyResourceForm({ companyId }: { companyId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addCompanyResource(companyId, formData);
          formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-neutral-800"
    >
      <Input
        name="title"
        placeholder="Contract, pitch deck…"
        required
        className="min-w-[9rem] flex-1"
      />
      <Input
        name="url"
        type="text"
        placeholder="https://…"
        required
        className="min-w-[12rem] flex-[2]"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add link"}
      </Button>
    </form>
  );
}
