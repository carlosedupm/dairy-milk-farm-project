"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Web Speech API - SpeechRecognition is not in TypeScript DOM lib
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? ((
        window as Window & {
          SpeechRecognition?: new () => SpeechRecognitionInstance;
          webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        }
      ).SpeechRecognition ??
      (
        window as Window & {
          webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        }
      ).webkitSpeechRecognition)
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
  const silenceTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    setError(null);
    setTranscript("");
    setIsFinal(false);
    accumulatedTranscriptRef.current = "";
    userRequestedStopRef.current = false;
    clearSilenceTimer();

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEventInstance) => {
      const silenceTimeoutMs =
        silenceTimeoutMsRef?.current ?? defaultSilenceTimeoutMs;
      const fireOnFinalSegment =
        fireOnFinalSegmentRef?.current ?? defaultFireOnFinalSegment;

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

      if (fireOnFinalSegment && lastIsFinal && fullText.trim()) {
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
      clearSilenceTimer();
      if (event.error === "not-allowed") {
        setError("Permissão de microfone negada.");
      } else if (event.error === "no-speech") {
        setError("Nenhuma fala detectada.");
      } else {
        setError(`Erro: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (userRequestedStopRef.current) {
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

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [
    language,
    defaultSilenceTimeoutMs,
    defaultFireOnFinalSegment,
    silenceTimeoutMsRef,
    fireOnFinalSegmentRef,
    clearSilenceTimer,
    finalizeWithTranscript,
  ]);

  const stopListening = useCallback((skipReport = false) => {
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
  }, [clearSilenceTimer]);

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
