"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import {
  getVapidPublicKey,
  isPushSupported,
  subscribeToPushNotifications,
  syncPushSubscriptionIfGranted,
} from "@/services/pushNotifications";

const PUSH_DISMISSED_KEY = "ceialmilk_push_dismissed";

export function PushPermissionBanner() {
  const { isAuthenticated, isReady: authReady } = useAuth();
  const { fazendas, isLoading: fazendasLoading } = useMinhasFazendas();
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(false);

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      setVisible(false);
      return;
    }
    if (fazendasLoading) return;

    if (typeof window === "undefined" || !isPushSupported()) {
      setVisible(false);
      return;
    }

    if (Notification.permission === "denied") {
      setVisible(false);
      return;
    }

    if (fazendas.length === 0) {
      setVisible(false);
      return;
    }

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(PUSH_DISMISSED_KEY) === "1";
    } catch {
      dismissed = false;
    }

    if (Notification.permission === "granted") {
      void getVapidPublicKey().then((key) => {
        if (key) void syncPushSubscriptionIfGranted();
      });
      setVisible(false);
      return;
    }

    void getVapidPublicKey().then((key) => {
      setPushAvailable(!!key);
      setVisible(!dismissed && Notification.permission === "default" && !!key);
    });
  }, [authReady, isAuthenticated, fazendas.length, fazendasLoading]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(PUSH_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const ok = await subscribeToPushNotifications();
      if (ok) {
        setVisible(false);
      }
    } finally {
      setActivating(false);
    }
  };

  if (!visible || !pushAvailable) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
      role="region"
      aria-label="Ativar notificações"
    >
      <span className="flex items-center gap-2 text-foreground">
        <Bell className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        Receba alertas críticos mesmo com o navegador fechado.
      </span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[36px] touch-manipulation"
          onClick={dismiss}
          aria-label="Agora não"
        >
          Agora não
        </Button>
        <Button
          variant="default"
          size="sm"
          className="min-h-[36px] touch-manipulation"
          onClick={handleActivate}
          disabled={activating}
          aria-label="Ativar notificações"
        >
          {activating ? "A ativar…" : "Ativar notificações"}
        </Button>
      </div>
    </div>
  );
}
