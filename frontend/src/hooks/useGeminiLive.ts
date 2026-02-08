"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface GeminiLiveOptions {
  onTextResponse?: (text: string) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  onCloseRequest?: (message: string) => void;
  onError?: (error: string) => void;
  fazendaId?: number;
}

export function useGeminiLive(options: GeminiLiveOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Usar ref para as opções para evitar disparar o useCallback[start] desnecessariamente
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stop = useCallback(() => {
    setIsActive(false);
    setIsConnecting(false);

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (isActive || isConnecting) return;

    setIsConnecting(true);
    try {
      // 1. Configurar WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      // Em desenvolvimento, o backend pode estar em porta diferente ou acessível via proxy.
      // Usamos a URL base da API se disponível, ou o host atual.
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const wsBase = baseUrl.replace(/^http/, 'ws');
      let wsUrl = `${wsBase}/api/v1/assistente/live`;
      
      const currentOptions = optionsRef.current;
      if (currentOptions.fazendaId) {
        wsUrl += `?fazenda_id=${currentOptions.fazendaId}`;
      }
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket conectado com sucesso");
        setIsConnecting(false);
        setIsActive(true);
        // Entrada por voz é feita via useVoiceRecognition (transcrição no cliente → sendText).
        // Não usamos áudio bruto aqui: ScriptProcessorNode é deprecated e falha em Safari/iOS;
        // o backend atualmente processa apenas mensagens de texto no Live.
      };

      socket.onmessage = async (event) => {
        console.log("Mensagem bruta recebida do WebSocket:", event.data);
        if (typeof event.data === "string") {
          console.log("Processando mensagem de texto:", event.data);
          try {
            const data = JSON.parse(event.data);
            console.log("JSON parseado com sucesso:", data);
            if (data.type === "text") {
              console.log("Chamando onTextResponse com:", data.content);
              optionsRef.current.onTextResponse?.(data.content);
            } else if (data.type === "close") {
              console.log("Pedido de fechamento recebido:", data.content);
              optionsRef.current.onCloseRequest?.(data.content);
            }
          } catch (e) {
            console.error("Erro ao fazer parse do JSON:", e, "String recebida:", event.data);
          }
        } else if (event.data instanceof Blob) {
          console.log("Processando áudio (Blob) de tamanho:", event.data.size);
          const arrayBuffer = await event.data.arrayBuffer();
          optionsRef.current.onAudioResponse?.(arrayBuffer);
        } else {
          console.log("Tipo de mensagem WebSocket não reconhecido:", typeof event.data);
        }
      };

      socket.onerror = (err) => {
        console.error("Erro no WebSocket:", err);
        optionsRef.current.onError?.("Erro na conexão com o assistente.");
        stop();
      };

      socket.onclose = () => {
        stop();
      };

    } catch (err) {
      console.error("Erro ao iniciar Gemini Live:", err);
      setIsConnecting(false);
      optionsRef.current.onError?.("Falha ao iniciar o assistente.");
    }
  }, [isActive, isConnecting, stop]);

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
  };
}
