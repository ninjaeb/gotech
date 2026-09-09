"use server";

import { db } from "@/lib/db";
import { requirePartnerAction } from "@/lib/auth/dal";
import { ensurePartnerListing } from "@/lib/directory";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // matches newsletter-images.ts's own cap

export type UploadDirectoryImageResult = { status: "ok"; url: string } | { status: "error"; message: string };

// Called directly from the About field's formatting toolbar (see
// markdown-lite-editor.tsx) — the image needs to exist and be servable the
// moment it's inserted into the text, not deferred until the listing is
// saved. Always attaches to the calling partner's own listing (created
// lazily if this is their first edit, same as every other listing action)
// — never a client-supplied listing id.
export async function uploadDirectoryListingImage(formData: FormData): Promise<UploadDirectoryImageResult> {
  const partner = await requirePartnerAction();

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

  const listing = await ensurePartnerListing(partner.id, partner.name);
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const image = await db.directoryListingImage.create({
    data: { mimeType: file.type, data, listingId: listing.id },
    select: { id: true },
  });

  return { status: "ok", url: `/api/directory-images/${image.id}` };
}
