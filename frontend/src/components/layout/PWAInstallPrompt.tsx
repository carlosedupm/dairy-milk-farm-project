"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: orientar usuário a adicionar manualmente (ex.: Safari iOS)
      setShowPrompt(false);
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    if (outcome === "accepted") {
      // PWA foi instalado
    }
  };

  const dismiss = () => setShowPrompt(false);

  if (!showPrompt || isStandalone) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
      role="region"
      aria-label="Instalar aplicativo"
    >
      <span className="text-foreground">
        Instale o CeialMilk para usar como app.
      </span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[36px] touch-manipulation"
          onClick={dismiss}
          aria-label="Dispensar"
        >
          Agora não
        </Button>
        <Button
          variant="default"
          size="sm"
          className="min-h-[36px] touch-manipulation gap-1"
          onClick={handleInstall}
          aria-label="Adicionar à tela inicial"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          Instalar
        </Button>
      </div>
    </div>
  );
}
