// Shared between the manual photo-upload form (src/app/actions/contacts.ts)
// and CSV import's fetch-by-URL path (src/app/actions/contact-import.ts) —
// "use server" files may only export async functions, so these constants
// live here rather than in either action file.

// Server Actions cap the whole request body at 5mb (next.config.ts) and
// base64 inflates size by ~4/3, so 3mb raw (~4mb encoded) leaves headroom
// for the rest of the form. Comfortably covers a typical phone photo.
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function photoDataUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
