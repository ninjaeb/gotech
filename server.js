// Custom server entrypoint for hosts that need a single Node.js file to
// require() and run directly — notably cPanel's "Setup Node.js App"
// (Phusion Passenger or LiteSpeed's lsnode), which assigns a port via
// process.env.PORT and expects the app to start listening on it.
//
// Not used for local development or for platforms that run `next start`
// natively (Vercel, Docker, etc.) — see package.json's "dev"/"start" scripts.
const { existsSync } = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";

// Hosts like cPanel's Setup Node.js App only run `npm install` for you (its
// "Run NPM Install" button) — nothing in that flow runs `next build`, which
// a production start (dev: false) requires. Build once here, automatically,
// so starting/restarting the app from the cPanel UI alone is enough.
// Note: if you redeploy new code into this same directory, delete the
// `.next` folder (e.g. via File Manager) before restarting, so this picks
// up the change — otherwise it keeps serving the previous build.
if (!dev && !existsSync(path.join(__dirname, ".next", "BUILD_ID"))) {
  console.log("> No production build found — running `next build`...");
  execFileSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
    cwd: __dirname,
    stdio: "inherit",
  });
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
