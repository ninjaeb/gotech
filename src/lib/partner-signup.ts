import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { generateListingSlug } from "@/lib/directory";
import { generateReferralCode } from "@/lib/referrals";
import { normalizePhone } from "@/lib/phone";

// Turns a "join the business directory" signup into a partner login account
// *and* a CRM record, in one place — the exact same fields land in the same
// shape whether the visitor signed up with a password (see
// src/app/actions/partner-signup.ts) or with Google (see
// src/app/api/auth/google/callback), the same way createLeadFromSubmission
// is the one place a lead-form post turns into a Contact + Deal regardless
// of which of its two entry points it came through.
export type PartnerSignupInput = {
  contactName: string;
  email: string;
  companyName: string;
  phone?: string | null;
};

async function createCompanyAndContact({ contactName, email, companyName, phone }: PartnerSignupInput) {
  const company = await db.company.findFirst({ where: { name: companyName }, select: { id: true } });
  const companyId =
    company?.id ?? (await db.company.create({ data: { name: companyName }, select: { id: true } })).id;

  const contact = await findOrCreateContactByEmail({
    name: contactName,
    email,
    phone: phone ? normalizePhone(phone) : null,
    companyId,
    // A partner joining the directory is a business relationship from day
    // one, not a sales prospect — CUSTOMER is the closest existing stage,
    // same as how a won deal's contact would be classified.
    lifecycleStage: "CUSTOMER",
  });
  if (!contact.companyId) {
    await db.contact.update({ where: { id: contact.id }, data: { companyId } });
  }

  return { companyId, contactId: contact.id };
}

async function createPartnerUserAndListing({
  contactName,
  email,
  companyName,
  passwordHash,
}: PartnerSignupInput & { passwordHash: string }) {
  const referralCode = await generateReferralCode(contactName);
  const user = await db.user.create({
    data: {
      name: contactName,
      email,
      passwordHash,
      role: "PARTNER",
      referralCode,
    },
  });

  const slug = await generateListingSlug(companyName);
  await db.partnerListing.create({
    data: { partnerId: user.id, slug, companyName, services: [] },
  });

  return user;
}

export type PartnerSignupError = "email_taken";
export type PartnerSignupResult = { ok: true; userId: string } | { ok: false; error: PartnerSignupError };

// Password-based signup: an email already on file — whether a staff
// account or an earlier partner signup — is a hard stop, since nothing
// here proves this visitor is that account's owner (unlike the Google
// path below, where Google itself vouches for the email).
export async function registerPartnerWithPassword(
  input: PartnerSignupInput & { passwordHash: string },
): Promise<PartnerSignupResult> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return { ok: false, error: "email_taken" };

  const { companyId, contactId } = await createCompanyAndContact(input);
  const user = await createPartnerUserAndListing(input);
  await db.activity.create({
    data: {
      type: "NOTE",
      content: `${input.contactName} (${input.email}) signed up as a partner via the business directory — ${input.companyName}.`,
      contactId,
      companyId,
    },
  });

  revalidatePath("/system/companies");
  revalidatePath("/system/contacts");
  revalidatePath("/system/settings/team");
  revalidatePath("/system/referrals");

  return { ok: true, userId: user.id };
}

// Google path: the visitor's email is already verified by Google, so a
// match against an existing User is treated as "this is them, log them
// in" rather than a conflict — the same trust an admin-provisioned staff
// account gets when they'd otherwise have typed a password. A brand-new
// email gets the full Company/Contact/User/PartnerListing creation, with
// a random, never-shared password hash (this account only ever signs in
// through Google) so the schema's required passwordHash column still
// holds something no one can guess or use.
export async function registerOrSignInPartnerWithGoogle(
  input: PartnerSignupInput & { passwordHash: string },
): Promise<{ userId: string; isNew: boolean }> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return { userId: existing.id, isNew: false };

  const { companyId, contactId } = await createCompanyAndContact(input);
  const user = await createPartnerUserAndListing(input);
  await db.activity.create({
    data: {
      type: "NOTE",
      content: `${input.contactName} (${input.email}) signed up as a partner via the business directory using Google — ${input.companyName}.`,
      contactId,
      companyId,
    },
  });

  revalidatePath("/system/companies");
  revalidatePath("/system/contacts");
  revalidatePath("/system/settings/team");
  revalidatePath("/system/referrals");

  return { userId: user.id, isNew: true };
}
