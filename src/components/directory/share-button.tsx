"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

// Native share sheet where it's available (mobile browsers, mostly);
// falls back to copying the link — the only thing that reliably works
// everywhere else, including desktop.
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the share sheet, or the browser refused — either
        // way there's nothing useful to show for it.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission — nothing more this button can do.
    }
  }

  return (
    <button type="button" onClick={handleShare} className={buttonClasses("secondary", "sm", "shrink-0")}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
