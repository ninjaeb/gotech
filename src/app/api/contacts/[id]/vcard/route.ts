import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { buildVCard } from "@/lib/vcard";
import { fullName } from "@/lib/format";

// Serves a Contact as a downloadable .vcf — phones intercept the
// text/vcard content type and offer to add it straight to Contacts,
// which is the whole point (see the "save to phone" request this exists
// for) rather than just handing back a file to look at.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const contact = await db.contact.findUnique({
    where: { id },
    select: {
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      phone: true,
      notes: true,
      company: { select: { name: true, phone: true, address: true } },
    },
  });
  if (!contact) notFound();

  const vcard = buildVCard(contact);
  const filename = `${fullName(contact.firstName, contact.lastName)}.vcf`.trim();

  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}
