"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as assistenteService from "@/services/assistente";
import type { InterpretResponse } from "@/services/assistente";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { MessageCircle, Mic, MicOff } from "lucide-react";

type ApiErrorShape = {
  response?: {
    data?: {
      error?: { message?: string; details?: unknown };
    };
  };
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object" || !("response" in err)) return fallback;
  const data = (err as ApiErrorShape).response?.data?.error;
  if (!data) return fallback;
  const details = data.details;
  if (typeof details === "string" && details.trim()) return details;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  return fallback;
}

export function AssistenteInput() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interpretado, setInterpretado] = useState<InterpretResponse | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executando, setExecutando] = useState(false);

  const runInterpretar = useCallback(async (t: string) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      const resp = await assistenteService.interpretar(trimmed);
      setInterpretado(resp);
      if (resp.intent === "desconhecido") {
        setError(
          resp.resumo ||
            "Não foi possível entender o pedido. Tente reformular.",
        );
        setDialogOpen(false);
      } else {
        setError("");
        setDialogOpen(true);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao interpretar. Tente novamente."));
      setInterpretado(null);
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const voiceResultRef = useRef<((text: string) => void) | null>(null);
  voiceResultRef.current = (text: string) => {
    setTexto(text);
    runInterpretar(text);
  };

  const {
    isListening,
    isSupported,
    error: voiceError,
    toggleListening,
  } = useVoiceRecognition({
    language: "pt-BR",
    onResult: (text, isFinal) => {
      if (isFinal && text) voiceResultRef.current?.(text);
    },
  });

  // Evitar hydration mismatch: isSupported depende de window (só existe no cliente).
  // Só mostramos o botão de voz após a montagem no cliente.
  const [showVoiceButton, setShowVoiceButton] = useState(false);
  useEffect(() => {
    setShowVoiceButton(true);
  }, []);

  const handleInterpretar = () => {
    runInterpretar(texto);
  };

  const handleConfirmar = async () => {
    if (!interpretado || interpretado.intent === "desconhecido") return;
    setError("");
    setExecutando(true);
    try {
      await assistenteService.executar(
        interpretado.intent,
        interpretado.payload,
      );
      setDialogOpen(false);
      setInterpretado(null);
      setTexto("");
      await queryClient.invalidateQueries({ queryKey: ["fazendas"] });
      router.push("/fazendas");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao executar. Tente novamente."));
    } finally {
      setExecutando(false);
    }
  };

  const handleCancelar = () => {
    setDialogOpen(false);
    setInterpretado(null);
    setError("");
  };

  return (
    <>
      <div className="flex flex-col gap-1 min-w-[200px] max-w-[320px]">
        <div className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInterpretar()}
            placeholder="O que você precisa?"
            disabled={loading}
            className="flex-1"
            title="Recurso opcional; melhor experiência com internet."
          />
          {showVoiceButton && isSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "secondary"}
              onClick={toggleListening}
              disabled={loading}
              title="Falar (melhor experiência com internet)"
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={handleInterpretar}
            disabled={loading || !texto.trim()}
            title="Enviar pedido em linguagem natural"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
        {(error || voiceError) && (
          <p className="text-xs text-destructive" role="alert">
            {error || voiceError || ""}
          </p>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => !open && handleCancelar()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar ação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {interpretado?.resumo ?? ""}
          </p>
          {error && (
            <p className="text-sm text-destructive mt-2" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Recurso em linguagem natural; melhor experiência online.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelar}
              disabled={executando}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={executando}>
              {executando ? "Executando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
