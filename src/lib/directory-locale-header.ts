// The public directory's language lives in a URL segment (/en|/zh|/ms/
// business, see directoryHomePath) below the root layout — and only the root
// layout renders <html lang>. src/proxy.ts copies the segment into this
// request header so the root layout can read it; nothing else should. Kept
// free of any next/* import so the proxy can pull it in cheaply.
export const DIRECTORY_LOCALE_HEADER = "x-directory-locale";

const DIRECTORY_PATH_PATTERN = /^\/(en|zh|ms)\/business(?:\/|$)/;

export function directoryLocaleFromPathname(pathname: string): "en" | "zh" | "ms" | null {
  const match = DIRECTORY_PATH_PATTERN.exec(pathname);
  return match ? (match[1] as "en" | "zh" | "ms") : null;
}
