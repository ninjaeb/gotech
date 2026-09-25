import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_STRINGS, directoryBenefitsPath, directorySignupPath } from "@/lib/directory-i18n";
import {
  DIRECTORY_ROBOTS,
  DIRECTORY_SITE_NAME_BY_LOCALE,
  OG_LOCALE_BY_DIRECTORY_LOCALE,
  buildLanguageAlternates,
  directoryShareImage,
} from "@/lib/directory-seo";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { getSiteOrigin } from "@/lib/site-url";
import { PartnerSignupForm } from "@/components/directory/partner-signup-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) return {};

  const siteOrigin = await getSiteOrigin();
  // The same heading/subheading the form itself shows, in the page's own
  // language — this used to be one English title for all three locales.
  const t = DIRECTORY_STRINGS[resolved];
  const siteName = DIRECTORY_SITE_NAME_BY_LOCALE[resolved];
  const title = `${t.signupHeading} | ${siteName}`;
  const description = t.signupSubheading;
  const url = `${siteOrigin}${directorySignupPath(resolved)}`;
  const shareImage = directoryShareImage(siteOrigin, resolved);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(siteOrigin, directorySignupPath),
    },
    robots: DIRECTORY_ROBOTS,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "website",
      locale: OG_LOCALE_BY_DIRECTORY_LOCALE[resolved],
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
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
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href={directoryBenefitsPath(resolved)} className="text-petrol underline hover:no-underline dark:text-petrol-light">
          {t.benefitsNavLabel}
        </Link>
      </p>
    </div>
  );
}
