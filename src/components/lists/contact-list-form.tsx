"use client";

import { useActionState, useState } from "react";
import { createList, type ListFormState } from "@/app/actions/contact-lists";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select } from "@/components/ui/field";
import { DYNAMIC_LIST_TEMPLATES, type DynamicListTemplateKey } from "@/lib/contact-lists";

const TEMPLATE_KEYS = Object.keys(DYNAMIC_LIST_TEMPLATES) as DynamicListTemplateKey[];

export function ContactListForm() {
  const [state, formAction, pending] = useActionState<ListFormState, FormData>(createList, undefined);
  const [type, setType] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [templateKey, setTemplateKey] = useState<DynamicListTemplateKey | "">("");

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Name" htmlFor="name" required>
        <Input id="name" name="name" required placeholder="e.g. VIP customers" />
      </FieldGroup>

      <FieldGroup label="Type" htmlFor="type" required>
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as "STATIC" | "DYNAMIC")}
        >
          <option value="STATIC">Static — you choose the members</option>
          <option value="DYNAMIC">Dynamic — members computed from a template</option>
        </Select>
      </FieldGroup>

      {type === "DYNAMIC" && (
        <FieldGroup label="Template" htmlFor="templateKey" required>
          <Select
            id="templateKey"
            name="templateKey"
            required
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value as DynamicListTemplateKey)}
          >
            <option value="" disabled>
              Choose a template…
            </option>
            {TEMPLATE_KEYS.map((key) => (
              <option key={key} value={key}>
                {DYNAMIC_LIST_TEMPLATES[key].label}
              </option>
            ))}
          </Select>
          {templateKey && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {DYNAMIC_LIST_TEMPLATES[templateKey].description}
            </p>
          )}
        </FieldGroup>
      )}

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create list"}
        </Button>
      </div>
    </form>
  );
}
