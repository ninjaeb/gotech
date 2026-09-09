import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { BusinessLoginForm } from "@/components/directory/business-login-form";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_unavailable: "Google sign-in is not available right now.",
  google_failed: "Google sign-in failed. Please try again.",
  email_unverified: "That Google account's email address isn't verified.",
  wrong_role: "That Google account belongs to a staff member. Staff sign in at /system/login.",
};

export default async function BusinessLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const initialError = error ? (GOOGLE_ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.") : undefined;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <BusinessLoginForm googleEnabled={isGoogleAuthConfigured()} initialError={initialError} />
    </div>
  );
}
