import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { FlashToast } from "@/components/ui/flash-toast";
import "./globals.css";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

// See public/sw.js — registered here rather than gated to a specific route
// since it's harmless everywhere (including the public booking/lead-form
// pages) and does no caching of its own. Registers immediately rather than
// waiting on window's "load" event — this script itself already only runs
// after the page is interactive (strategy="afterInteractive" below), and by
// then "load" may have already fired, which would make an addEventListener
// for it never call back at all.
const SW_REGISTER_SCRIPT = `
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(function () {});
}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoTech CRM",
  description: "Manage companies, contacts, deals, and tasks in one place.",
  appleWebApp: {
    capable: true,
    title: "GoTech CRM",
    statusBarStyle: "black-translucent",
  },
};

// themeColor moved out of `metadata` in Next 14+ — see manifest.ts for why
// this exact color.
export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full min-h-full bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-slate-100">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="sw-register" strategy="afterInteractive">
          {SW_REGISTER_SCRIPT}
        </Script>
        <ToastProvider>
          <FlashToast />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
