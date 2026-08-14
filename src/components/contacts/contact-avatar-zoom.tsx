"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ContactAvatar } from "@/components/contacts/contact-avatar";

export function ContactAvatarZoom({
  photoUrl,
  name,
  className,
}: {
  photoUrl?: string | null;
  name: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!photoUrl) {
    return <ContactAvatar photoUrl={photoUrl} name={name} className={className} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 cursor-zoom-in rounded-full transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        aria-label={`View larger photo of ${name}`}
      >
        <ContactAvatar photoUrl={photoUrl} name={name} className={className} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${name}'s photo`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, not an optimizable remote/static asset */}
          <img
            src={photoUrl}
            alt={name}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
