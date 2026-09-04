// Shared between the note/description composer (src/app/actions/activities.ts,
// src/app/actions/tasks.ts) and the route that serves attachment bytes back
// out (src/app/api/attachments/[id]/route.ts).

// Per-file cap. Requests can carry several attachments at once, and the
// whole body (all attachments plus the rest of the form) has to fit under
// next.config.ts's serverActions.bodySizeLimit — 5mb raw per file keeps a
// handful of them comfortably under that even after base64's ~4/3 inflation.
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export function attachmentDataFromBuffer(buffer: Buffer): string {
  return buffer.toString("base64");
}

export function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export type ParsedAttachment = { fileName: string; mimeType: string; size: number; data: string };

// Reads and validates every File under `fieldName` (a note composer can
// stage more than one) — used identically by addActivity and the task
// create/update actions. Throws a user-facing message on the first
// oversized file, matching how the rest of this codebase's actions
// validate (a thrown Error the caller converts to { error: message }).
export async function parseAttachmentFiles(formData: FormData, fieldName = "attachments"): Promise<ParsedAttachment[]> {
  const files = formData.getAll(fieldName).filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const parsed: ParsedAttachment[] = [];
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`"${file.name}" is larger than 5MB.`);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed.push({
      fileName: file.name || "attachment",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: attachmentDataFromBuffer(buffer),
    });
  }
  return parsed;
}
