import { FileText } from "lucide-react";

export type AttachmentInfo = { id: string; fileName: string; mimeType: string };

// Renders one Attachment — inline thumbnail for an image, a small file
// card (opens/downloads) for anything else. Same image-vs-file split as
// WhatsAppMediaPreview, kept separate since these have nothing to do with
// WhatsApp: an Attachment is a plain paste/upload on a note or a task's
// description, served from /api/attachments/[id] rather than the WhatsApp
// media route.
export function AttachmentPreview({ attachment, className }: { attachment: AttachmentInfo; className?: string }) {
  const url = `/api/attachments/${attachment.id}`;

  if (attachment.mimeType.startsWith("image/")) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block max-w-xs overflow-hidden rounded-lg ${className ?? ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin, server-decoded attachment, same pattern as contact-avatar.tsx */}
        <img src={url} alt={attachment.fileName} className="max-h-64 w-full object-cover" />
      </a>
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
