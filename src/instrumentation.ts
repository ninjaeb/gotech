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
//
// Each file is regenerated independently and a failure is logged rather
// than thrown: one file's problem shouldn't cost the other its refresh,
// and a startup that dies here would take the whole app down over a file
// that /api/health reports on anyway. The log line names what stays served
// in the meantime, since a placeholder sitemap is otherwise invisible from
// the app itself (the web server hands the file out straight from disk).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ regenerateSitemapFile }, { regenerateLlmsTxtFile }] = await Promise.all([
    import("@/lib/sitemap-generator"),
    import("@/lib/llms-txt-generator"),
  ]);
  await Promise.all([
    regenerateSitemapFile()
      .then(() => console.log("> Regenerated public/sitemap.xml"))
      .catch((error) =>
        console.error(
          "> Could not regenerate public/sitemap.xml — whatever is on disk (the committed 0-URL placeholder, after a fresh deploy) stays served until the next publish or restart:",
          error,
        ),
      ),
    regenerateLlmsTxtFile()
      .then(() => console.log("> Regenerated public/llms.txt"))
      .catch((error) =>
        console.error(
          "> Could not regenerate public/llms.txt — whatever is on disk (the committed placeholder, after a fresh deploy) stays served until the next publish or restart:",
          error,
        ),
      ),
  ]);
}
