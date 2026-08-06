// Custom server entrypoint for hosts that need a single Node.js file to
// require() and run directly — notably cPanel's "Setup Node.js App"
// (Phusion Passenger), which assigns a port via process.env.PORT and
// expects the app to start listening on it.
//
// Not used for local development or for platforms that run `next start`
// natively (Vercel, Docker, etc.) — see package.json's "dev"/"start" scripts.
const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";

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
