// Next.js calls register() once when the server process starts (see
// https://nextjs.org/docs/app/guides/instrumentation) — used here to make
// sure /public/sitemap.xml and /public/llms.txt (see
// src/lib/sitemap-generator.ts, src/lib/llms-txt-generator.ts) are current
// the moment this process comes up, rather than waiting for the next
// publish/unpublish/category-delete to write them. Both files are
// committed to git as placeholders (see their own comments for why) —
// this is what replaces that placeholder with real content on every boot,
// including right after a deploy.
//
// register() also runs in the Edge runtime for middleware, which can't
// touch Prisma/the filesystem the way this needs to — the NEXT_RUNTIME
// check is Next's own documented way to scope startup code to the Node.js
// server process only.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ regenerateSitemapFile }, { regenerateLlmsTxtFile }] = await Promise.all([
      import("@/lib/sitemap-generator"),
      import("@/lib/llms-txt-generator"),
    ]);
    await Promise.all([regenerateSitemapFile(), regenerateLlmsTxtFile()]);
  }
}
