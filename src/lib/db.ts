import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // Shared hosting (cPanel and similar) commonly caps max_user_connections
  // well below the mariadb driver's own pool default of 10 — and that cap
  // applies per hosting account, shared with every one-off CLI script
  // (remove-*, sync-email, etc.) run alongside the always-running app.
  // Default to a smaller pool so a script started while the app is busy
  // has real headroom to get a connection instead of timing out waiting
  // for one; a `?connectionLimit=N` already present on DATABASE_URL wins.
  const url = new URL(connectionUrl);
  if (!url.searchParams.has("connectionLimit")) {
    url.searchParams.set("connectionLimit", "5");
  }

  const adapter = new PrismaMariaDb(url.toString());
  return new PrismaClient({ adapter });
}

export const db = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}
