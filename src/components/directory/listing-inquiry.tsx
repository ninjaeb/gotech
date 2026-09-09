"use client";

import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from "react";

type InquiryContextValue = {
  selectedService: string | null;
  selectService: (title: string) => void;
  formRef: RefObject<HTMLDivElement | null>;
};

const InquiryContext = createContext<InquiryContextValue | null>(null);

// Bridges a click on a product/service entry (see ServiceList) to the Get
// in touch card's message field (see DirectoryLeadForm) — both need to
// share this one bit of state, so it's lifted into a small client-only
// context wrapping just the two-column layout, rather than converting the
// whole (mostly static, server-rendered) detail page into a client
// component just for this.
export function InquiryProvider({ children }: { children: ReactNode }) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function selectService(title: string) {
    setSelectedService(title);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <InquiryContext.Provider value={{ selectedService, selectService, formRef }}>{children}</InquiryContext.Provider>;
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
