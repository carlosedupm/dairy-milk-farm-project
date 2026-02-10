"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const BACKOFF_MS = [1000, 2000, 4000];
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_FAIL_MESSAGE =
  "Não foi possível reconectar. Verifique a internet e tente abrir o assistente de novo.";

export type CloseRequestPayload = { message: string; redirect?: string };

interface GeminiLiveOptions {
  onTextResponse?: (text: string) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  /** Chamado quando o assistente deve fechar (ex.: despedida). Se o backend enviar redirect, a tela correspondente será carregada após fechar. */
  onCloseRequest?: (payload: CloseRequestPayload) => void;
  onError?: (error: string) => void;
  onReconnecting?: (message: string) => void;
  onReconnected?: (message: string) => void;
  fazendaId?: number;
}

const OFFLINE_MESSAGE = "O assistente precisa de internet. Verifique sua conexão e tente novamente.";

function buildWsUrl(fazendaId?: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const wsBase = baseUrl.replace(/^http/, "ws");
  let wsUrl = `${wsBase}/api/v1/assistente/live`;
  if (fazendaId) wsUrl += `?fazenda_id=${fazendaId}`;
  return wsUrl;
}

export function useGeminiLive(options: GeminiLiveOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const socketRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wantToBeConnectedRef = useRef(false);
  const tryConnectRef = useRef<(isReconnect: boolean) => void>(() => {});

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const stop = useCallback(() => {
    wantToBeConnectedRef.current = false;
    setIsActive(false);
    setIsConnecting(false);
    setIsReconnecting(false);
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const tryConnect = useCallback(
    (isReconnect: boolean) => {
      if (typeof window === "undefined") return;
      const wsUrl = buildWsUrl(optionsRef.current.fazendaId);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isReconnect) setIsConnecting(false);
        setIsReconnecting(false);
        setIsActive(true);
        reconnectAttemptsRef.current = 0;
        if (isReconnect) optionsRef.current.onReconnected?.("Reconectado.");
      };

      socket.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "text") optionsRef.current.onTextResponse?.(data.content);
            else if (data.type === "error")
              optionsRef.current.onError?.(data.content ?? "Algo deu errado. Tente de novo.");
            else if (data.type === "close") {
              const payload: CloseRequestPayload = {
                message: data.content ?? "",
                redirect: data.redirect,
              };
              optionsRef.current.onCloseRequest?.(payload);
            }
          } catch {
            // ignore parse errors
          }
        } else if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          optionsRef.current.onAudioResponse?.(arrayBuffer);
        }
      };

      const handleCloseOrError = () => {
        socketRef.current = null;
        if (!wantToBeConnectedRef.current) {
          stop();
          return;
        }
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          wantToBeConnectedRef.current = false;
          stop();
          optionsRef.current.onError?.(RECONNECT_FAIL_MESSAGE);
          return;
        }
        setIsReconnecting(true);
        setIsActive(false);
        optionsRef.current.onReconnecting?.("Conexão caiu. Reconectando…");
        const delay = BACKOFF_MS[reconnectAttemptsRef.current] ?? 4000;
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          tryConnectRef.current(true);
        }, delay);
      };

      socket.onerror = () => handleCloseOrError();
      socket.onclose = () => handleCloseOrError();
    },
    [stop]
  );

  useEffect(() => {
    tryConnectRef.current = tryConnect;
  }, [tryConnect]);

  // Ao voltar à aba (ex.: mobile trocou de app), reconectar uma vez se o WebSocket estiver fechado
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!wantToBeConnectedRef.current) return;
      const sock = socketRef.current;
      if (sock?.readyState === WebSocket.OPEN) return;
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      socketRef.current = null;
      setIsReconnecting(true);
      optionsRef.current.onReconnecting?.("Conexão caiu. Reconectando…");
      tryConnectRef.current(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const start = useCallback(() => {
    if (isActive || isConnecting || isReconnecting) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      optionsRef.current.onError?.(OFFLINE_MESSAGE);
      return;
    }
    wantToBeConnectedRef.current = true;
    reconnectAttemptsRef.current = 0;
    setIsConnecting(true);
    try {
      tryConnect(false);
    } catch (err) {
      setIsConnecting(false);
      optionsRef.current.onError?.("Falha ao iniciar o assistente.");
    }
  }, [isActive, isConnecting, isReconnecting, tryConnect]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const sendText = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ text }));
    }
  }, []);

  return {
    start,
    stop,
    sendText,
    isActive,
    isConnecting,
    isReconnecting,
    isOffline,
  };
}
