"use client";

import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from "react";

type InquiryContextValue = {
  selectedServices: string[];
  toggleService: (title: string) => void;
  formRef: RefObject<HTMLDivElement | null>;
};

const InquiryContext = createContext<InquiryContextValue | null>(null);

// Bridges clicks on product/service entries (see ServiceList) to the Get
// in touch card's message field (see DirectoryLeadForm) — both need to
// share this bit of state, so it's lifted into a small client-only
// context wrapping just the two-column layout, rather than converting the
// whole (mostly static, server-rendered) detail page into a client
// component just for this. A visitor can pick more than one item — each
// click toggles that title in or out of the list, like a checkbox.
export function InquiryProvider({ children }: { children: ReactNode }) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

  function toggleService(title: string) {
    setSelectedServices((prev) => {
      const next = prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title];
      // Only scroll on the very first pick — once a visitor knows where the
      // form is, yanking them back down on every later toggle would just
      // get in the way of picking several items in a row.
      if (prev.length === 0 && next.length > 0) {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  }

  return <InquiryContext.Provider value={{ selectedServices, toggleService, formRef }}>{children}</InquiryContext.Provider>;
}

export function useInquiry(): InquiryContextValue {
  const ctx = useContext(InquiryContext);
  if (!ctx) throw new Error("useInquiry must be used within an InquiryProvider");
  return ctx;
}

// Marks where selectService's scrollIntoView lands — a thin client wrapper
// around the (server-rendered) Get in touch card, since only a component
// that can call useContext gets to hold the actual ref object.
export function InquiryScrollTarget({ children, className }: { children: ReactNode; className?: string }) {
  const { formRef } = useInquiry();
  return (
    <div ref={formRef} className={className}>
      {children}
    </div>
  );
}
