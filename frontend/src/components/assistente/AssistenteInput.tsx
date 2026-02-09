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
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { VoiceWaveform } from "./VoiceWaveform";
import { getApiErrorMessage } from "@/lib/errors";
import {
  cancelSpeech,
  isSpeechSynthesisSupported,
  speak,
} from "@/lib/speechSynthesis";
import { interpretVoiceConfirm } from "@/lib/voiceConfirm";
import { Loader2, MessageCircle, Mic, MicOff } from "lucide-react";

/** Delay em ms antes de reabrir o microfone após TTS (anti-eco em mobile/Samsung). */
const RETRY_REOPEN_DELAY_MS = 2000;
/** No mobile, delay menor para não parecer que travou. */
const RETRY_REOPEN_DELAY_MOBILE_MS = 1000;

function isMobileOrAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod/.test(ua) || "ontouchstart" in window;
}
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

/** Sugestões rápidas para o usuário (clicáveis). */
const SUGESTOES_RAPIDAS = [
  "Quantos animais eu tenho?",
  "Ver produção da fazenda",
  "Listar animais da fazenda ativa",
];

/** Frases do sistema que podem ser eco do TTS — ignorar se transcritas. */
const ECHO_PHRASES = [
  "pode repetir ou reformular",
  "pode reformular",
  "pode reformular ou tentar novamente",
  "não foi possível entender",
  "tente reformular",
];

/** Normaliza texto para comparação (lowercase, trim, colapsa espaços). */
function normalizeForEcho(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Verifica se a transcrição parece ser eco da fala do assistente (TTS capturado pelo microfone). */
function isEchoTranscript(transcript: string, lastAssistantText: string | null): boolean {
  if (!transcript.trim()) return true;
  const t = normalizeForEcho(transcript);
  if (ECHO_PHRASES.some((phrase) => t.includes(phrase) || phrase.includes(t))) return true;
  if (!lastAssistantText?.trim()) return false;
  const a = normalizeForEcho(lastAssistantText);
  const tWords = t.split(/\s+/).filter(Boolean);
  // Frases curtas do usuário (ex.: "sim", "não", "listar animais") não tratar como eco — permitir interromper
  if (tWords.length <= 2 && a.length > 30) return false;
  // Eco: transcrição é substring da resposta do assistente ou muito parecida
  if (a.length >= 10 && (a.includes(t) || t.includes(a))) return true;
  const aWords = new Set(a.split(/\s+/).filter(Boolean));
  if (tWords.length >= 3) {
    const matchCount = tWords.filter((w) => aWords.has(w)).length;
    if (matchCount >= 0.8 * tWords.length) return true;
  }
  return false;
}

export function AssistenteInput() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fazendaAtiva } = useFazendaAtiva();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const [liveText, setLiveText] = useState("");
  /** True enquanto aguarda resposta do Gemini no modo Live (entre sendText e type: text/error). */
  const [liveThinking, setLiveThinking] = useState(false);
  /** Mensagem de status da reconexão (Reconectando… / Reconectado.) — sempre em texto para mobile. */
  const [liveReconnectStatus, setLiveReconnectStatus] = useState("");
  const [interpretado, setInterpretado] = useState<InterpretResponse | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executando, setExecutando] = useState(false);
  /** True no fluxo "Deseja efetuar mais alguma operação?" (aguardando sim/não ou próximo comando). */
  const [aguardandoMaisOperacao, setAguardandoMaisOperacao] = useState(false);
  /** True enquanto o timer de 3,2 s está rodando (mic abrirá em breve após o TTS). */
  const [micAbreEmBreve, setMicAbreEmBreve] = useState(false);
  /** True nos primeiros 500 ms após abrir o dialog de confirmação (quando comando veio por digitação). */
  const [preparandoOuvirConfirmacao, setPreparandoOuvirConfirmacao] =
    useState(false);
  /** True após o timer de lembrete (usuário demorou a confirmar). */
  const [mostrarLembreteConfirmacao, setMostrarLembreteConfirmacao] =
    useState(false);
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
  const confirmationReminderTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  /** Timeout de fallback quando TTS onEnd não dispara (ex.: Android). */
  const confirmationTtsFallbackTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const unknownErrorCountRef = useRef(0);
  const lastRedirectPathRef = useRef("/fazendas");
  /** True enquanto runInterpretar está em execução (evita dupla chamada por race onresult/onend no Android). */
  const interpretarInFlightRef = useRef(false);
  /** Refs para Page Visibility: re-sincronizar escuta de confirmação ao voltar à aba. */
  const dialogOpenRef = useRef(false);
  const interpretadoRef = useRef<InterpretResponse | null>(null);
  const executandoRef = useRef(false);
  /** True enquanto o timer de reabertura do microfone está ativo (feedback visual no mobile). */
  const [reopeningMicInProgress, setReopeningMicInProgress] = useState(false);
  const reopenMicStateSetterRef = useRef<(() => void) | null>(null);
  reopenMicStateSetterRef.current = () => setReopeningMicInProgress(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  /** Última resposta de texto do assistente no Live (para filtrar eco). */
  const lastLiveTextRef = useRef<string | null>(null);
  const stopLiveVoiceRef = useRef<((skipReport?: boolean) => void) | null>(null);

  const geminiLive = useGeminiLive({
    fazendaId: fazendaAtiva?.id,
    onTextResponse: (text) => {
      setLiveThinking(false);
      lastLiveTextRef.current = text;
      setLiveText(text);
      if (isSpeechSynthesisSupported()) {
        speak(text, { cancelPrevious: true });
      }
    },
    onCloseRequest: (message) => {
      setLiveThinking(false);
      if (isSpeechSynthesisSupported()) {
        speak(message, {
          cancelPrevious: true,
          onEnd: () => handleCancelar()
        });
      } else {
        handleCancelar();
      }
    },
    onAudioResponse: async (audioData) => {
      // ... (reprodução de áudio)
    },
    onError: (err) => {
      setLiveThinking(false);
      setLiveReconnectStatus("");
      setError(err);
      setLiveMode(false);
      if (isSpeechSynthesisSupported()) {
        speak(err, { cancelPrevious: true });
      }
    },
    onReconnecting: (msg) => {
      setLiveReconnectStatus(msg);
    },
    onReconnected: (msg) => {
      setLiveReconnectStatus(msg);
      if (isSpeechSynthesisSupported()) {
        speak(msg, { cancelPrevious: false });
      }
      // Limpar mensagem após alguns segundos
      setTimeout(() => setLiveReconnectStatus(""), 3000);
    }
  });

  // Hook de voz para o modo Live (transcreve e envia via WebSocket)
  const { 
    startListening: startLiveVoice, 
    stopListening: stopLiveVoice,
    isListening: isVoiceListening,
    transcript: liveTranscript,
    isSupported: isVoiceSupported,
  } = useVoiceRecognition({
    onResult: (text, isFinal) => {
      if (!liveMode || !isFinal || !text.trim()) return;
      if (isEchoTranscript(text, lastLiveTextRef.current)) return;
      cancelSpeech();
      geminiLive.sendText(text);
    },
    language: "pt-BR",
  });
  const isSupported = isVoiceSupported;
  stopLiveVoiceRef.current = stopLiveVoice;

  // Debug do estado de voz
  useEffect(() => {
    if (liveMode) {
      console.log("Modo Live ativo, estado do microfone:", isVoiceListening);
    }
  }, [liveMode, isVoiceListening]);

  // Sincronizar o reconhecimento de voz com o modo Live (apenas se o navegador suportar)
  useEffect(() => {
    if (liveMode && isVoiceSupported) {
      startLiveVoice();
    } else {
      stopLiveVoice(true);
    }
  }, [liveMode, isVoiceSupported, startLiveVoice, stopLiveVoice]);

  // Auto-religar o microfone no modo Live para manter a conversa contínua
  useEffect(() => {
    if (liveMode && isVoiceSupported && !isVoiceListening) {
      const timer = setTimeout(() => {
        if (liveMode && isVoiceSupported && !isVoiceListening) {
          startLiveVoice();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [liveMode, isVoiceSupported, isVoiceListening, startLiveVoice]);

  /** Delay em ms antes de lembrar o usuário de confirmar (dialog de confirmação). */
  const CONFIRMATION_REMINDER_MS = 10000;

  const clearRetryReopenTimer = useCallback(() => {
    if (retryReopenDelayTimerRef.current !== null) {
      clearTimeout(retryReopenDelayTimerRef.current);
      retryReopenDelayTimerRef.current = null;
    }
    reopenMicStateSetterRef.current?.();
  }, []);

  /** Apenas delay + reopen (para Corrigir/reformular, sem checagem de contador). */
  const scheduleDelayedReopen = useCallback(() => {
    clearRetryReopenTimer();
    const delayMs = isMobileOrAndroid()
      ? RETRY_REOPEN_DELAY_MOBILE_MS
      : RETRY_REOPEN_DELAY_MS;
    setReopeningMicInProgress(true);
    retryReopenDelayTimerRef.current = setTimeout(() => {
      retryReopenDelayTimerRef.current = null;
      reopenMicStateSetterRef.current?.();
      if (isMountedRef.current) startListeningRef.current?.();
    }, delayMs);
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
      if (confirmationReminderTimerRef.current !== null) {
        clearTimeout(confirmationReminderTimerRef.current);
        confirmationReminderTimerRef.current = null;
      }
      if (confirmationTtsFallbackTimerRef.current !== null) {
        clearTimeout(confirmationTtsFallbackTimerRef.current);
        confirmationTtsFallbackTimerRef.current = null;
      }
      setAguardandoMaisOperacao(false);
      setMicAbreEmBreve(false);
      setPreparandoOuvirConfirmacao(false);
      setMostrarLembreteConfirmacao(false);
      clearRetryReopenTimer();
      cancelSpeech();
    };
  }, [clearRetryReopenTimer]);

  const runInterpretar = useCallback(
    async (t: string) => {
      const trimmed = t.trim();
      if (!trimmed) return;
      if (interpretarInFlightRef.current) return;
      interpretarInFlightRef.current = true;
      setError("");
      setLoading(true);
      try {
        const resp = await assistenteService.interpretar(
          trimmed,
          fazendaAtiva?.id
        );
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
            if (confirmationTtsFallbackTimerRef.current !== null) {
              clearTimeout(confirmationTtsFallbackTimerRef.current);
              confirmationTtsFallbackTimerRef.current = null;
            }
            const fallbackMs = 4000;
            confirmationTtsFallbackTimerRef.current = setTimeout(() => {
              confirmationTtsFallbackTimerRef.current = null;
              if (
                isMountedRef.current &&
                !alreadyHandledConfirmRef.current &&
                startConfirmationListeningRef.current
              ) {
                startConfirmationListeningRef.current();
              }
            }, fallbackMs);
            speak(resp.resumo, {
              onEnd: () => {
                if (confirmationTtsFallbackTimerRef.current !== null) {
                  clearTimeout(confirmationTtsFallbackTimerRef.current);
                  confirmationTtsFallbackTimerRef.current = null;
                }
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
        interpretarInFlightRef.current = false;
        if (isMountedRef.current) setLoading(false);
      }
    },
    [scheduleRetryReopen, fazendaAtiva?.id]
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
            setAguardandoMaisOperacao(false);
            setMicAbreEmBreve(false);
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
            setAguardandoMaisOperacao(false);
            lastInputWasVoiceRef.current = true;
            fireOnFinalSegmentRef.current = false;
            silenceTimeoutMsRef.current = 2500;
            startListening();
            return;
          }
          askingMoreRef.current = false;
          setAguardandoMaisOperacao(false);
          const trimmedAsk = text.trim();
          if (trimmedAsk.length < 4) return;
          const lowerAsk = trimmedAsk.toLowerCase();
          if (ECHO_PHRASES.some((p) => lowerAsk.includes(p))) return;
          if (interpretarInFlightRef.current) return;
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
        if (interpretarInFlightRef.current) return;
        lastInputWasVoiceRef.current = true;
        voiceResultRef.current?.(text);
      }
    },
  });

  const {
    isListening,
    error: voiceError,
    toggleListening,
    startListening,
    stopListening,
  } = voice;
  startListeningRef.current = startListening;
  dialogOpenRef.current = dialogOpen;
  interpretadoRef.current = interpretado;
  executandoRef.current = executando;
  const isListeningRef = useRef(false);
  isListeningRef.current = isListening;

  const handleInterpretar = () => {
    lastInputWasVoiceRef.current = false;
    if (liveMode && texto.trim()) {
      geminiLive.sendText(texto.trim());
      setTexto("");
      return;
    }
    runInterpretar(texto);
  };

  stopMainVoiceRef.current = stopListening;

  const handleMainMicClick = () => {
    if (startedViaPointerRef.current) {
      startedViaPointerRef.current = false;
      return;
    }

    // Toggle entre modo Live e modo normal
    if (liveMode) {
      geminiLive.stop();
      setLiveThinking(false);
      setLiveReconnectStatus("");
      setLiveMode(false);
      return;
    }

    // Se o usuário clicar no microfone, ativamos o modo Live por padrão para uma experiência mais natural
    setLiveMode(true);
    geminiLive.start();
    
    unknownErrorCountRef.current = 0;
    askingMoreRef.current = false;
    setAguardandoMaisOperacao(false);
    setMicAbreEmBreve(false);
    confirmationModeRef.current = false;
    silenceTimeoutMsRef.current = 2500;
    fireOnFinalSegmentRef.current = false;
  };

  const handleConfirmar = async () => {
    if (!interpretado || interpretado.intent === "desconhecido") return;
    setError("");
    setExecutando(true);
    try {
      const result = await assistenteService.executar(
        interpretado.intent,
        interpretado.payload,
        fazendaAtiva?.id
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
            setAguardandoMaisOperacao(true);
            setMicAbreEmBreve(true);
            confirmationModeRef.current = false;
            silenceTimeoutMsRef.current = 2500;
            fireOnFinalSegmentRef.current = true; // reagir rápido a "sim" / "não"
            const phraseDurationMs = 3200; // duração aproximada de "Deseja efetuar mais alguma operação?"
            if (askingMoreListenTimerRef.current !== null) {
              clearTimeout(askingMoreListenTimerRef.current);
            }
            askingMoreListenTimerRef.current = setTimeout(() => {
              askingMoreListenTimerRef.current = null;
              setMicAbreEmBreve(false);
              if (isMountedRef.current) startListening();
            }, phraseDurationMs);
            speak("Deseja efetuar mais alguma operação?", {
              cancelPrevious: false,
              onEnd: () => {
                if (isMountedRef.current && isSpeechSynthesisSupported()) {
                  speak("Pode falar.", { cancelPrevious: false });
                }
              },
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
    if (confirmationTtsFallbackTimerRef.current !== null) {
      clearTimeout(confirmationTtsFallbackTimerRef.current);
      confirmationTtsFallbackTimerRef.current = null;
    }
    unknownErrorCountRef.current = 0;
    setAguardandoMaisOperacao(false);
    setMicAbreEmBreve(false);
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

  // Page Visibility: ao voltar à aba, re-sincronizar escuta de confirmação se o dialog está aberto e o reconhecimento abortou.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (
        !dialogOpenRef.current ||
        !interpretadoRef.current ||
        executandoRef.current ||
        !confirmationModeRef.current ||
        isListeningRef.current ||
        alreadyHandledConfirmRef.current ||
        !startConfirmationListeningRef.current
      )
        return;
      startConfirmationListeningRef.current();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Iniciar escuta de confirmação por voz quando o dialog abre.
  // Só auto-inicia se o comando veio por digitação (evita TTS interferir no microfone).
  // Timer de lembrete: após CONFIRMATION_REMINDER_MS avisa o usuário por TTS e mensagem visual.
  useEffect(() => {
    if (!dialogOpen || !interpretado || executando || !isSupported) return;
    alreadyHandledConfirmRef.current = false;
    confirmationModeRef.current = true;
    silenceTimeoutMsRef.current = 1000;
    fireOnFinalSegmentRef.current = true;
    setMostrarLembreteConfirmacao(false);

    if (confirmationReminderTimerRef.current !== null) {
      clearTimeout(confirmationReminderTimerRef.current);
      confirmationReminderTimerRef.current = null;
    }
    confirmationReminderTimerRef.current = setTimeout(() => {
      confirmationReminderTimerRef.current = null;
      if (!isMountedRef.current || alreadyHandledConfirmRef.current) return;
      setMostrarLembreteConfirmacao(true);
      if (isSpeechSynthesisSupported()) {
        speak(
          "Aguardando sua confirmação. Diga sim para confirmar ou não para cancelar.",
          { cancelPrevious: false }
        );
      }
    }, CONFIRMATION_REMINDER_MS);

    const clearReminderTimer = () => {
      if (confirmationReminderTimerRef.current !== null) {
        clearTimeout(confirmationReminderTimerRef.current);
        confirmationReminderTimerRef.current = null;
      }
    };

    const fromVoice = lastInputWasVoiceRef.current;
    if (!fromVoice) {
      setPreparandoOuvirConfirmacao(true);
      const delayMs = 500;
      const t = setTimeout(() => {
        setPreparandoOuvirConfirmacao(false);
        if (isMountedRef.current) startListening();
      }, delayMs);
      return () => {
        clearTimeout(t);
        clearReminderTimer();
        setPreparandoOuvirConfirmacao(false);
        setMostrarLembreteConfirmacao(false);
        confirmationModeRef.current = false;
        silenceTimeoutMsRef.current = 2500;
        fireOnFinalSegmentRef.current = false;
        stopListening(true);
      };
    }
    return () => {
      clearReminderTimer();
      setMostrarLembreteConfirmacao(false);
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

  const handleSugestaoClick = useCallback(
    (sugestao: string) => {
      if (loading) return;
      lastInputWasVoiceRef.current = false;
      if (liveMode) {
        geminiLive.sendText?.(sugestao);
        setLiveThinking(true);
      } else {
        setTexto(sugestao);
        runInterpretar(sugestao);
      }
    },
    [loading, liveMode, runInterpretar, geminiLive]
  );

  return (
    <>
      <div className="flex flex-col gap-3 w-full min-w-0">
          <div className="flex gap-2 items-center">
            {liveMode && (
              <span
                className="shrink-0 rounded-full bg-primary/20 text-primary px-2 py-0.5 text-xs font-medium"
                title="Conversa em tempo real ativa"
              >
                Live
              </span>
            )}
            <Input
              value={texto}
              onChange={(e) => {
                lastInputWasVoiceRef.current = false;
                setTexto(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (liveMode && texto.trim()) {
                    geminiLive.sendText?.(texto.trim());
                    setTexto("");
                    setLiveThinking(true);
                  } else if (!liveMode) {
                    handleInterpretar();
                  }
                }
              }}
              placeholder={
                liveMode
                  ? isSupported
                    ? "Fale ou digite aqui..."
                    : "Digite sua mensagem e pressione Enter ou clique em Enviar"
                  : "O que você precisa?"
              }
              disabled={loading}
              className="flex-1 min-w-0"
              title="Recurso opcional; melhor experiência com internet."
            />
          {showVoiceButton && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="icon"
                variant={liveMode ? "destructive" : "secondary"}
                onClick={handleMainMicClick}
                disabled={loading}
                className="min-h-[44px] min-w-[44px] touch-manipulation"
                aria-label={liveMode ? "Parar Assistente Live" : "Conversar em tempo real (voz ou texto)"}
                title={
                  liveMode
                    ? "Parar Assistente Live"
                    : isSupported
                      ? "Conversar em tempo real (voz ou texto)"
                      : "Conversar em tempo real (digite sua mensagem)"
                }
              >
                {liveMode ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              {liveMode && isSupported && <VoiceWaveform isActive={liveMode} />}
            </div>
          )}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="Enviar pedido em linguagem natural"
            onClick={() => {
              if (liveMode && texto.trim()) {
                geminiLive.sendText?.(texto.trim());
                setTexto("");
                setLiveThinking(true);
              } else {
                handleInterpretar();
              }
            }}
            disabled={loading || (!liveMode && !texto.trim())}
            title="Enviar pedido em linguagem natural"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground self-center mr-1">Sugestões:</span>
            {SUGESTOES_RAPIDAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSugestaoClick(s)}
                className="min-h-[44px] rounded-full border border-border bg-muted/50 px-3 py-2 text-xs text-foreground hover:bg-muted hover:border-primary/30 transition-colors touch-manipulation"
                aria-label={`Sugestão: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {liveMode && liveThinking && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5" role="status" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
            Assistente está pensando…
          </p>
        )}
        {liveMode && liveReconnectStatus && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5" role="status" aria-live="polite">
            {liveReconnectStatus.includes("Reconectando") ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
            ) : null}
            {liveReconnectStatus}
          </p>
        )}
        {loading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5" role="status" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
            Interpretando…
          </p>
        )}
        {liveMode && liveText && (
          <div className="p-2 rounded-md bg-primary/10 border border-primary/20 text-sm animate-in fade-in slide-in-from-top-1 min-h-[2.5rem]">
            <p className="font-medium text-primary text-xs mb-1">Assistente Live:</p>
            {liveText}
          </div>
        )}
        {geminiLive.isOffline && (
          <p className="text-xs text-amber-600 dark:text-amber-500" role="alert">
            O assistente precisa de internet. Verifique sua conexão e tente novamente.
          </p>
        )}
        {liveMode && !isSupported && (
          <p className="text-xs text-muted-foreground" role="status">
            Voz não disponível neste navegador. Digite sua mensagem acima e clique em Enviar ou pressione Enter.
          </p>
        )}
        {liveMode && liveTranscript && (
          <div className="mt-1 p-2 rounded-md bg-muted border border-border text-sm italic">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Você disse:</p>
            {liveTranscript}
          </div>
        )}
        {reopeningMicInProgress && (
          <div
            className="flex items-center gap-2 rounded-md border border-muted-foreground/30 bg-muted/50 px-2 py-1.5 text-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span className="text-muted-foreground">
              Aguarde… reabrindo microfone.
            </span>
          </div>
        )}
        {(aguardandoMaisOperacao || isListening || (liveMode && isVoiceListening)) && (
          <div
            className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-sm"
            role="status"
            aria-live="polite"
            aria-label={
              micAbreEmBreve
                ? "Em instantes você poderá falar."
                : "Pode falar agora."
            }
          >
            <Mic
              className={`h-4 w-4 shrink-0 text-primary ${
                isListening ? "animate-pulse" : ""
              }`}
              aria-hidden
            />
            <span className="text-foreground">
              {micAbreEmBreve
                ? "Em instantes você poderá falar."
                : "Pode falar agora."}
            </span>
          </div>
        )}
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
            <DialogDescription asChild>
              <div className="rounded-lg border border-border bg-muted/50 p-3 mt-1 text-sm text-foreground">
                {interpretado?.resumo ?? ""}
              </div>
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive mt-2" role="alert">
              {error}
            </p>
          )}
          {mostrarLembreteConfirmacao && (
            <p
              className="mt-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-sm text-foreground"
              role="status"
              aria-live="polite"
            >
              Aguardando sua confirmação. Diga sim ou não por voz.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Recurso em linguagem natural; melhor experiência online.
          </p>
          {isSupported && (
            <div
              className="mt-3 rounded-lg border border-primary/30 bg-muted/50 p-3"
              role="status"
              aria-live="polite"
              aria-label={
                preparandoOuvirConfirmacao
                  ? "Preparando para ouvir."
                  : isListening
                  ? "Escutando. Diga sim para confirmar ou não para cancelar."
                  : "Clique no microfone e diga sim ou não por voz."
              }
            >
              {preparandoOuvirConfirmacao ? (
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <Mic className="h-4 w-4 shrink-0 animate-pulse" aria-hidden />
                  Preparando para ouvir…
                </p>
              ) : (
                <>
                  <p className="text-sm text-foreground">
                    {isListening
                      ? "Diga “sim” para confirmar ou “não” para cancelar."
                      : "Clique no microfone e diga “sim” ou “não” por voz."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 min-h-[44px] touch-manipulation"
                    onClick={startConfirmationListening}
                    disabled={executando || isListening}
                    title="Abrir microfone e dizer sim, não ou corrigir"
                    aria-label="Abrir microfone e dizer sim, não ou corrigir"
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4 mr-1 shrink-0" aria-hidden />
                    ) : (
                      <Mic className="h-4 w-4 mr-1 shrink-0" aria-hidden />
                    )}
                    {isListening ? "Escutando…" : "Dizer sim, não ou corrigir"}
                  </Button>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelar}
              disabled={executando}
              className="sm:flex-1 min-h-[44px] touch-manipulation"
              aria-label="Cancelar"
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              className="sm:flex-1 min-h-[44px] touch-manipulation"
              aria-label="Corrigir ou reformular"
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
            >
              Corrigir
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={executando}
              className="sm:flex-1 min-h-[44px] touch-manipulation"
              aria-label="Confirmar ação"
            >
              {executando ? "Executando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
