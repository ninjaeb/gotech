"use server";

import { z } from "zod";
import { describeAiError, getGeminiClient, isAiConfigured } from "@/lib/ai/client";
import { deriveCompanyDomain, findOrCreateCompanyByName, normalizeDomain } from "@/lib/companies";
import type { ContactDraft } from "@/lib/contact-draft";
import { requireAdminAction } from "@/lib/auth/dal";

const MODEL = "gemini-flash-latest";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // matches next.config.ts serverActions.bodySizeLimit

const CardSchema = z.object({
  firstName: z.string().describe("The person's first name as printed on the card. Empty string if not legible or not present."),
  lastName: z.string().describe("The person's last name as printed on the card. Empty string if not legible or not present."),
  title: z.string().describe("Job title, if printed on the card. Empty string otherwise."),
  companyName: z.string().describe("Company or organization name, if printed on the card. Empty string otherwise."),
  email: z.string().describe("Email address, if printed on the card. Empty string otherwise."),
  phone: z
    .string()
    .describe(
      "The best single phone number to reach them on, if printed on the card (prefer mobile over office/fax if more than one is present). Empty string otherwise.",
    ),
  companyPhone: z
    .string()
    .describe(
      "The company's own office/switchboard number, if printed and distinguishable from the person's own mobile number above. Empty string otherwise.",
    ),
  companyAddress: z
    .string()
    .describe("The company's postal/office address, if printed on the card. Empty string otherwise."),
  companyWebsite: z
    .string()
    .describe("The company's website, if printed on the card (e.g. www.acme.com). Empty string otherwise."),
});

export type ScanCardResult = { status: "ok"; data: ContactDraft } | { status: "error"; message: string };

export async function scanBusinessCard(formData: FormData): Promise<ScanCardResult> {
  await requireAdminAction();
  if (!isAiConfigured()) {
    return { status: "error", message: "AI features aren't configured — set GEMINI_API_KEY to enable them." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo of the business card." };
  }
  if (!file.type.startsWith("image/")) {
    return { status: "error", message: "That doesn't look like an image." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { status: "error", message: "That photo is too large (max 5MB)." };
  }

  let parsed: z.infer<typeof CardSchema>;
  try {
    const client = getGeminiClient();
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.type, data: base64 } },
            { text: "This is a photo of a business card. Read it and extract the person's contact details." },
          ],
        },
      ],
      config: {
        systemInstruction:
          "You transcribe business card photos into structured contact data. Only use text actually visible on the card — never invent or guess a name, number, or company that isn't legible. Leave a field as an empty string if it isn't present or you can't read it confidently.",
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(CardSchema),
      },
    });

    const text = response.text;
    if (!text) {
      return { status: "error", message: "Couldn't read that card — try a clearer, better-lit photo." };
    }
    const result = CardSchema.safeParse(JSON.parse(text));
    if (!result.success) {
      return { status: "error", message: "Couldn't read that card — try a clearer, better-lit photo." };
    }
    parsed = result.data;
  } catch (error) {
    return { status: "error", message: describeAiError(error) };
  }

  if (!parsed.firstName && !parsed.lastName) {
    return {
      status: "error",
      message: "Couldn't make out a name on that card — try a clearer photo, or enter the details manually below.",
    };
  }

  // Prefer the card's own printed website over guessing from the contact's
  // email domain — a business card sometimes lists a personal-looking
  // email (e.g. a founder's Gmail) alongside a real company site.
  const domain = normalizeDomain(parsed.companyWebsite) || (parsed.email ? deriveCompanyDomain(parsed.email) : null);
  const company = await findOrCreateCompanyByName(parsed.companyName, {
    domain,
    phone: parsed.companyPhone,
    address: parsed.companyAddress,
  });

  return {
    status: "ok",
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      title: parsed.title,
      email: parsed.email,
      phone: parsed.phone,
      company,
    },
  };
}
