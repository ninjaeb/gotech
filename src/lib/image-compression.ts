// Client-side only (canvas/createImageBitmap aren't available server-side).
// Keeps uploaded photos well under the server's size cap without asking the
// user to resize anything themselves first — phone photos routinely run
// several MB, well past what an avatar actually needs.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

// Resizes to fit within MAX_DIMENSION and re-encodes as JPEG. Falls back to
// returning the original file untouched if the browser can't decode it
// (e.g. HEIC, which createImageBitmap doesn't support in most browsers) or
// if compressing didn't actually shrink it — the server's own validation is
// still the real backstop either way.
export async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
