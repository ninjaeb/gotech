"use client";

import { useInquiry } from "@/components/directory/listing-inquiry";
import type { ServiceEntry } from "@/lib/directory";

// Each row is clickable — picking one scrolls to the Get in touch card and
// prefills its message with an inquiry about that product/service, so a
// visitor can ask about something specific in one click instead of having
// to type out what they mean.
export function ServiceList({ services }: { services: ServiceEntry[] }) {
  const { selectService } = useInquiry();

  return (
    <div className="space-y-1">
      {services.map((service, index) => (
        <button
          key={index}
          type="button"
          onClick={() => selectService(service.title)}
          className="-mx-2 block w-full rounded-md px-2 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800/60 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100 dark:[&:not(:last-child)]:border-neutral-800"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{service.title}</h3>
            {service.price && (
              <span className="shrink-0 text-base font-medium text-petrol dark:text-petrol-light">{service.price}</span>
            )}
          </div>
          {service.description && (
            <p className="mt-1 text-base text-slate-600 dark:text-slate-300">{service.description}</p>
          )}
        </button>
      ))}
    </div>
  );
}
