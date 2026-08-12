// Custom server entrypoint for hosts that need a single Node.js file to
// require() and run directly — notably cPanel's "Setup Node.js App"
// (Phusion Passenger or LiteSpeed's lsnode), which assigns a port via
// process.env.PORT and expects the app to start listening on it.
//
// Not used for local development or for platforms that run `next start`
// natively (Vercel, Docker, etc.) — see package.json's "dev"/"start" scripts.
const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync, writeFileSync, renameSync, rmSync } = require("node:fs");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";

// Server Actions that call redirect() make Next.js stream the redirect
// target back in the same response, by issuing an internal fetch to this
// same server. It infers that fetch's origin from this process's own port
// tracking, which is never told about custom servers' actual host/port
// (we don't pass them to next({ dev }) below) — so it guesses wrong, and
// combines that guess with whatever protocol the client's original request
// arrived as (relevant behind a TLS-terminating reverse proxy like
// cPanel's, which sets X-Forwarded-Proto: https). Both failure modes (bad
// port, bad protocol) show up as the self-fetch failing outright rather
// than as a broken redirect for the user — Next.js catches it and falls
// back to a normal, unstreamed redirect — but it's wasted work and a lot
// of log noise on every single redirecting Server Action. `next start`
// sets this same env var itself once it knows its own port; we do the
// same, pointed at the plain-HTTP loopback address this server actually
// listens on.
process.env.__NEXT_PRIVATE_ORIGIN = `http://127.0.0.1:${port}`;

// Hosts like cPanel's Setup Node.js App only run `npm install` for you (its
// "Run NPM Install" button) — nothing in that flow runs `next build`, which
// a production start (dev: false) requires. Build here, automatically, so
// starting/restarting the app from the cPanel UI alone is enough.
//
// Rebuild whenever the checked-out commit differs from the one already
// built (tracked in .next/DEPLOYED_COMMIT, which next build's own output
// doesn't touch) rather than on every single start. A redeploy always gets
// a fresh build; a plain restart with no new commit reuses the existing
// one instead of paying a ~20-30s rebuild — and, more importantly, instead
// of re-running a build that's currently broken. Falls back to "no
// existing build" when this isn't a git checkout (e.g. deployed via
// rsync/upload) or `git` isn't on PATH, since there's nothing to compare.
function readDeployedCommit(buildDir) {
  try {
    return readFileSync(path.join(buildDir, "DEPLOYED_COMMIT"), "utf8").trim();
  } catch {
    return null;
  }
}

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: __dirname }).toString().trim();
  } catch {
    return null;
  }
}

// Next.js encrypts each Server Action's closure data (e.g. the `task.id`
// bound into updateTask.bind(null, task.id)) with a key it randomly
// generates on every build by default — "actions can only be invoked for
// a specific build" per Next's own data-security docs. A tab left open
// across a rebuild is exactly the case that breaks. Next's docs recommend
// pinning NEXT_SERVER_ACTIONS_ENCRYPTION_KEY so it's stable across builds
// instead; this generates one the first time this server ever builds and
// reuses it on every subsequent build, stored outside .next (which gets
// swapped out per build) so it actually persists.
function getOrCreateServerActionsKey() {
  const keyPath = path.join(__dirname, ".server-actions-key");
  try {
    const existing = readFileSync(keyPath, "utf8").trim();
    if (existing) return existing;
  } catch {
    // First build on this host — nothing to reuse yet.
  }
  const key = randomBytes(32).toString("base64");
  writeFileSync(keyPath, key);
  return key;
}

if (!dev) {
  const buildDir = path.join(__dirname, ".next");
  const backupDir = path.join(__dirname, ".next.last-good");
  const hasExistingBuild = existsSync(path.join(buildDir, "BUILD_ID"));
  const commit = currentCommit();
  const needsBuild = !hasExistingBuild || !commit || commit !== readDeployedCommit(buildDir);

  if (needsBuild) {
    console.log("> Building production bundle...");
    // A build that fails partway through (e.g. during type-checking, which
    // runs after compilation has already written into .next) can leave
    // .next in a mixed old/new state — worse than either a clean build or
    // no build. Move the last known-good build fully out of the way first,
    // so a failure has a clean, complete build to restore rather than
    // whatever partial mess got left behind.
    if (hasExistingBuild) {
      rmSync(backupDir, { recursive: true, force: true });
      renameSync(buildDir, backupDir);
    }
    try {
      // src/generated/prisma is gitignored — a schema.prisma change that
      // reaches this server via git never updates it on its own. Normally
      // only `npm install`'s postinstall hook regenerates it, so a
      // redeploy that changes the schema but doesn't reinstall
      // dependencies silently type-checks (and builds) against a stale
      // client, e.g. a field that just became nullable still typed as
      // required everywhere it's used. Regenerating on every rebuild here
      // — cheap, and doesn't need a database connection — closes that gap
      // the same way the always-fresh `next build` above does for the
      // compiled app itself.
      execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "generate"], {
        cwd: __dirname,
        stdio: ["inherit", 2, 2],
      });
      execFileSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
        cwd: __dirname,
        // Redirect both the build's stdout AND stderr into our own stderr
        // (fd 2) specifically, rather than each inheriting its matching
        // stream. Next's build prints its per-file type-check diagnostics
        // to stdout but the final failure summary to stderr — hosts that
        // split stdout.log/stderr.log into separate files (cPanel does)
        // then hide the actual error in whichever file nobody's checking.
        // Funneling both into one guarantees the real diagnostic lands
        // wherever stderr.log ends up.
        stdio: ["inherit", 2, 2],
        // A browser tab left open across a redeploy has the previous
        // build's JS chunk map baked into its already-loaded runtime. Next
        // rebuilds that map every build (chunk IDs aren't stable across
        // builds), so that tab's next chunk load — triggered by, say,
        // clicking a button that needs a not-yet-loaded piece of the app —
        // requests an ID that means nothing to the new build and throws
        // client-side ("can't infer type of chunk from URL"), taking the
        // whole page down with no server-side error to show for it. Baking
        // the current commit in as NEXT_DEPLOYMENT_ID (Next's docs
        // recommend exactly a git SHA for this) instead makes Next notice
        // the mismatch itself and force a full reload before that happens.
        // NEXT_SERVER_ACTIONS_ENCRYPTION_KEY is the companion fix, for
        // Server Actions specifically — see getOrCreateServerActionsKey.
        env: {
          ...process.env,
          ...(commit ? { NEXT_DEPLOYMENT_ID: commit } : {}),
          NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: getOrCreateServerActionsKey(),
        },
      });
      if (commit) writeFileSync(path.join(buildDir, "DEPLOYED_COMMIT"), commit);
      if (hasExistingBuild) rmSync(backupDir, { recursive: true, force: true });
    } catch (error) {
      // A broken build must never take down an app that has a previous
      // working one to fall back to — that's strictly worse than serving
      // stale code: it's serving nothing. Only let it propagate (and stop
      // the app from starting) when there's truly nothing to fall back to.
      if (hasExistingBuild) {
        rmSync(buildDir, { recursive: true, force: true });
        renameSync(backupDir, buildDir);
        console.error(
          "> Build failed (see error above) — restored the previous build so the app stays up. That previous build's commit is still what's recorded, so the next restart will try building this commit again too, in case the failure was transient; fix the actual error to make that retry succeed.",
        );
      } else {
        throw error;
      }
    }
  } else {
    console.log(`> Reusing existing build — commit ${commit.slice(0, 7)} already built.`);
  }
}

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(
      `> Ready on port ${port} (${dev ? "development" : process.env.NODE_ENV})`,
    );
  });
});
