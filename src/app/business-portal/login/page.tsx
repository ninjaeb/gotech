import type { Metadata } from "next";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { getSiteOrigin } from "@/lib/site-url";
import { getDirectoryLocale } from "@/lib/directory-locale";
import { BusinessLoginForm } from "@/components/directory/business-login-form";

const TITLE = "Sign In | Business Directory";
const DESCRIPTION = "Sign in to manage your business listing and directory leads.";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_unavailable: "Google sign-in is not available right now.",
  google_failed: "Google sign-in failed. Please try again.",
  email_unverified: "That Google account's email address isn't verified.",
  wrong_role: "That Google account belongs to a staff member. Staff sign in at /system/login.",
};

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = await getSiteOrigin();
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${siteOrigin}/business-portal/login` },
    robots: { index: false, follow: false },
  };
}

export default async function BusinessLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, locale] = await Promise.all([searchParams, getDirectoryLocale()]);
  const initialError = error ? (GOOGLE_ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.") : undefined;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-8">
      <BusinessLoginForm googleEnabled={isGoogleAuthConfigured()} initialError={initialError} locale={locale} />
    </div>
  );
}
