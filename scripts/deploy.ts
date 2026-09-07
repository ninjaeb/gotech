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

function main() {
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
  console.log(run("npx", ["prisma", "migrate", "deploy"]));

  signalRestart();
  console.log("Signaled a restart (tmp/restart.txt) — the app rebuilds and picks up the new commit on its next request.");
  console.log(`=== Deploy finished ${new Date().toISOString()} ===`);
}

try {
  main();
} catch (error) {
  console.error("Deploy failed —", error instanceof Error ? error.message : error);
  process.exit(1);
}
