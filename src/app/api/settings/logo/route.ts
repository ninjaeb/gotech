import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// The business logo printed on quotes and invoices — public, since the
// client-facing /q page (no session) shows it. Listed in proxy.ts's
// ALWAYS_PUBLIC_PREFIXES for that reason. Same base64-in-a-row convention as
// every other blob here (no durable filesystem on cPanel).
export async function GET() {
  const logo = await db.businessLogo.findUnique({ where: { id: "singleton" } });
  if (!logo) return new NextResponse(null, { status: 404 });
  const buffer = Buffer.from(logo.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": logo.mimeType,
      // Re-uploads change updatedAt, which the pages append as ?v= so a
      // cached logo is never stale.
      "Cache-Control": "public, max-age=86400",
    },
  });
}
