// Regenerates the Prisma Client after `npm install`. A plain Node script
// rather than a shell one-liner in package.json's "postinstall" field,
// because this app's cPanel/nodevenv host has twice now been observed
// running postinstall with an unreliable cwd: first with no workaround at
// all (prisma's relative schema path resolved to nothing), then pinned to
// $INIT_CWD (npm's documented fix for exactly that) — which itself turned
// out not to survive however cPanel's "Run NPM Install" button invokes npm
// internally, as opposed to a manually-run `npm install`. __dirname (via
// import.meta.url) is resolved from this file's own location on disk, not
// from any shell- or npm-provided cwd or env var, so it can't be wrong
// regardless of how this script gets invoked — the same reasoning
// server.js already relies on for its own prisma generate call on every
// app restart, which this exact host runs successfully.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

try {
  execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "generate"], {
    cwd: projectRoot,
    // Merge stderr into stdout so Prisma's routine status lines (written to
    // stderr on every run, success or not) don't make cPanel's "Run NPM
    // Install" button show a red error popup on a clean install. A real
    // failure still exits non-zero either way — see catch below.
    stdio: ["inherit", "inherit", 1],
  });
} catch {
  // prisma's own error output already printed above (stdio is inherited/
  // merged, not captured) — just propagate the failure, without also
  // dumping execFileSync's own generic "Command failed" stack trace on
  // top of it.
  process.exitCode = 1;
}
