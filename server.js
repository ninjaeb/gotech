// Custom server entrypoint for hosts that need a single Node.js file to
// require() and run directly — notably cPanel's "Setup Node.js App"
// (Phusion Passenger or LiteSpeed's lsnode), which assigns a port via
// process.env.PORT and expects the app to start listening on it.
//
// Not used for local development or for platforms that run `next start`
// natively (Vercel, Docker, etc.) — see package.json's "dev"/"start" scripts.
const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync, writeFileSync, renameSync, rmSync } = require("node:fs");
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
