"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";

export type AttachmentInfo = { id: string; fileName: string; mimeType: string };

// Renders one Attachment — inline thumbnail for an image (click opens a
// lightbox, not a new tab), a small file card (opens/downloads) for
// anything else. Same image-vs-file split as WhatsAppMediaPreview, kept
// separate since these have nothing to do with WhatsApp: an Attachment is a
// plain paste/upload on a note or a task's description, served from
// /api/attachments/[id] rather than the WhatsApp media route.
export function AttachmentPreview({ attachment, className }: { attachment: AttachmentInfo; className?: string }) {
  const url = `/api/attachments/${attachment.id}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (attachment.mimeType.startsWith("image/")) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View ${attachment.fileName}`}
          className={`block max-w-xs cursor-zoom-in overflow-hidden rounded-lg ${className ?? ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- same-origin, server-decoded attachment, same pattern as contact-avatar.tsx */}
          <img src={url} alt={attachment.fileName} className="max-h-64 w-full object-cover" />
        </button>

        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={attachment.fileName}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- same-origin, server-decoded attachment, same pattern as contact-avatar.tsx */}
            <img
              src={url}
              alt={attachment.fileName}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <a
      href={url}
      download={attachment.fileName}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 ${className ?? ""}`}
    >
      <FileText className="h-5 w-5 shrink-0" />
      <span className="max-w-[12rem] truncate">{attachment.fileName}</span>
    </a>
  );
}
