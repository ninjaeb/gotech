import { brandIconResponse } from "@/lib/pwa-icon";

// A smaller glyph than icon-512/route.tsx — Android crops maskable icons to
// its own shape (circle, squircle, etc.), so the "G" needs to stay well
// inside that safe zone rather than filling the canvas.
export function GET() {
  return brandIconResponse(512, 0.4);
}
