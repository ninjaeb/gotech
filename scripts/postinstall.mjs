// Regenerates the Prisma Client after `npm install`. A plain Node script
// rather than a shell one-liner in package.json's "postinstall" field,
// because this app's cPanel/nodevenv host has repeatedly been observed
// running postinstall with an unreliable cwd (confirmed: cPanel's "Run NPM
// Install" button has run it from inside the nodevenv's own internal lib
// directory, e.g. /home/USER/nodevenv/DOMAIN/24/lib, not the project
// directory) — first with no workaround at all (prisma's relative schema
// path resolved to nothing), then pinned to $INIT_CWD (npm's documented
// fix for exactly that), which itself didn't survive however that button
// invokes npm internally. __dirname (via import.meta.url) is resolved from
// this file's own location on disk once Node has actually loaded it, so it
// can't be wrong regardless of cwd — the same reasoning server.js already
// relies on for its own prisma generate call on every app restart, which
// this exact host runs successfully.
//
// That still leaves one problem this file's own code can't fix: npm has to
// find *this file* before any of the above logic runs. package.json's
// postinstall command therefore doesn't invoke it as a bare relative path
// (`node scripts/postinstall.mjs`, which fails outright when cwd is the
// nodevenv lib directory — there's no scripts/ folder to find there) — it
// builds an absolute path from $npm_config_local_prefix first. That's a
// different npm-provided variable than $INIT_CWD: it's npm's own record of
// which package.json is governing the current install (npm cannot run a
// "postinstall" script at all without already knowing this correctly),
// rather than "wherever the user's shell happened to be" — categorically
// more fundamental to npm's own operation, and confirmed by testing to
// survive the exact wrong-cwd case that broke both earlier attempts.
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
