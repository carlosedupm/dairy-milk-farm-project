"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  isMicPermissionDeniedMessage,
  requestMicrophoneAccess,
} from "@/lib/microphonePermission";

/** Detecta mobile/Android para aplicar workarounds da Web Speech API (Chrome Android tem suporte limitado a continuous). */
function isMobileOrAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    /android/.test(ua) ||
    /iphone|ipad|ipod/.test(ua) ||
    "ontouchstart" in window
  );
}

// Web Speech API - SpeechRecognition is not in TypeScript DOM lib
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (
        window as Window & {
          SpeechRecognition?: new () => SpeechRecognitionInstance;
          webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        }
      ).SpeechRecognition ??
      (
        window as Window & {
          webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        }
      ).webkitSpeechRecognition
    : undefined;

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventInstance) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventInstance {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      length: number;
      [j: number]: { transcript: string };
    };
  };
}

export interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  isFinal: boolean;
  error: string | null;
  /** True após not-allowed até nova tentativa explícita do usuário. */
  micPermissionDenied: boolean;
  startListening: () => void;
  /** Se skipReport for true, não chama onResult ao parar (evita duplicar ação). */
  stopListening: (skipReport?: boolean) => void;
  toggleListening: () => void;
  isSupported: boolean;
}

export function useVoiceRecognition(options?: {
  onResult?: (text: string, isFinal: boolean) => void;
  language?: string;
  /** Se > 0, após esse tempo em ms sem novos resultados, finaliza e chama onResult. Se 0 ou undefined, só finaliza no clique em parar. */
  silenceTimeoutMs?: number;
  /** Se true, chama onResult assim que um segmento for marcado como final (resposta mais rápida para comandos curtos). */
  fireOnFinalSegment?: boolean;
  /** Refs opcionais para mudar timeout e fireOnFinal em tempo de execução (ex.: modo confirmação). */
  silenceTimeoutMsRef?: { current?: number };
  fireOnFinalSegmentRef?: { current?: boolean };
  /**
   * Modo conversa contínua (Live): ao receber segmento final, envia onResult mas mantém o mic ativo.
   * Sem isso, no desktop o reconhecimento para após a primeira frase.
   */
  keepListeningAfterFinal?: boolean;
  /** Chamado quando a sessão do SpeechRecognition termina (ex.: para reabrir no modo Live). */
  onSessionEnd?: () => void;
}): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const micPermissionDeniedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const startGenerationRef = useRef(0);
  const onResultRef = useRef(options?.onResult);
  const accumulatedTranscriptRef = useRef("");
  const userRequestedStopRef = useRef(false);
  const silenceTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    onResultRef.current = options?.onResult;
  }, [options?.onResult]);

  const language = options?.language ?? "pt-BR";
  const defaultSilenceTimeoutMs = options?.silenceTimeoutMs ?? 0;
  const defaultFireOnFinalSegment = options?.fireOnFinalSegment ?? false;
  const silenceTimeoutMsRef = options?.silenceTimeoutMsRef;
  const fireOnFinalSegmentRef = options?.fireOnFinalSegmentRef;
  const keepListeningAfterFinal = options?.keepListeningAfterFinal ?? false;
  const onSessionEndRef = useRef(options?.onSessionEnd);
  useEffect(() => {
    onSessionEndRef.current = options?.onSessionEnd;
  }, [options?.onSessionEnd]);

  const isSupported = Boolean(SpeechRecognitionAPI);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimeoutIdRef.current !== null) {
      clearTimeout(silenceTimeoutIdRef.current);
      silenceTimeoutIdRef.current = null;
    }
  }, []);

  const finalizeWithTranscript = useCallback(() => {
    const text = accumulatedTranscriptRef.current.trim();
    if (text) {
      onResultRef.current?.(text, true);
    }
  }, []);

  const getErrorMessage = useCallback((errorType: string): string => {
    switch (errorType) {
      case "aborted":
        return "";
      case "not-allowed":
      case "service-not-allowed":
        return "Permissão de microfone negada. Permita o microfone nas configurações do site e tente novamente.";
      case "no-speech":
        return "Nenhuma fala detectada. Tente novamente.";
      case "network":
        return "Erro de conexão. Verifique sua internet e tente novamente.";
      case "audio-capture":
        return "Não foi possível acessar o microfone.";
      case "language-not-supported":
        return "Idioma não suportado.";
      default:
        return `Erro: ${errorType}`;
    }
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- refs lidos via .current; omitir .current das deps é intencional
  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    if (recognitionRef.current !== null) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    const generation = ++startGenerationRef.current;
    setMicPermissionDenied(false);
    micPermissionDeniedRef.current = false;
    setError(null);
    setTranscript("");
    setIsFinal(false);
    accumulatedTranscriptRef.current = "";
    userRequestedStopRef.current = false;
    clearSilenceTimer();

    const isMobile = isMobileOrAndroid();
    const doStart = () => {
      const recognition =
        new SpeechRecognitionAPI() as SpeechRecognitionInstance;
      // Chrome Android: continuous=true causa mic ligar/desligar, beeps e falhas.
      // Usar continuous=false em mobile melhora estabilidade e interpretação.
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: SpeechRecognitionEventInstance) => {
        const silenceTimeoutMs =
          silenceTimeoutMsRef?.current ?? defaultSilenceTimeoutMs;

        let fullText = "";
        let lastIsFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          fullText += result[0].transcript;
          lastIsFinal = result.isFinal;
        }
        accumulatedTranscriptRef.current = fullText;
        setTranscript(fullText);
        setIsFinal(lastIsFinal);

        // No desktop: finalizar ao receber segmento final (resposta rápida em modais).
        // No mobile/Android: não finalizar no primeiro "final" — deixar onend reportar com todo o texto
        // acumulado, evitando cortar a frase (engine pode emitir primeiro final cedo).
        if (!isMobile && lastIsFinal && fullText.trim()) {
          clearSilenceTimer();
          const phrase = fullText.trim();
          onResultRef.current?.(phrase, true);
          if (keepListeningAfterFinal) {
            accumulatedTranscriptRef.current = "";
            setTranscript("");
            setIsFinal(false);
            return;
          }
          userRequestedStopRef.current = true;
          try {
            recognitionRef.current?.stop();
          } catch {
            // ignore
          }
          recognitionRef.current = null;
          setIsListening(false);
          return;
        }

        if (silenceTimeoutMs > 0) {
          clearSilenceTimer();
          silenceTimeoutIdRef.current = setTimeout(() => {
            silenceTimeoutIdRef.current = null;
            finalizeWithTranscript();
            userRequestedStopRef.current = true;
            try {
              recognitionRef.current?.stop();
            } catch {
              // ignore
            }
            recognitionRef.current = null;
            setIsListening(false);
          }, silenceTimeoutMs);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        if (recognitionRef.current !== recognition) return;
        clearSilenceTimer();
        if (event.error !== "aborted") {
          const msg = getErrorMessage(event.error);
          if (msg) setError(msg);
          if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
          ) {
            micPermissionDeniedRef.current = true;
            setMicPermissionDenied(true);
          }
        }
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        const userStopped = userRequestedStopRef.current;
        if (userStopped) {
          recognitionRef.current = null;
          setIsListening(false);
          return;
        }
        clearSilenceTimer();
        const text = accumulatedTranscriptRef.current.trim();
        if (text) {
          onResultRef.current?.(text, true);
        }
        recognitionRef.current = null;
        setIsListening(false);
        if (!userStopped && !micPermissionDeniedRef.current) {
          onSessionEndRef.current?.();
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
      } catch (err) {
        recognitionRef.current = null;
        const msg =
          err instanceof Error && err.message?.includes("already started")
            ? "Aguarde o reconhecimento anterior finalizar."
            : "Erro ao iniciar o microfone. Tente novamente.";
        setError(msg);
      }
    };

    void (async () => {
      const permErr = await requestMicrophoneAccess();
      if (generation !== startGenerationRef.current) return;
      if (permErr) {
        setError(permErr);
        if (isMicPermissionDeniedMessage(permErr)) {
          micPermissionDeniedRef.current = true;
          setMicPermissionDenied(true);
        }
        return;
      }
      doStart();
    })();
  }, [
    language,
    defaultSilenceTimeoutMs,
    silenceTimeoutMsRef,
    clearSilenceTimer,
    finalizeWithTranscript,
    getErrorMessage,
    keepListeningAfterFinal,
  ]);

  const stopListening = useCallback(
    (skipReport = false) => {
      userRequestedStopRef.current = true;
      clearSilenceTimer();
      if (!skipReport) {
        const text = accumulatedTranscriptRef.current.trim();
        if (text) {
          onResultRef.current?.(text, true);
        }
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
    },
    [clearSilenceTimer]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [clearSilenceTimer]);

  return {
    isListening,
    transcript,
    isFinal,
    error,
    micPermissionDenied,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
  };
}
