"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input, Textarea } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import type { ServiceEntry } from "@/lib/directory";

const EMPTY_SERVICE: ServiceEntry = { title: "", description: "", price: "" };
const MAX_SERVICES = 20;

// A repeatable list of {title, description, price} rows — replaces the
// old one-line-per-service textarea now that each service carries more
// than just a name. Controlled (value/onChange), same division of labor
// as MarkdownLiteEditor — the parent form also reads `value` as AI-rewrite
// context, so it can't be this component's own internal state. Serializes
// to a single hidden JSON field on submit (see parseServicesJson in
// src/lib/directory.ts): a variable-length list doesn't map cleanly onto
// individually-named form fields the way OperatingHoursEditor's fixed
// seven days do.
export function ServicesEditor({
  name,
  value,
  onChange,
}: {
  name: string;
  value: ServiceEntry[];
  onChange: (services: ServiceEntry[]) => void;
}) {
  const services = value.length > 0 ? value : [EMPTY_SERVICE];

  function updateService(index: number, patch: Partial<ServiceEntry>) {
    onChange(services.map((service, i) => (i === index ? { ...service, ...patch } : service)));
  }

  function addService() {
    if (services.length >= MAX_SERVICES) return;
    onChange([...services, EMPTY_SERVICE]);
  }

  function removeService(index: number) {
    onChange(services.length > 1 ? services.filter((_, i) => i !== index) : [EMPTY_SERVICE]);
  }

  return (
    <div className="space-y-3">
      {services.map((service, index) => (
        <div key={index} className="rounded-md border border-slate-200 p-3 dark:border-neutral-800">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={service.title}
                  onChange={(event) => updateService(index, { title: event.target.value })}
                  placeholder="Service or product name"
                  maxLength={80}
                  className="sm:flex-1"
                />
                <Input
                  value={service.price}
                  onChange={(event) => updateService(index, { price: event.target.value })}
                  placeholder="Price (optional) — e.g. RM 500"
                  maxLength={40}
                  className="sm:w-48"
                />
              </div>
              <Textarea
                value={service.description}
                onChange={(event) => updateService(index, { description: event.target.value })}
                rows={2}
                placeholder="What does this include? (optional)"
                maxLength={300}
              />
            </div>
            <button
              type="button"
              onClick={() => removeService(index)}
              aria-label="Remove service"
              title="Remove service"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addService}
        disabled={services.length >= MAX_SERVICES}
        className={buttonClasses("ghost", "sm")}
      >
        <Plus className="h-3.5 w-3.5" />
        Add service
      </button>
      <input type="hidden" name={name} value={JSON.stringify(services.filter((service) => service.title.trim()))} />
    </div>
  );
}
