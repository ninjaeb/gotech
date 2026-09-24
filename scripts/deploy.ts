import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";

// Runs the same sequence the README's manual redeploy steps describe (see
// "Deploying on cPanel"): pull the new commit, install dependencies only if
// they changed, apply any pending migrations, then signal Passenger/LiteSpeed
// to restart. Triggered by the GitHub push webhook
// (src/app/api/deploy/webhook/route.ts), which spawns this as a detached
// process so it keeps running even if that request's own worker gets
// recycled partway through. server.js's own build-on-start logic (comparing
// the checked-out commit against .next/DEPLOYED_COMMIT) does the actual
// rebuild from there — the same way it already does after a manual restart.
const REPO_ROOT = path.resolve(__dirname, "..");
const BRANCH = process.env.DEPLOY_BRANCH;

function run(command: string, args: string[]): string {
  return execFileSync(command, args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

// `git diff --quiet` exits 0 for no difference, 1 for a difference —
// execFileSync throws on any non-zero exit, so that's the signal here.
function fileChangedBetween(from: string, to: string, file: string): boolean {
  try {
    run("git", ["diff", "--quiet", from, to, "--", file]);
    return false;
  } catch {
    return true;
  }
}

function signalRestart() {
  const tmpDir = path.join(REPO_ROOT, "tmp");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir);
  const restartFile = path.join(tmpDir, "restart.txt");
  if (existsSync(restartFile)) {
    const now = new Date();
    utimesSync(restartFile, now, now);
  } else {
    writeFileSync(restartFile, "");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// execFileSync (with encoding set, as `run` passes) attaches the child's
// captured stdout/stderr to the thrown error as string properties — this
// pulls all of it together so a pattern match below sees the actual
// Prisma/MySQL error text, not just Node's generic "Command failed: ...".
function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const withOutput = error as Error & { stdout?: string; stderr?: string };
  return [error.message, withOutput.stdout, withOutput.stderr].filter(Boolean).join("\n");
}

// The previous app process (still running — signalRestart only happens
// once this whole script succeeds) or a concurrent cron script can
// transiently eat the shared-hosting account's whole `max_user_connections`
// budget, leaving nothing free for this command's own connection even
// though prisma.config.ts already caps how much it asks for (see the
// connection_limit comment there). Retrying blindly on any migrate
// failure would just delay a genuinely broken migration's error instead
// of fixing anything, so this only retries the one condition that's
// actually expected to clear on its own.
function isTransientConnectionError(message: string): boolean {
  return /max_user_connections|too many connections/i.test(message);
}

const MIGRATE_RETRY_DELAYS_MS = [5_000, 15_000];

async function runMigrateDeploy(): Promise<string> {
  const attempts = MIGRATE_RETRY_DELAYS_MS.length + 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return run("npx", ["prisma", "migrate", "deploy"]);
    } catch (error) {
      const delay = MIGRATE_RETRY_DELAYS_MS[attempt - 1];
      if (delay === undefined || !isTransientConnectionError(errorText(error))) throw error;
      console.log(`migrate deploy hit a connection limit (attempt ${attempt}/${attempts}) — retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
  throw new Error("unreachable");
}

// ---------------------------------------------------------------------------
// Post-deploy smoke test
// ---------------------------------------------------------------------------
// signalRestart() only asks Passenger/LiteSpeed to restart the app on its
// next request; server.js then rebuilds — or, if the build fails, restores
// the previous build and keeps serving it. Nothing in that chain reports
// back, which is how a deploy once left the app on the previous build for
// hours while the freshly checked-out /public placeholders (a 0-URL
// sitemap.xml) were served straight from disk. So this script makes that
// first request itself, waits for /api/health (src/app/api/health/route.ts)
// to report the new commit as built, and then checks the handful of things
// a broken deploy has actually broken before: the served sitemap/llms.txt,
// a localized page, the share image, one listing logo (the og:image route
// handler), a referral redirect, and whether search crawlers get 200s.
// A failure can't undo the deploy, but it ends the silence: it's logged to
// deploy.log and exits non-zero.
const SMOKE_POLL_INTERVAL_MS = 10_000;
const SMOKE_TIMEOUT_MS = Number(process.env.DEPLOY_SMOKE_TIMEOUT_MS) || 15 * 60_000;
const SMOKE_USER_AGENT = "gotka-deploy-smoke-test";

type Health = {
  ok: boolean;
  commit: { built: string | null; head: string | null; current: boolean };
  db: { ok: boolean; ms: number; error: string | null };
  sitemap: { urls: number; placeholder: boolean };
  llmsTxt: { placeholder: boolean };
  sampleLogoPath: string | null;
};

function smokeFetch(url: string, init: { userAgent?: string; timeoutMs?: number } = {}) {
  return fetch(url, {
    headers: { "User-Agent": init.userAgent ?? SMOKE_USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(init.timeoutMs ?? 30_000),
  });
}

async function waitForBuild(origin: string, commit: string): Promise<Health> {
  const deadline = Date.now() + SMOKE_TIMEOUT_MS;
  let lastBuilt: string | null | undefined;
  while (Date.now() < deadline) {
    try {
      // The first request after signalRestart is what restarts the app, and
      // server.js's rebuild runs before it can answer — so one call can
      // legitimately take minutes.
      const response = await smokeFetch(`${origin}/api/health`, { timeoutMs: 5 * 60_000 });
      if ((response.headers.get("content-type") ?? "").includes("application/json")) {
        const health = (await response.json()) as Health;
        lastBuilt = health.commit.built;
        if (health.commit.built === commit) return health;
        console.log(`smoke: app still reports build ${lastBuilt?.slice(0, 7) ?? "unknown"}, waiting for ${commit.slice(0, 7)}...`);
      } else {
        console.log(`smoke: /api/health answered ${response.status} without JSON (app restarting?), waiting...`);
      }
    } catch (error) {
      console.log(`smoke: /api/health unreachable (${error instanceof Error ? error.message : error}), waiting...`);
    }
    await sleep(SMOKE_POLL_INTERVAL_MS);
  }
  const why =
    lastBuilt === undefined
      ? " (no /api/health response at all — is the app up, and is DEPLOY_SMOKE_URL its public origin?)"
      : ` — it still reports ${lastBuilt?.slice(0, 7) ?? "no build"}, which means next build failed and server.js restored the previous build: see stderr.log in the Application root (server.js retries the build by itself a few times)`;
  throw new Error(`the app never reported commit ${commit.slice(0, 7)} as built within ${SMOKE_TIMEOUT_MS / 1000}s${why}`);
}

// Crawlers that must be able to read the directory. Googlebot/bingbot being
// blocked is a hard failure; the AI crawlers are logged as warnings, since a
// block there is usually a host-level rule (Imunify360, LiteSpeed) that a
// deploy can't fix — but one a person should know about.
const CRAWLER_USER_AGENTS: [label: string, userAgent: string, hardFailure: boolean][] = [
  ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true],
  ["bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", true],
  ["GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot", false],
  ["OAI-SearchBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot", false],
  ["ClaudeBot", "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)", false],
  ["PerplexityBot", "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)", false],
];

function isImage(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").startsWith("image/");
}

async function runSmokeTest(origin: string, commit: string): Promise<void> {
  console.log(`Smoke test against ${origin} — waiting for the app to come back up on ${commit.slice(0, 7)}...`);
  const health = await waitForBuild(origin, commit);
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!health.db.ok) failures.push(`database check failed (/api/health reports ${health.db.error})`);
  if (health.sitemap.placeholder) {
    failures.push(`public/sitemap.xml is still the placeholder (${health.sitemap.urls} URLs) — instrumentation.ts didn't regenerate it; see stderr.log`);
  }
  if (health.llmsTxt.placeholder) failures.push("public/llms.txt is still the placeholder — see stderr.log");

  // What the web server actually serves, not only what's on disk.
  const sitemap = await smokeFetch(`${origin}/sitemap.xml`);
  const sitemapXml = await sitemap.text();
  const servedUrls = (sitemapXml.match(/<url>/g) ?? []).length;
  if (sitemap.status !== 200 || servedUrls === 0 || /Placeholder/.test(sitemapXml)) {
    failures.push(`served /sitemap.xml has ${servedUrls} <url> entries (HTTP ${sitemap.status})`);
  }

  const zhHome = await smokeFetch(`${origin}/zh/business`);
  const zhHtml = await zhHome.text();
  if (zhHome.status !== 200 || !/<html[^>]*\slang="zh"/.test(zhHtml)) {
    failures.push(`/zh/business did not render with <html lang="zh"> (HTTP ${zhHome.status}) — an old build is serving, or the locale header isn't reaching the root layout`);
  }

  const shareImage = await smokeFetch(`${origin}/en/business/opengraph-image`);
  if (shareImage.status !== 200 || !isImage(shareImage)) {
    failures.push(`/en/business/opengraph-image returned HTTP ${shareImage.status} ${shareImage.headers.get("content-type") ?? ""}`);
  }

  if (health.sampleLogoPath) {
    const logo = await smokeFetch(`${origin}${health.sampleLogoPath}`);
    if (logo.status !== 200 || !isImage(logo)) {
      failures.push(`${health.sampleLogoPath} returned HTTP ${logo.status} — the listing-logo route handler (every listing's og:image) is broken`);
    }
  }

  // An unknown referral code still redirects (see src/app/r/[code]/route.ts),
  // so anything but a redirect means the route handler itself is failing.
  const referral = await smokeFetch(`${origin}/r/smoke-test-no-such-code`);
  if (referral.status !== 302 && referral.status !== 307) {
    failures.push(`/r/<code> returned HTTP ${referral.status} instead of a redirect — the referral route handler is broken`);
  }

  for (const [label, userAgent, hardFailure] of CRAWLER_USER_AGENTS) {
    const response = await smokeFetch(`${origin}/en/business`, { userAgent });
    if (response.status !== 200) (hardFailure ? failures : warnings).push(`${label} got HTTP ${response.status} from /en/business`);
  }

  for (const warning of warnings) console.log(`smoke warning: ${warning}`);
  if (failures.length > 0) {
    throw new Error(`smoke test failed:\n- ${failures.join("\n- ")}`);
  }
  console.log(
    `Smoke test passed: build ${commit.slice(0, 7)} is live, /sitemap.xml serves ${servedUrls} URLs, database answered in ${health.db.ms} ms` +
      (warnings.length > 0 ? `, ${warnings.length} warning(s) above.` : "."),
  );
}

async function main() {
  console.log(`\n=== Deploy started ${new Date().toISOString()} ===`);

  if (!BRANCH) {
    console.log("DEPLOY_BRANCH isn't set — nothing to deploy.");
    return;
  }

  const before = run("git", ["rev-parse", "HEAD"]);
  run("git", ["fetch", "origin", BRANCH]);
  run("git", ["reset", "--hard", `origin/${BRANCH}`]);
  const after = run("git", ["rev-parse", "HEAD"]);

  if (before === after) {
    console.log(`Already at ${after.slice(0, 7)} (${BRANCH}) — nothing to deploy.`);
    return;
  }
  console.log(`Updated ${BRANCH}: ${before.slice(0, 7)} -> ${after.slice(0, 7)}`);

  if (fileChangedBetween(before, after, "package-lock.json")) {
    console.log("package-lock.json changed — running npm install...");
    console.log(run("npm", ["install"]));
  } else {
    console.log("package-lock.json unchanged — skipping npm install.");
  }

  console.log("Running prisma migrate deploy...");
  console.log(await runMigrateDeploy());

  signalRestart();
  console.log("Signaled a restart (tmp/restart.txt) — the app rebuilds and picks up the new commit on its next request.");

  const smokeOrigin = (process.env.DEPLOY_SMOKE_URL || process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (smokeOrigin) {
    await runSmokeTest(smokeOrigin, after);
  } else {
    console.log("DEPLOY_SMOKE_URL/SITE_URL not set — skipping the post-deploy smoke test (see the README's Auto-deploy section).");
  }
  console.log(`=== Deploy finished ${new Date().toISOString()} ===`);
}

main().catch((error) => {
  console.error("Deploy failed —", error instanceof Error ? error.message : error);
  process.exit(1);
});
