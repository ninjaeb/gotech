import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import path from "node:path";
import { verifyWebhookSignature } from "@/lib/webhook-signature";

// GitHub's push webhook — see the README's "Auto-deploy" setup section for
// how to register this URL and generate DEPLOY_WEBHOOK_SECRET. Public and
// unauthenticated (GitHub can't log into this app), so the signature check
// below is the only thing standing between it and anyone who finds the URL
// — same scheme, same reasoning, as the WhatsApp webhook's own.
//
// Only ever pulls DEPLOY_BRANCH: this app's own deployed environment tracks
// one specific branch (there's no staging/production split here), so a
// push to any other branch is silently ignored rather than deploying
// whatever happens to reach GitHub first.
export async function POST(request: NextRequest) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  const branch = process.env.DEPLOY_BRANCH;
  if (!secret || !branch) {
    return NextResponse.json({ error: "Auto-deploy isn't configured (DEPLOY_WEBHOOK_SECRET/DEPLOY_BRANCH)" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // GitHub sends a "ping" event (no `ref`) the moment the webhook is
  // created/re-verified in its settings UI — acknowledge it without
  // deploying, the same handshake role Meta's GET verification plays for
  // the WhatsApp webhook.
  const event = request.headers.get("x-github-event");
  if (event !== "push") {
    return NextResponse.json({ ok: true, ignored: event ?? "unknown event" });
  }

  let payload: { ref?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.ref !== `refs/heads/${branch}`) {
    return NextResponse.json({ ok: true, ignored: payload.ref ?? "no ref" });
  }

  // Detached and unref'd so the deploy (git reset, npm install, migrate)
  // keeps running to completion even if this request's own worker process
  // gets recycled partway through — which the deploy itself can trigger, by
  // touching tmp/restart.txt at the end. Logged to a file since nothing is
  // left around to read this process's stdout/stderr once it's detached.
  // This app runs via server.js/Passenger, never Next's standalone
  // serverless output — the file-tracing this triggers a build warning
  // about doesn't apply here, so it's fine to ignore.
  const repoRoot = path.resolve(/* turbopackIgnore: true */ process.cwd());
  const log = openSync(path.join(repoRoot, "deploy.log"), "a");
  const child = spawn("npm", ["run", "deploy"], {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();

  return NextResponse.json({ ok: true, deploying: true });
}
