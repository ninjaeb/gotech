// Shared by every generator under src/lib/*-generator.ts (sitemap, llms.txt)
// that writes a static file into /public instead of rendering a Next.js
// route per request. Those files are only ever meaningfully served from
// crm.gotka.com in production, so — unlike the rest of this app's
// absolute-URL-building code (see src/lib/site-url.ts), which derives the
// origin from each request's own Host header — these just hardcode it.
export const STATIC_SEO_ORIGIN = "https://crm.gotka.com";
