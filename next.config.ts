import type { NextConfig } from "next";
import path from "node:path";

// Hosts like cPanel's "Setup Node.js App" install dependencies into a
// per-account "nodevenv" directory and symlink node_modules back into the
// app root from there. Turbopack refuses to follow that symlink ("points
// out of the filesystem root") unless its root is widened to a directory
// that actually contains both the app and the symlink target. Only widen
// it when $HOME genuinely is an ancestor of this project (true on that
// kind of host) — everywhere else (local dev, most CI/hosting), leave
// Turbopack's own root auto-detection alone.
function turbopackRoot(): string | undefined {
  const home = process.env.HOME;
  if (!home) return undefined;
  const relative = path.relative(home, __dirname);
  const isDescendant = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  return isDescendant ? home : undefined;
}

const root = turbopackRoot();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1mb. 24mb covers the largest WhatsApp attachment this
      // app allows (16MB video/document — see MAX_MEDIA_BYTES in
      // src/lib/whatsapp.ts) once base64-inflated by the Server Action's
      // own FormData encoding (~4/3), plus headroom; comfortably above the
      // 5mb this was previously raised to for the Google Contacts CSV
      // import upload too.
      bodySizeLimit: "24mb",
    },
  },
  ...(root ? { turbopack: { root } } : {}),
};

export default nextConfig;
