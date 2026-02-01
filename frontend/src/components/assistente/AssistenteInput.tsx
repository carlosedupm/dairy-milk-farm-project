"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as assistenteService from "@/services/assistente";
import type { InterpretResponse } from "@/services/assistente";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { getApiErrorMessage } from "@/lib/errors";
import {
  cancelSpeech,
  isSpeechSynthesisSupported,
  speak,
} from "@/lib/speechSynthesis";
import { interpretVoiceConfirm } from "@/lib/voiceConfirm";
import { MessageCircle, Mic, MicOff } from "lucide-react";

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
  const lastInputWasVoiceRef = useRef(false);
  const handleConfirmarRef = useRef<() => Promise<void>>(null);
  const handleCancelarRef = useRef<() => void>(null);
  const stopMainVoiceRef = useRef<((skipReport?: boolean) => void) | null>(
    null,
  );
  const confirmationModeRef = useRef(false);
  const silenceTimeoutMsRef = useRef<number>(2500);
  const fireOnFinalSegmentRef = useRef<boolean>(false);
  const alreadyHandledConfirmRef = useRef(false);
  const startConfirmationListeningRef = useRef<(() => void) | null>(null);
  const askingMoreRef = useRef(false);
  const startedViaPointerRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelSpeech();
    };
  }, []);

  const runInterpretar = useCallback(async (t: string) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      const resp = await assistenteService.interpretar(trimmed);
      if (!isMountedRef.current) return;
      setInterpretado(resp);
      if (resp.intent === "desconhecido") {
        const errorMsg =
          resp.resumo ||
          "Não foi possível entender o pedido. Tente reformular.";
        setError(errorMsg);
        setDialogOpen(false);
        if (
          lastInputWasVoiceRef.current &&
          isSpeechSynthesisSupported()
        ) {
          speak(errorMsg);
        }
      } else {
        setError("");
        // Parar o reconhecimento principal sem reportar de novo (evita duplicar runInterpretar).
        stopMainVoiceRef.current?.(true);
        setDialogOpen(true);
        if (
          lastInputWasVoiceRef.current &&
          isSpeechSynthesisSupported()
        ) {
          speak(resp.resumo, {
            onEnd: () => {
              if (isMountedRef.current && !alreadyHandledConfirmRef.current) {
                startConfirmationListeningRef.current?.();
              }
            },
          });
        }
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const errorMsg = getApiErrorMessage(
        err,
        "Erro ao interpretar. Tente novamente.",
      );
      setError(errorMsg);
      setInterpretado(null);
      setDialogOpen(false);
      if (
        lastInputWasVoiceRef.current &&
        isSpeechSynthesisSupported()
      ) {
        speak(errorMsg);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
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
    startListening,
    stopListening,
  } = useVoiceRecognition({
    language: "pt-BR",
    silenceTimeoutMs: 2500,
    silenceTimeoutMsRef,
    fireOnFinalSegmentRef,
    onResult: (text, isFinal) => {
      if (!isFinal || !text) return;
      if (confirmationModeRef.current) {
        if (alreadyHandledConfirmRef.current) return;
        const result = interpretVoiceConfirm(text);
        if (result === "confirm") {
          alreadyHandledConfirmRef.current = true;
          handleConfirmarRef.current?.();
        } else if (result === "cancel") {
          alreadyHandledConfirmRef.current = true;
          handleCancelarRef.current?.();
        }
      } else {
        if (askingMoreRef.current) {
          const result = interpretVoiceConfirm(text);
          if (result === "cancel") {
            askingMoreRef.current = false;
            stopListening(true);
            router.push("/fazendas");
            return;
          }
          if (result === "confirm") return;
          askingMoreRef.current = false;
          lastInputWasVoiceRef.current = true;
          voiceResultRef.current?.(text);
          return;
        }
        // Ignorar só frases CURTAS de confirmação/cancelamento no modo principal (ex.: "sim", "não", "confirmar").
        // Frases longas como "listar fazendas" não devem ser filtradas (ex.: "fazendas" contém "faz").
        const trimmed = text.trim();
        if (
          trimmed.length <= 14 &&
          interpretVoiceConfirm(text) !== "unknown"
        ) {
          return;
        }
        lastInputWasVoiceRef.current = true;
        voiceResultRef.current?.(text);
      }
    },
  });

  const handleInterpretar = () => {
    lastInputWasVoiceRef.current = false;
    runInterpretar(texto);
  };

  stopMainVoiceRef.current = stopListening;

  const handleMainMicClick = () => {
    if (startedViaPointerRef.current) {
      startedViaPointerRef.current = false;
      return;
    }
    askingMoreRef.current = false;
    confirmationModeRef.current = false;
    silenceTimeoutMsRef.current = 2500;
    fireOnFinalSegmentRef.current = false;
    toggleListening();
  };

  const handleConfirmar = async () => {
    if (!interpretado || interpretado.intent === "desconhecido") return;
    setError("");
    setExecutando(true);
    try {
      const result = await assistenteService.executar(
        interpretado.intent,
        interpretado.payload,
      );
      if (!isMountedRef.current) return;
      setDialogOpen(false);
      setInterpretado(null);
      setTexto("");
      await queryClient.invalidateQueries({ queryKey: ["fazendas"] });
      const fromVoice = lastInputWasVoiceRef.current;
      if (fromVoice && isSpeechSynthesisSupported()) {
        speak(result.message, {
          onEnd: () => {
            if (!isMountedRef.current) return;
            speak("Deseja efetuar mais alguma operação?", {
              cancelPrevious: false,
              onEnd: () => {
                if (!isMountedRef.current) return;
                askingMoreRef.current = true;
                confirmationModeRef.current = false;
                silenceTimeoutMsRef.current = 2500;
                fireOnFinalSegmentRef.current = false;
                startListening();
              },
            });
          },
        });
        // router.push apenas quando o fluxo "Deseja mais?" terminar (em onResult cancel)
      } else {
        router.push("/fazendas");
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const errorMsg = getApiErrorMessage(
        err,
        "Erro ao executar. Tente novamente.",
      );
      setError(errorMsg);
      if (
        lastInputWasVoiceRef.current &&
        isSpeechSynthesisSupported()
      ) {
        speak(errorMsg);
      }
    } finally {
      if (isMountedRef.current) setExecutando(false);
    }
  };

  const handleCancelar = () => {
    cancelSpeech();
    setDialogOpen(false);
    setInterpretado(null);
    setError("");
  };

  handleConfirmarRef.current = handleConfirmar;
  handleCancelarRef.current = handleCancelar;

  const startConfirmationListening = useCallback(() => {
    confirmationModeRef.current = true;
    silenceTimeoutMsRef.current = 1000;
    fireOnFinalSegmentRef.current = true;
    startListening();
  }, [startListening]);
  startConfirmationListeningRef.current = startConfirmationListening;

  // Evitar hydration mismatch: isSupported depende de window (só existe no cliente).
  const [showVoiceButton, setShowVoiceButton] = useState(false);
  useEffect(() => {
    setShowVoiceButton(true);
  }, []);

  // Iniciar escuta de confirmação por voz quando o dialog abre.
  // Só auto-inicia se o comando veio por digitação (evita TTS interferir no microfone).
  useEffect(() => {
    if (!dialogOpen || !interpretado || executando || !isSupported) return;
    alreadyHandledConfirmRef.current = false;
    confirmationModeRef.current = true;
    silenceTimeoutMsRef.current = 1000;
    fireOnFinalSegmentRef.current = true;
    const fromVoice = lastInputWasVoiceRef.current;
    if (!fromVoice) {
      const delayMs = 500;
      const t = setTimeout(() => {
        if (isMountedRef.current) startListening();
      }, delayMs);
      return () => {
        clearTimeout(t);
        confirmationModeRef.current = false;
        silenceTimeoutMsRef.current = 2500;
        fireOnFinalSegmentRef.current = false;
        stopListening(true);
      };
    }
    return () => {
      confirmationModeRef.current = false;
      silenceTimeoutMsRef.current = 2500;
      fireOnFinalSegmentRef.current = false;
      stopListening(true);
    };
  }, [
    dialogOpen,
    interpretado,
    executando,
    isSupported,
    startListening,
    stopListening,
  ]);

  return (
    <>
      <div className="flex flex-col gap-1 min-w-[200px] max-w-[320px]">
        <div className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => {
              lastInputWasVoiceRef.current = false;
              setTexto(e.target.value);
            }}
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
              onClick={handleMainMicClick}
              onPointerDown={() => {
                // Iniciar reconhecimento no pointer down para garantir gesto do usuário
                // (dentro de Dialog/modal o click pode perder o contexto de permissão do microfone)
                if (!isListening && !loading) {
                  startedViaPointerRef.current = true;
                  askingMoreRef.current = false;
                  confirmationModeRef.current = false;
                  silenceTimeoutMsRef.current = 2500;
                  fireOnFinalSegmentRef.current = false;
                  startListening();
                }
              }}
              disabled={loading}
              title={
                isListening
                  ? "Clique para parar e enviar"
                  : "Falar (melhor experiência com internet)"
              }
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
        {isListening && (
          <p className="text-xs text-muted-foreground">
            Fale e clique no microfone para parar e enviar. Ou aguarde alguns
            segundos em silêncio para envio automático.
          </p>
        )}
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
            <DialogDescription className="text-sm text-muted-foreground">
              {interpretado?.resumo ?? ""}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive mt-2" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Recurso em linguagem natural; melhor experiência online.
          </p>
          {isSupported && (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                {isListening
                  ? "Diga “sim” para confirmar ou “não” para cancelar."
                  : "Clique no microfone e diga “sim” ou “não” por voz."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startConfirmationListening}
                disabled={executando || isListening}
                title="Abrir microfone e dizer sim ou não"
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 mr-1" />
                ) : (
                  <Mic className="h-4 w-4 mr-1" />
                )}
                {isListening ? "Escutando…" : "Dizer sim ou não"}
              </Button>
            </>
          )}
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
