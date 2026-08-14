"use client";

import { useEffect, useRef } from "react";
import { recordQuoteView } from "@/app/actions/quotes";

// Invisible — fires once on mount to timestamp this visit, then renders
// nothing. A ref guard (not just the effect's dependency array) stops React
// StrictMode's double-invoke in dev from double-counting the view.
export function RecordQuoteView({ quoteId }: { quoteId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void recordQuoteView(quoteId);
  }, [quoteId]);

  return null;
}
