import { DirectoryChrome } from "@/components/directory/directory-chrome";

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return <DirectoryChrome>{children}</DirectoryChrome>;
}
