"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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

/** Pré-aquece o pipeline de áudio no Android via getUserMedia antes do SpeechRecognition (workaround para falhas de detecção). */
async function prewarmMicrophoneOnMobile(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // ignora; reconhecimento será tentado mesmo assim
  }
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
}): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
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
        return "Permissão de microfone negada.";
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

        // Sempre finalizar ao receber segmento final com texto (evita depender só do timeout/onend em modais)
        if (lastIsFinal && fullText.trim()) {
          clearSilenceTimer();
          userRequestedStopRef.current = true;
          onResultRef.current?.(fullText.trim(), true);
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
        }
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        if (userRequestedStopRef.current) {
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

    if (
      isMobile &&
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia
    ) {
      prewarmMicrophoneOnMobile()
        .then(doStart)
        .catch(() => doStart());
    } else {
      doStart();
    }
  }, [
    language,
    defaultSilenceTimeoutMs,
    silenceTimeoutMsRef,
    clearSilenceTimer,
    finalizeWithTranscript,
    getErrorMessage,
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
    startListening,
    stopListening,
    toggleListening,
    isSupported,
  };
}
