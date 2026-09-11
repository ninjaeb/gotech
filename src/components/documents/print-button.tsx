"use client";

import { Printer } from "lucide-react";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button";

// The browser's own print dialog doubles as "Save as PDF" on every platform,
// which is all a quote needs; invoices get a real server-rendered PDF.
export function PrintButton({ label = "Print / Save PDF", variant = "secondary" }: { label?: string; variant?: ButtonVariant }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses(variant, "sm", "print:hidden")}>
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
