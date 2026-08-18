import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPortalSessionPayload } from "@/lib/portal/session";

export const verifyPortalSession = cache(async () => {
  const session = await getPortalSessionPayload();
  if (!session?.clientUserId) {
    redirect("/portal/login");
  }
  return session;
});

// Scoping for every portal query flows through contact.companyId, never a
// bare companyId taken on faith — a ClientUser whose Contact has since been
// unlinked from its Company (companyId null) is treated as invalid rather
// than rendered, since a `where: { companyId: null }` filter would match
// every OTHER company's company-less rows too.
export const getCurrentClientUser = cache(async () => {
  const session = await verifyPortalSession();
  const clientUser = await db.clientUser.findUnique({
    where: { id: session.clientUserId },
    select: {
      id: true,
      email: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyId: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!clientUser || !clientUser.contact.companyId || !clientUser.contact.company) {
    redirect("/portal/login");
  }
  return {
    id: clientUser.id,
    email: clientUser.email,
    contact: clientUser.contact,
    companyId: clientUser.contact.companyId,
    company: clientUser.contact.company,
  };
});
