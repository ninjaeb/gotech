import { brandIconResponse } from "@/lib/pwa-icon";

// iOS's Add to Home Screen reads apple-touch-icon (this file's recognized
// name auto-generates that <link> tag) rather than the web manifest's own
// icons array, and applies its own rounding — same full-bleed square as the
// non-maskable icon-*/route.tsx handlers, just at iOS's preferred size.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandIconResponse(180, 0.62);
}
