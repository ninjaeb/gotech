"use server";

import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // matches scan-business-card.ts's own cap

export type UploadNewsletterImageResult = { status: "ok"; url: string } | { status: "error"; message: string };

// Called directly from the editor's image-toolbar button (see
// newsletter-editor.tsx), not wired through the compose form's own submit —
// the image needs to exist and be servable the moment it's inserted, not
// deferred until the whole newsletter is eventually saved.
export async function uploadNewsletterImage(formData: FormData): Promise<UploadNewsletterImageResult> {
  await requireAdminAction();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image." };
  }
  if (!file.type.startsWith("image/")) {
    return { status: "error", message: "That doesn't look like an image." };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { status: "error", message: "That image is too large (max 5MB)." };
  }

  // Best-effort only — present when editing an existing draft, absent when
  // composing a brand new one (no Newsletter row exists yet at that point).
  const newsletterIdRaw = formData.get("newsletterId");
  const newsletterId = typeof newsletterIdRaw === "string" && newsletterIdRaw ? newsletterIdRaw : undefined;

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const image = await db.newsletterImage.create({
    data: { mimeType: file.type, data, newsletterId },
    select: { id: true },
  });

  return { status: "ok", url: `/api/newsletter-images/${image.id}` };
}
