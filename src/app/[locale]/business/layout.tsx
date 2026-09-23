import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryChrome } from "@/components/directory/directory-chrome";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { getSiteOrigin } from "@/lib/site-url";

// Every URL the directory's own pages put in <head> is already absolute
// (built from getSiteOrigin), so this exists for the one relative URL Next
// adds by itself: the segment's file-based share image (./opengraph-image.tsx)
// is resolved against metadataBase when this layout's metadata merges, and
// without it Next falls back to localhost even in production, since this
// app isn't on Vercel (getSocialImageMetadataBaseFallback in
// next/dist/lib/metadata/resolvers/resolve-url.js) — a warning on every
// request, and a localhost og:image on any page that didn't override it.
export async function generateMetadata(): Promise<Metadata> {
  return { metadataBase: new URL(await getSiteOrigin()) };
}

export default async function LocalizedDirectoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolved = resolveDirectoryLocale(locale);
  if (!resolved) notFound();

  return <DirectoryChrome locale={resolved}>{children}</DirectoryChrome>;
}
