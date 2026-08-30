import type { MetadataRoute } from "next";

// Lets browsers offer "Install app" / "Add to Home Screen" — see the icon-*
// routes for the actual generated icons, and layout.tsx's viewport export
// for the matching theme-color. #020617 (slate-950) everywhere here because
// it's the one color that stays constant regardless of the app's own light/
// dark toggle — the top nav bar (src/components/layout/mobile-nav.tsx and
// sidebar.tsx) is always that dark navy in both themes.
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
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
