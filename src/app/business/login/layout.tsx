import { DirectoryChrome } from "@/components/directory/directory-chrome";

// Same site chrome as /directory and /directory/signup (see
// directory-chrome.tsx) — this is a sibling of the (dashboard) route group,
// so it doesn't inherit business/(dashboard)/layout.tsx's authenticated
// portal shell, and gets this instead rather than a bare page.
export default function BusinessLoginLayout({ children }: { children: React.ReactNode }) {
  return <DirectoryChrome>{children}</DirectoryChrome>;
}
