/**
 * Utilitário para síntese de voz (TTS) via Web Speech API.
 * Usado para anunciar o resultado do assistente quando a entrada foi por voz.
 */

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

export function speak(
  text: string,
  options?: {
    lang?: string;
    cancelPrevious?: boolean;
    /** Chamado quando a fala terminar (para habilitar microfone em seguida). */
    onEnd?: () => void;
  },
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const trimmed = text?.trim();
  if (!trimmed) return;

  if (options?.cancelPrevious !== false) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = options?.lang ?? "pt-BR";

  if (options?.onEnd) {
    utterance.onend = () => {
      options.onEnd?.();
    };
    utterance.onerror = () => {
      options.onEnd?.();
    };
  }

  window.speechSynthesis.speak(utterance);
}
