"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, Mail, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A small share menu — copy link, email, WhatsApp, plus the device's own
// native share sheet where one exists (mobile browsers, mostly) — rather
// than the old single-button "native share, else copy" version. All four
// options stay available everywhere: WhatsApp/email links work with or
// without navigator.share, so there's no reason to hide them just because
// the native sheet is also on offer.
//
// The same menu doubles as the listing page's "Recommend" button (see
// RecommendBar): identical options, just a different label/icon and a
// referral-tracking URL instead of the plain page URL — so the only
// difference between "share" and "recommend" is which link goes out.
export function ShareButton({
  title,
  url,
  label = "Share",
  icon = "share",
  variant = "secondary",
  size = "sm",
  className,
  menuPlacement = "below",
  menuAlign = "right",
}: {
  title: string;
  url: string;
  label?: string;
  icon?: "share" | "recommend";
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  // "above" for a button pinned to the bottom of the viewport, where a
  // menu dropping downward would open off-screen.
  menuPlacement?: "below" | "above";
  menuAlign?: "right" | "center";
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // navigator.share's availability never changes at runtime, so this needs
  // no real subscription — just a way to read it after hydration without
  // the server (which has no `navigator`) and client disagreeing about the
  // very first render, the same purpose useSyncExternalStore serves for
  // locale in LeadCaptureForm.
  const nativeShareAvailable = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission — nothing more this option can do.
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled the share sheet, or the browser refused — either
      // way there's nothing useful to show for it.
    }
    setOpen(false);
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const TriggerIcon = icon === "recommend" ? ThumbsUp : Share2;
  const triggerIconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClasses(variant, size, cn("shrink-0", className))}
      >
        <TriggerIcon className={triggerIconClass} />
        {label}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-30 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900",
            menuPlacement === "above" ? "bottom-full mb-2" : "top-full mt-2",
            menuAlign === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800"
          >
            {copied ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a
            role="menuitem"
            href={mailtoHref}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800"
          >
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            Email
          </a>
          <a
            role="menuitem"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" />
            WhatsApp
          </a>
          {nativeShareAvailable && (
            <button
              type="button"
              role="menuitem"
              onClick={handleNativeShare}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:text-slate-200 dark:hover:bg-neutral-800"
            >
              <Share2 className="h-4 w-4 shrink-0 text-slate-400" />
              More…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
