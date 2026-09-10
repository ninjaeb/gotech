import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS, DIRECTORY_LOCALES, directorySignupPath } from "@/lib/directory-i18n";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { getSiteOrigin } from "@/lib/site-url";
import { PartnerSignupForm } from "@/components/directory/partner-signup-form";

const TITLE = "List Your Business | Business Directory";
const DESCRIPTION = "Join the business directory and start receiving inquiries directly from visitors.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) return {};

  const siteOrigin = await getSiteOrigin();
  const imageUrl = `${siteOrigin}/icon-512.png`;
  const url = `${siteOrigin}${directorySignupPath(resolved)}`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        DIRECTORY_LOCALES.map(({ code }) => [code, `${siteOrigin}${directorySignupPath(code)}`]),
      ),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url,
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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ locale }, { error }] = await Promise.all([params, searchParams]);
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();

  const t = DIRECTORY_STRINGS[resolved];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-8">
      <PartnerSignupForm t={t} googleEnabled={isGoogleAuthConfigured()} initialError={error} />
    </div>
  );
}
