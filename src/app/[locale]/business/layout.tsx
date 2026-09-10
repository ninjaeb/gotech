import { notFound } from "next/navigation";
import { DirectoryChrome } from "@/components/directory/directory-chrome";
import { resolveDirectoryLocale } from "@/lib/directory-locale";

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
