"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useInquiry } from "@/components/directory/listing-inquiry";
import { cn } from "@/lib/utils";
import type { ServiceEntry } from "@/lib/directory";

// Each row is clickable — a persistent checkbox-style marker (not just a
// hover state) shows that up front, rather than a visitor having to
// discover it by accident. Picking one or more scrolls to the Get in touch
// card and prefills its message with an inquiry listing everything picked,
// so a visitor can ask about several things in one message instead of
// typing them out.
export function ServiceList({ services }: { services: ServiceEntry[] }) {
  const { selectedServices, toggleService } = useInquiry();

  return (
    <div className="space-y-1">
      <p className="mb-2 text-sm text-slate-400 dark:text-slate-500">Tap an item to add it to your inquiry below.</p>
      {services.map((service, index) => {
        const selected = selectedServices.includes(service.title);
        return (
          <button
            key={index}
            type="button"
            onClick={() => toggleService(service.title)}
            aria-pressed={selected}
            className={cn(
              "-mx-2 flex w-full items-start gap-3 rounded-md px-2 py-3 text-left transition-colors",
              selected ? "bg-led-soft dark:bg-led-soft-dark" : "hover:bg-slate-50 dark:hover:bg-neutral-800/60",
              index < services.length - 1 && "border-b border-slate-100 dark:border-neutral-800",
            )}
          >
            {selected ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-petrol dark:text-petrol-light" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-neutral-700" />
            )}
            <span className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{service.title}</h3>
                {service.price && (
                  <span className="shrink-0 text-base font-medium text-petrol dark:text-petrol-light">{service.price}</span>
                )}
              </div>
              {service.description && (
                <p className="mt-1 text-base text-slate-600 dark:text-slate-300">{service.description}</p>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
