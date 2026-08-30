"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type EnvState = { ready: boolean; installed: boolean; isIos: boolean };

export function InstallAppCard() {
  const [env, setEnv] = useState<EnvState>({ ready: false, installed: false, isIos: false });
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Whether the app is already installed and the OS/browser both need
    // browser-only APIs (matchMedia, navigator.userAgent), so this can only
    // be read after mount — reading it during render would either crash on
    // the server or mismatch the server-rendered HTML during hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv({ ready: true, installed: isStandalone(), isIos: /iphone|ipad|ipod/i.test(navigator.userAgent) });

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setEnv((prev) => ({ ...prev, installed: true }));
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // Spent either way — the same event can't be prompted twice.
    setInstallEvent(null);
  }

  if (!env.ready) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install GoTech</CardTitle>
      </CardHeader>
      <CardBody>
        {env.installed ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {"GoTech is installed on this device — you're already using the app."}
          </p>
        ) : installEvent ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Install GoTech for a full-screen experience with its own icon — no address bar, opens straight from
              your home screen or desktop.
            </p>
            <Button type="button" onClick={handleInstall}>
              Install app
            </Button>
          </div>
        ) : env.isIos ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {'Tap the Share icon in Safari, then "Add to Home Screen".'}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {'Look for an install icon in your browser’s address bar, or "Add to Home Screen" / "Install app" in its menu.'}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
