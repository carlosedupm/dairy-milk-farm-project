"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

const PWA_DISMISSED_KEY = "ceialmilk_pwa_dismissed";

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

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
  const [dismissed, setDismissed] = useState(true);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);

  useEffect(() => {
    registerServiceWorker();
  }, []);

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
      setShowInstallInstructions(true);
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

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream;
  const isChromeAndroid =
    typeof navigator !== "undefined" &&
    /Android/.test(navigator.userAgent) &&
    /Chrome/.test(navigator.userAgent);

  if (!showBanner) return null;

  return (
    <>
    <Dialog open={showInstallInstructions} onOpenChange={setShowInstallInstructions}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como instalar o CeialMilk</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {isIOS ? (
                <>
                  <p>No Safari (iPhone/iPad):</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta para cima), na barra inferior.</li>
                    <li>Role e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong>.</li>
                    <li>Toque em <strong>Adicionar</strong>.</li>
                  </ol>
                </>
              ) : isChromeAndroid ? (
                <>
                  <p>No Chrome (Android):</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Toque no menu <strong>⋮</strong> (três pontos), no canto superior direito.</li>
                    <li>Toque em <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.</li>
                    <li>Confirme em <strong>Instalar</strong>.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p>No computador (Chrome, Edge):</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Clique no ícone de <strong>instalar</strong> (⊕ ou computador com seta) na barra de endereço, <strong>ou</strong></li>
                    <li>Menu <strong>⋮</strong> → <strong>Instalar CeialMilk...</strong> ou <strong>Apps</strong> → <strong>Instalar site como aplicativo</strong>.</li>
                  </ol>
                  <p className="pt-1">Se o ícone não aparecer, use o site normalmente no navegador ou tente em um dispositivo móvel.</p>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setShowInstallInstructions(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    </>
  );
}
