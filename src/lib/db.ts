import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Pool defaults, applied as connection-string query params (the mariadb
// driver's own syntax) — each is only a default, so a DATABASE_URL that sets
// one keeps its own value.
const POOL_DEFAULTS: Record<string, string> = {
  // Shared hosting caps MySQL connections per account well below the
  // driver's default pool of 10 — and the app's pool isn't the only one on
  // the account (a deploy's `prisma migrate deploy`, cron scripts; see the
  // README's troubleshooting notes on `max_user_connections`).
  connectionLimit: "5",
  // How long a query waits for a free connection before giving up. The
  // driver's 10 s default is what turned a starved pool into route handlers
  // that hung for ~10.5 s and then 500ed; 5 s surfaces the same failure
  // twice as fast without abandoning a merely busy pool.
  acquireTimeout: "5000",
  // The driver keeps this many connections open even when idle, and
  // defaults it to connectionLimit — so an idle pool still pinned its whole
  // allowance against the account's cap. One warm connection is enough.
  minimumIdle: "1",
};

function createPrismaClient() {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(connectionUrl);
  for (const [key, value] of Object.entries(POOL_DEFAULTS)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }

  const adapter = new PrismaMariaDb(url.toString());
  return new PrismaClient({ adapter });
}

// One client — and so one connection pool — per process, in production too.
// Next.js compiles a server module once per bundling layer it's imported
// from (React Server Components, route handlers, ...), and each copy of this
// file would otherwise construct its own PrismaClient and pool: in the
// production build, the app's pages load one copy and the /api and /r/
// route handlers another. With minimumIdle at its default every pool pins
// its full allowance open, so on a host with a small per-account
// connection cap the pool created second (the route handlers', first hit
// later than the pages) could get no connections at all, and every request
// through it timed out. globalThis is shared across those copies, so
// caching the client there collapses them into a single pool. (Caching
// only in development, as this used to, is the usual HMR-leak precaution
// — it's just as valid in production, and was the missing piece here.)
export const db = globalThis.prismaGlobal ?? createPrismaClient();
globalThis.prismaGlobal = db;
