"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const PWA_DISMISSED_KEY = "ceialmilk_pwa_dismissed";

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
  const [dismissed, setDismissed] = useState(true); // inicia true para não piscar; effect ajusta

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const id = setTimeout(() => {
      setIsStandalone(standalone);
      if (!standalone) {
        try {
          setDismissed(sessionStorage.getItem(PWA_DISMISSED_KEY) === "1");
        } catch {
          setDismissed(false);
        }
      }
    }, 0);
    if (standalone) {
      return () => clearTimeout(id);
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      clearTimeout(id);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // Em produção o beforeinstallprompt pode não disparar; mostrar banner quando não está em standalone e não dispensou (fallback)
  const showBanner = !isStandalone && !dismissed;

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: instruções manuais (Safari iOS, ou Chrome em produção sem evento)
      const isIOS =
        typeof navigator !== "undefined" &&
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as Window & { MSStream?: unknown }).MSStream;
      const msg = isIOS
        ? "No Safari: toque em Compartilhar e depois em \"Adicionar à Tela de Início\"."
        : "No menu do navegador (⋮ ou ⋯), procure por \"Instalar aplicativo\" ou \"Adicionar à tela inicial\".";
      window.alert(msg);
      setShowPrompt(false);
      setDismissed(true);
      try {
        sessionStorage.setItem(PWA_DISMISSED_KEY, "1");
      } catch {
        // ignore
      }
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    if (outcome === "accepted") {
      setDismissed(true);
      try {
        sessionStorage.setItem(PWA_DISMISSED_KEY, "1");
      } catch {
        // ignore
      }
    }
  };

  const dismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(PWA_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!showBanner) return null;

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
