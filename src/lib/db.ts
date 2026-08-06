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
  const adapter = new PrismaMariaDb(connectionUrl);
  return new PrismaClient({ adapter });
}

export const db = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}
