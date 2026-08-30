import type { MetadataRoute } from "next";

// Lets browsers offer "Install app" / "Add to Home Screen" — see
// public/icon-192.png and public/icon-512.png for the actual brand icon
// (src/app/icon.png and apple-icon.png are the same artwork, resized for
// the favicon and iOS's own home-screen convention respectively), and
// layout.tsx's viewport export for the matching theme-color. #020617
// (slate-950) everywhere here because it's the one color that stays
// constant regardless of the app's own light/dark toggle — the top nav bar
// (src/components/layout/mobile-nav.tsx and sidebar.tsx) is always that
// dark navy in both themes, matching this icon's own background.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GoTech CRM",
    short_name: "GoTech CRM",
    description: "Manage companies, contacts, deals, and tasks in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      // Same file for both purposes — the artwork already keeps the glyph
      // well clear of the edges, so it survives Android's maskable crop
      // without needing a separately-padded variant.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
