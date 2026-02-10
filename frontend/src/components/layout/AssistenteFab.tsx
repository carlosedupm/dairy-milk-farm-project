"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAssistente } from "@/contexts/AssistenteContext";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botão flutuante (FAB) que abre o assistente virtual.
 * Visível apenas em rotas autenticadas; oculto quando o assistente já está aberto.
 * Posição fixa com safe-area para uso em PWA/mobile.
 */
export function AssistenteFab() {
  const { user } = useAuth();
  const { assistenteOpen, openAssistente } = useAssistente();

  if (!user || assistenteOpen) {
    return null;
  }

  return (
    <Button
      variant="default"
      size="icon"
      className={cn(
        "fixed z-40 rounded-full shadow-lg size-12 min-h-[48px] min-w-[48px]",
        "hover:scale-105 transition-transform"
      )}
      style={{
        bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        right: "max(1.5rem, env(safe-area-inset-right, 0px))",
      }}
      onClick={openAssistente}
      aria-label="Abrir assistente"
      title="Assistente"
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
    </Button>
  );
}
