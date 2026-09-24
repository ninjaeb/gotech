import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { listingLogoPath, loadPublishedListings } from "@/lib/directory";

// Public, unauthenticated deploy/uptime probe — what scripts/deploy.ts polls
// after signalling a restart, and what an external monitor can watch. Says
// which commit the running build was made from (so a deploy whose rebuild
// failed and fell back to the previous build is visible, rather than
// silently serving old code — see server.js), whether the database answers
// within a bounded time, and whether the static sitemap.xml/llms.txt in
// /public are real or still the committed placeholders (see
// src/instrumentation.ts). Nothing here is secret: the commit SHAs are
// public on GitHub, and the one query is `SELECT 1`.
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} took longer than ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return (await readFile(file, "utf8")).trim();
  } catch {
    return null;
  }
}

// The checked-out commit, read straight from .git rather than by spawning
// `git` inside a request: HEAD is either a SHA (detached) or a ref pointer,
// and a ref lives as its own file or, after a `git gc`, a packed-refs line.
async function readGitHead(root: string): Promise<string | null> {
  const head = await readOptional(path.join(root, ".git", "HEAD"));
  if (!head) return null;
  const ref = /^ref:\s*(\S+)/.exec(head)?.[1];
  if (!ref) return head;
  const direct = await readOptional(path.join(root, ".git", ref));
  if (direct) return direct;
  const packed = await readOptional(path.join(root, ".git", "packed-refs"));
  const line = packed?.split("\n").find((entry) => entry.endsWith(` ${ref}`));
  return line ? line.split(" ")[0] : null;
}

export async function GET() {
  const root = process.cwd();
  const [builtCommit, headCommit, sitemapXml, llmsTxt] = await Promise.all([
    readOptional(path.join(root, ".next", "DEPLOYED_COMMIT")),
    readGitHead(root),
    readOptional(path.join(root, "public", "sitemap.xml")),
    readOptional(path.join(root, "public", "llms.txt")),
  ]);

  const startedAt = Date.now();
  let dbOk = false;
  let dbError: string | null = null;
  // One published listing's logo URL, for the deploy smoke test to fetch —
  // the logo route is the og:image of every listing, and a route handler
  // is exactly the kind of path a pool problem hits first (see db.ts).
  let sampleLogoPath: string | null = null;
  try {
    await withTimeout(db.$queryRaw`SELECT 1`, DB_TIMEOUT_MS, "SELECT 1");
    dbOk = true;
    const rows = await withTimeout(loadPublishedListings(), DB_TIMEOUT_MS, "loading published listings");
    const withLogo = rows.find((row) => row.listing.logoUrl);
    if (withLogo) sampleLogoPath = listingLogoPath(withLogo.slug, withLogo.publishedAt);
  } catch (error) {
    // Full detail to the server log; the response only says that it failed.
    console.error("/api/health: database check failed —", error);
    dbError = error instanceof Error ? error.name : "Error";
  }
  const dbMs = Date.now() - startedAt;

  const sitemapUrls = sitemapXml ? (sitemapXml.match(/<url>/g) ?? []).length : 0;
  const sitemapPlaceholder = !sitemapXml || sitemapUrls === 0 || /Placeholder/.test(sitemapXml);
  const llmsTxtPlaceholder = !llmsTxt || /^# Placeholder/m.test(llmsTxt);
  // Only comparable when both are known — a non-git deploy has no HEAD to
  // compare against, and that's not a failure.
  const buildCurrent = !builtCommit || !headCommit || builtCommit === headCommit;
  const ok = dbOk && buildCurrent && !sitemapPlaceholder && !llmsTxtPlaceholder;

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      commit: { built: builtCommit, head: headCommit, current: buildCurrent },
      db: { ok: dbOk, ms: dbMs, error: dbError },
      sitemap: { urls: sitemapUrls, placeholder: sitemapPlaceholder },
      llmsTxt: { placeholder: llmsTxtPlaceholder },
      sampleLogoPath,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
