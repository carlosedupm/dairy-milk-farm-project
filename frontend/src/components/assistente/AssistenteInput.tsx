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

/** Delay em ms antes de reabrir o microfone após TTS (anti-eco em mobile/Samsung). */
const RETRY_REOPEN_DELAY_MS = 2000;
/** Máximo de tentativas consecutivas desconhecido/erro antes de exigir clique no microfone. */
const MAX_CONSECUTIVE_RETRIES = 2;
/** Retorna o path para redirecionar após executar: animal → /animais/:id; lista de animais por fazenda → /fazendas/:id/animais; 1 fazenda → /fazendas/:id; senão /fazendas. */
function getRedirectPathFromResult(data: unknown): string {
  if (!data) return "/fazendas";
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (
      d.animal &&
      typeof d.animal === "object" &&
      d.animal !== null &&
      "id" in (d.animal as object)
    ) {
      return `/animais/${(d.animal as { id: number }).id}`;
    }
    if (typeof d.fazenda_id === "number" && d.fazenda_id > 0) {
      return `/fazendas/${d.fazenda_id}/animais`;
    }
    if (typeof d.animal_id === "number" && d.animal_id > 0) {
      return `/animais/${d.animal_id}`;
    }
  }
  if (Array.isArray(data)) {
    if (
      data.length === 1 &&
      data[0] &&
      typeof data[0] === "object" &&
      "id" in data[0]
    ) {
      return `/fazendas/${(data[0] as { id: number }).id}`;
    }
    return "/fazendas";
  }
  if (typeof data === "object" && data !== null && "id" in data) {
    return `/fazendas/${(data as { id: number }).id}`;
  }
  return "/fazendas";
}

/** Frases do sistema que podem ser eco do TTS — ignorar se transcritas. */
const ECHO_PHRASES = [
  "pode repetir ou reformular",
  "pode reformular",
  "pode reformular ou tentar novamente",
  "não foi possível entender",
  "tente reformular",
];

export function AssistenteInput() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interpretado, setInterpretado] = useState<InterpretResponse | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executando, setExecutando] = useState(false);
  const lastInputWasVoiceRef = useRef(false);
  const handleConfirmarRef = useRef<() => Promise<void>>(null);
  const handleCancelarRef = useRef<() => void>(null);
  const stopMainVoiceRef = useRef<((skipReport?: boolean) => void) | null>(
    null
  );
  const confirmationModeRef = useRef(false);
  const silenceTimeoutMsRef = useRef<number>(2500);
  const fireOnFinalSegmentRef = useRef<boolean>(false);
  const alreadyHandledConfirmRef = useRef(false);
  const startConfirmationListeningRef = useRef<(() => void) | null>(null);
  const askingMoreRef = useRef(false);
  const startedViaPointerRef = useRef(false);
  const isMountedRef = useRef(true);
  const askingMoreListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const startListeningRef = useRef<(() => void) | null>(null);
  const retryReopenDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const unknownErrorCountRef = useRef(0);
  const lastRedirectPathRef = useRef("/fazendas");

  const clearRetryReopenTimer = useCallback(() => {
    if (retryReopenDelayTimerRef.current !== null) {
      clearTimeout(retryReopenDelayTimerRef.current);
      retryReopenDelayTimerRef.current = null;
    }
  }, []);

  /** Apenas delay + reopen (para Corrigir/reformular, sem checagem de contador). */
  const scheduleDelayedReopen = useCallback(() => {
    clearRetryReopenTimer();
    retryReopenDelayTimerRef.current = setTimeout(() => {
      retryReopenDelayTimerRef.current = null;
      if (isMountedRef.current) startListeningRef.current?.();
    }, RETRY_REOPEN_DELAY_MS);
  }, [clearRetryReopenTimer]);

  /** Agenda reabertura do microfone com delay anti-eco. Após MAX_CONSECUTIVE_RETRIES, não reabre automaticamente. */
  const scheduleRetryReopen = useCallback(() => {
    if (unknownErrorCountRef.current >= MAX_CONSECUTIVE_RETRIES) {
      if (isSpeechSynthesisSupported()) {
        speak("Para tentar novamente, toque no microfone.", {
          cancelPrevious: false,
        });
      }
      return;
    }
    scheduleDelayedReopen();
  }, [scheduleDelayedReopen]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (askingMoreListenTimerRef.current !== null) {
        clearTimeout(askingMoreListenTimerRef.current);
        askingMoreListenTimerRef.current = null;
      }
      clearRetryReopenTimer();
      cancelSpeech();
    };
  }, [clearRetryReopenTimer]);

  const runInterpretar = useCallback(
    async (t: string) => {
      const trimmed = t.trim();
      if (!trimmed) return;
      setError("");
      setLoading(true);
      try {
        const resp = await assistenteService.interpretar(trimmed);
        if (!isMountedRef.current) return;
        setInterpretado(resp);
        if (resp.intent === "desconhecido") {
          unknownErrorCountRef.current += 1;
          const errorMsg =
            resp.resumo ||
            "Não foi possível entender o pedido. Tente reformular.";
          setError(errorMsg);
          setDialogOpen(false);
          if (lastInputWasVoiceRef.current && isSpeechSynthesisSupported()) {
            speak(errorMsg, {
              cancelPrevious: false,
              onEnd: () => {
                if (!isMountedRef.current) return;
                speak("Pode repetir ou reformular.", {
                  cancelPrevious: false,
                  onEnd: () => {
                    if (isMountedRef.current) scheduleRetryReopen();
                  },
                });
              },
            });
          }
        } else {
          unknownErrorCountRef.current = 0;
          setError("");
          // Parar o reconhecimento principal sem reportar de novo (evita duplicar runInterpretar).
          stopMainVoiceRef.current?.(true);
          setDialogOpen(true);
          if (lastInputWasVoiceRef.current && isSpeechSynthesisSupported()) {
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
        unknownErrorCountRef.current += 1;
        const errorMsg = getApiErrorMessage(
          err,
          "Erro ao interpretar. Tente novamente."
        );
        setError(errorMsg);
        setInterpretado(null);
        setDialogOpen(false);
        if (lastInputWasVoiceRef.current && isSpeechSynthesisSupported()) {
          speak(errorMsg, {
            cancelPrevious: false,
            onEnd: () => {
              if (!isMountedRef.current) return;
              speak("Pode repetir ou reformular.", {
                cancelPrevious: false,
                onEnd: () => {
                  if (isMountedRef.current) scheduleRetryReopen();
                },
              });
            },
          });
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [scheduleRetryReopen]
  );

  const voiceResultRef = useRef<((text: string) => void) | null>(null);
  voiceResultRef.current = (text: string) => {
    setTexto(text);
    runInterpretar(text);
  };

  const voice = useVoiceRecognition({
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
        } else if (result === "correct") {
          // Usuário quer corrigir/reformular — fechar dialog e reabrir microfone
          alreadyHandledConfirmRef.current = true;
          cancelSpeech();
          setDialogOpen(false);
          setInterpretado(null);
          setError("");
          lastInputWasVoiceRef.current = true;
          if (isSpeechSynthesisSupported()) {
            speak("Pode reformular.", {
              cancelPrevious: false,
              onEnd: () => {
                if (isMountedRef.current) scheduleDelayedReopen();
              },
            });
          } else {
            startListeningRef.current?.();
          }
        }
      } else {
        if (askingMoreRef.current) {
          const result = interpretVoiceConfirm(text);
          if (result === "cancel") {
            askingMoreRef.current = false;
            if (askingMoreListenTimerRef.current !== null) {
              clearTimeout(askingMoreListenTimerRef.current);
              askingMoreListenTimerRef.current = null;
            }
            stopListening(true);
            router.push(lastRedirectPathRef.current);
            return;
          }
          if (result === "confirm") {
            // Usuário disse "sim" — abrir microfone na hora para o próximo comando (sem esperar TTS)
            askingMoreRef.current = false;
            lastInputWasVoiceRef.current = true;
            fireOnFinalSegmentRef.current = false;
            silenceTimeoutMsRef.current = 2500;
            startListening();
            return;
          }
          askingMoreRef.current = false;
          const trimmedAsk = text.trim();
          if (trimmedAsk.length < 4) return;
          const lowerAsk = trimmedAsk.toLowerCase();
          if (ECHO_PHRASES.some((p) => lowerAsk.includes(p))) return;
          lastInputWasVoiceRef.current = true;
          voiceResultRef.current?.(text);
          return;
        }
        // Ignorar só frases CURTAS de confirmação/cancelamento no modo principal (ex.: "sim", "não", "confirmar").
        // Frases longas como "listar fazendas" não devem ser filtradas (ex.: "fazendas" contém "faz").
        const trimmed = text.trim();
        if (trimmed.length <= 14 && interpretVoiceConfirm(text) !== "unknown") {
          return;
        }
        // Ignorar eco do TTS e ruído curto (anti-loop em mobile/Samsung).
        if (trimmed.length < 4) return;
        const lower = trimmed.toLowerCase();
        if (ECHO_PHRASES.some((p) => lower.includes(p))) return;
        lastInputWasVoiceRef.current = true;
        voiceResultRef.current?.(text);
      }
    },
  });

  const {
    isListening,
    isSupported,
    error: voiceError,
    toggleListening,
    startListening,
    stopListening,
  } = voice;
  startListeningRef.current = startListening;

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
    unknownErrorCountRef.current = 0;
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
        interpretado.payload
      );
      if (!isMountedRef.current) return;
      unknownErrorCountRef.current = 0;
      const redirectPath = getRedirectPathFromResult(result.data);
      lastRedirectPathRef.current = redirectPath;
      setDialogOpen(false);
      setInterpretado(null);
      setTexto("");
      await queryClient.invalidateQueries({ queryKey: ["fazendas"] });
      const fromVoice = lastInputWasVoiceRef.current;
      if (fromVoice && isSpeechSynthesisSupported()) {
        speak(result.message, {
          onEnd: () => {
            if (!isMountedRef.current) return;
            // Preparar escuta ANTES de falar a pergunta: microfone pronto quando a pergunta terminar
            askingMoreRef.current = true;
            confirmationModeRef.current = false;
            silenceTimeoutMsRef.current = 2500;
            fireOnFinalSegmentRef.current = true; // reagir rápido a "sim" / "não"
            const phraseDurationMs = 3200; // duração aproximada de "Deseja efetuar mais alguma operação?"
            if (askingMoreListenTimerRef.current !== null) {
              clearTimeout(askingMoreListenTimerRef.current);
            }
            askingMoreListenTimerRef.current = setTimeout(() => {
              askingMoreListenTimerRef.current = null;
              if (isMountedRef.current) startListening();
            }, phraseDurationMs);
            speak("Deseja efetuar mais alguma operação?", {
              cancelPrevious: false,
            });
          },
        });
        // router.push apenas quando o fluxo "Deseja mais?" terminar (em onResult cancel)
      } else {
        router.push(redirectPath);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      unknownErrorCountRef.current += 1;
      const errorMsg = getApiErrorMessage(
        err,
        "Erro ao executar. Tente novamente."
      );
      setError(errorMsg);
      const fromVoice = lastInputWasVoiceRef.current;
      if (fromVoice && isSpeechSynthesisSupported()) {
        setDialogOpen(false);
        setInterpretado(null);
        speak(errorMsg, {
          cancelPrevious: false,
          onEnd: () => {
            if (!isMountedRef.current) return;
            speak("Pode reformular ou tentar novamente.", {
              cancelPrevious: false,
              onEnd: () => {
                if (isMountedRef.current) {
                  setError("");
                  lastInputWasVoiceRef.current = true;
                  scheduleRetryReopen();
                }
              },
            });
          },
        });
      }
    } finally {
      if (isMountedRef.current) setExecutando(false);
    }
  };

  const handleCancelar = () => {
    unknownErrorCountRef.current = 0;
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
                if (!isListening && !loading) {
                  startedViaPointerRef.current = true;
                  unknownErrorCountRef.current = 0;
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
            {typeof navigator !== "undefined" &&
              /android|iphone|ipad/i.test(navigator.userAgent) && (
                <> Em celular: fale de forma clara e pausada.</>
              )}
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
                title="Abrir microfone e dizer sim, não ou corrigir"
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 mr-1" />
                ) : (
                  <Mic className="h-4 w-4 mr-1" />
                )}
                {isListening ? "Escutando…" : "Dizer sim, não ou corrigir"}
              </Button>
            </>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelar}
              disabled={executando}
              className="sm:flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                unknownErrorCountRef.current = 0;
                cancelSpeech();
                setDialogOpen(false);
                setInterpretado(null);
                setError("");
                lastInputWasVoiceRef.current = true;
                if (isSpeechSynthesisSupported()) {
                  speak("Pode reformular.", {
                    cancelPrevious: false,
                    onEnd: () => {
                      if (isMountedRef.current) scheduleDelayedReopen();
                    },
                  });
                } else {
                  startListeningRef.current?.();
                }
              }}
              disabled={executando}
              className="sm:flex-1"
            >
              Corrigir
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={executando}
              className="sm:flex-1"
            >
              {executando ? "Executando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
