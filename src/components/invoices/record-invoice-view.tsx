"use client";

import { useEffect, useRef } from "react";
import { recordInvoiceView } from "@/app/actions/invoices";

// Invisible — fires once on mount to timestamp this visit, then renders
// nothing. A ref guard (not just the effect's dependency array) stops React
// StrictMode's double-invoke in dev from double-counting the view.
export function RecordInvoiceView({ shareKey }: { shareKey: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void recordInvoiceView(shareKey);
  }, [shareKey]);

  return null;
}
