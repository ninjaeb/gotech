import { FileText } from "lucide-react";
import type { WhatsAppThreadMedia } from "@/lib/whatsapp";

// Shared between the WhatsApp thread view and the generic ActivityFeed, so
// an attachment renders the same way — inline image/video, or a small
// file card for anything else — wherever it shows up in the CRM.
export function WhatsAppMediaPreview({ media, className }: { media: WhatsAppThreadMedia; className?: string }) {
  if (media.type === "IMAGE") {
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer" className={`block overflow-hidden rounded-lg ${className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin, server-decoded attachment, same pattern as contact-avatar.tsx */}
        <img src={media.url} alt={media.name ?? "Image attachment"} className="max-h-64 w-full object-cover" />
      </a>
    );
  }
  if (media.type === "VIDEO") {
    return <video src={media.url} controls className={`max-h-64 w-full rounded-lg ${className ?? ""}`} />;
  }
  return (
    <a
      href={media.url}
      download={media.name ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 ${className ?? ""}`}
    >
      <FileText className="h-5 w-5 shrink-0" />
      <span className="truncate">{media.name ?? "Document"}</span>
    </a>
  );
}
