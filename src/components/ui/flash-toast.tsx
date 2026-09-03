"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

// For actions that redirect() on success (create-then-view-the-new-thing
// flows) — the submitting component unmounts before any useActionState
// result could render, so there's nowhere to hook a toast in. Instead the
// action appends `?flash=<message>` to its redirect target; this reads it
// once on the destination page, shows the toast, and strips the param via
// router.replace so a refresh or back-navigation doesn't re-show it.
function FlashToastReader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  // Tracks the last flash value actually shown, not just whether one ever
  // fired — this component stays mounted for the app's whole lifetime (root
  // layout), so it needs to react to every later redirect's flash, not just
  // a first one. Keyed on the value itself (not a boolean) so our own
  // router.replace below — which re-triggers this effect with the param
  // gone — doesn't re-show the same message, while a genuinely new flash
  // still fires even if the ref was already set.
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    const flash = searchParams.get("flash");
    if (!flash || flash === lastShownRef.current) return;
    lastShownRef.current = flash;
    toast.success(flash);
    const params = new URLSearchParams(searchParams);
    params.delete("flash");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname, toast]);

  return null;
}

// Mounted once in the root layout, wrapping the searchParams-dependent
// reader in Suspense so this app's genuinely static routes (/login, /lead,
// /book, /q/[id]) keep prerendering instead of being de-opted to
// client-only rendering for the whole tree above it.
export function FlashToast() {
  return (
    <Suspense fallback={null}>
      <FlashToastReader />
    </Suspense>
  );
}
