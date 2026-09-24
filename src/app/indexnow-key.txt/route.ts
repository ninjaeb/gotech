import { indexNowKey } from "@/lib/indexnow";

// The IndexNow key file (see src/lib/indexnow.ts): the protocol verifies a
// submission by fetching this URL and checking it contains exactly the key.
// Served from env rather than committed to /public so the key never lands
// in git. 404 until INDEXNOW_KEY is set — the same condition under which
// nothing ever submits.
export const dynamic = "force-dynamic";

export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
