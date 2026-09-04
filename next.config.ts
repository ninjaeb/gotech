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
    // Both the "Collecting page data" and "Generating static pages" build
    // phases spawn one worker *process* per experimental.cpus (see
    // getNumberOfWorkers in next/dist/build/index.js), which defaults to
    // the host's *reported* CPU count (os.cpus().length) — on shared
    // hosting that's typically the whole physical box's core count, not
    // what this account's resource limits (CloudLinux LVE, on the cPanel
    // host this deploys to) actually allow it to use concurrently. Left at
    // that default, the build tried to spawn a worker per reported core
    // (31 in production), the OS refused past the account's real
    // thread/process ceiling ("OS can't spawn worker thread: Resource
    // temporarily unavailable"), and the build crashed outright. Pinning
    // this low keeps worker count independent of whatever core count the
    // host happens to report.
    cpus: 2,
  },
  ...(root ? { turbopack: { root } } : {}),
};

export default nextConfig;
