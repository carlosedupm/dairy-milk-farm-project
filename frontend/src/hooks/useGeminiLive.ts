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
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

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

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
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

      socket.onopen = async () => {
        console.log("WebSocket conectado com sucesso");
        setIsConnecting(false);
        setIsActive(true);

        // 2. Iniciar captura de áudio após conexão aberta
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          const audioContext = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = audioContext;

          const source = audioContext.createMediaStreamSource(stream);
          // Usando ScriptProcessorNode por simplicidade, embora AudioWorklet seja preferível para baixa latência real
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(audioContext.destination);

          processor.onaudioprocess = (e) => {
            if (socket.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              // Converter para Int16 (PCM)
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              // Enviar áudio como binário
              socket.send(pcmData.buffer);
              
              // Fallback para teste: se o áudio não estiver sendo processado pelo Gemini Live no backend,
              // podemos enviar o texto via socket.send(JSON.stringify({text: "..."}))
            }
          };
        } catch (err) {
          console.error("Erro ao acessar microfone:", err);
          options.onError?.("Não foi possível acessar o microfone.");
          stop();
        }
      };

      socket.onmessage = async (event) => {
        console.log("Mensagem bruta recebida do WebSocket:", event.data);
        if (typeof event.data === "string") {
          console.log("Processando mensagem de texto:", event.data);
          try {
            const data = JSON.parse(event.data);
            console.log("JSON parseado com sucesso:", data);
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
