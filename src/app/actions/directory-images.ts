"use server";

import { db } from "@/lib/db";
import { requirePartnerAction } from "@/lib/auth/dal";
import { getOwnedListing } from "@/lib/directory";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // matches newsletter-images.ts's own cap

export type UploadDirectoryImageResult = { status: "ok"; url: string } | { status: "error"; message: string };

// Called directly from the About field's formatting toolbar (see
// markdown-lite-editor.tsx) — the image needs to exist and be servable the
// moment it's inserted into the text, not deferred until the listing is
// saved. `listingId` comes from the editor page the toolbar is mounted in
// (a partner can have several listings now) and is checked against the
// calling partner via getOwnedListing before the image is attached to it —
// same ownership discipline as every other listing action.
export async function uploadDirectoryListingImage(
  listingId: string,
  formData: FormData,
): Promise<UploadDirectoryImageResult> {
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

  const listing = await getOwnedListing(listingId, partner.id);
  if (!listing) {
    return { status: "error", message: "Listing not found." };
  }
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const image = await db.directoryListingImage.create({
    data: { mimeType: file.type, data, listingId: listing.id },
    select: { id: true },
  });

  return { status: "ok", url: `/api/directory-images/${image.id}` };
}
