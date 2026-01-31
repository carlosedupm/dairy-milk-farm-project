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
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
}

export function useVoiceRecognition(options?: {
  onResult?: (text: string, isFinal: boolean) => void;
  language?: string;
}): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(options?.onResult);
  useEffect(() => {
    onResultRef.current = options?.onResult;
  }, [options?.onResult]);
  const language = options?.language ?? "pt-BR";

  const isSupported = Boolean(SpeechRecognitionAPI);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    setError(null);
    setTranscript("");
    setIsFinal(false);
    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event: SpeechRecognitionEventInstance) => {
      let fullText = "";
      let lastIsFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        fullText += result[0].transcript;
        lastIsFinal = result.isFinal;
      }
      setTranscript(fullText);
      setIsFinal(lastIsFinal);
      if (lastIsFinal && fullText.trim()) {
        onResultRef.current?.(fullText.trim(), true);
      }
    };
    recognition.onerror = (event: { error: string }) => {
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
      setIsListening(false);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

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
