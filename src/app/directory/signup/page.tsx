import type { Metadata } from "next";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS } from "@/lib/directory-i18n";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { getSiteOrigin } from "@/lib/site-url";
import { PartnerSignupForm } from "@/components/directory/partner-signup-form";

const TITLE = "List Your Business | Business Directory";
const DESCRIPTION = "Join the business directory and start receiving inquiries directly from visitors.";

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = await getSiteOrigin();
  const imageUrl = `${siteOrigin}/icon-512.png`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${siteOrigin}/directory/signup` },
    robots: { index: true, follow: true },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: `${siteOrigin}/directory/signup`,
      siteName: "Business Directory",
      type: "website",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary",
      title: TITLE,
      description: DESCRIPTION,
      images: [imageUrl],
    },
  };
}

export default async function PartnerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, locale] = await Promise.all([searchParams, getDirectoryLocale()]);
  const t = DIRECTORY_STRINGS[locale];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-8">
      <PartnerSignupForm t={t} googleEnabled={isGoogleAuthConfigured()} initialError={error} />
    </div>
  );
}
