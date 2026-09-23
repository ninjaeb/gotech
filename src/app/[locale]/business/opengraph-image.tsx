import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { DIRECTORY_HOME_TITLE_BY_LOCALE, DIRECTORY_STRINGS, type DirectoryLocale } from "@/lib/directory-i18n";
import { DIRECTORY_SHARE_IMAGE_ALT, DIRECTORY_SHARE_IMAGE_SIZE } from "@/lib/directory-seo";

// The share image (og:image/twitter:image) every directory page points at
// (see directoryShareImage) — home, category and sign-up pages, and a
// listing without a logo of its own. Rendered at the 1200×630 every
// platform's link preview expects, in place of the 512px square app icon
// these pages used to point at, which previews cropped or letterboxed.
export const alt = DIRECTORY_SHARE_IMAGE_ALT;
export const size = DIRECTORY_SHARE_IMAGE_SIZE;
export const contentType = "image/png";

// The icon never changes between requests — read once at module scope.
const iconSrc = `data:image/png;base64,${await readFile(join(process.cwd(), "public", "icon-512.png"), "base64")}`;

// ImageResponse ships only a Latin default font (and bundling a CJK face
// would blow its 500KB bundle cap several times over), so the Chinese
// variant renders its text in English rather than as missing-glyph boxes.
// Malay is Latin-script and gets its own words.
const TEXT_LOCALE: Record<DirectoryLocale, DirectoryLocale> = { en: "en", zh: "en", ms: "ms" };

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const textLocale = TEXT_LOCALE[resolveDirectoryLocale(locale) ?? "en"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #083a3f 0%, #0d5c63 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <img src={iconSrc} width={160} height={160} alt="" style={{ borderRadius: 32 }} />
        <div style={{ marginTop: 40, fontSize: 72, fontWeight: 700, letterSpacing: -1 }}>
          {DIRECTORY_HOME_TITLE_BY_LOCALE[textLocale]}
        </div>
        <div style={{ marginTop: 16, fontSize: 32, color: "#54b9c0" }}>{DIRECTORY_STRINGS[textLocale].footerTagline}</div>
        <div style={{ position: "absolute", bottom: 40, fontSize: 28, color: "#e2f6ec" }}>crm.gotka.com</div>
      </div>
    ),
    { ...size },
  );
}
