/**
 * Interpreta se a fala do usuário é confirmação ou cancelamento (para dialog de confirmação por voz).
 * Normaliza texto (acentos, variantes) para melhor reconhecimento.
 */

/** Remove acentos para comparar "não" com "nao", "sim" com "sím", etc. */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[áàãâä]/g, "a")
    .replace(/[éêë]/g, "e")
    .replace(/[íï]/g, "i")
    .replace(/[óòõôö]/g, "o")
    .replace(/[úü]/g, "u")
    .replace(/ç/g, "c")
    .trim();
}

const CONFIRM_WORDS = [
  "sim",
  "sin", // reconhecimento às vezes escreve assim
  "confirmar",
  "confirmar ação",
  "ok",
  "quero",
  "pode ser",
  "pode executar",
  "pode",
  "executar",
  "fazer",
  "faz",
  "confirmado",
  "claro",
  "isso",
  "isso mesmo",
];

const CANCEL_WORDS = [
  "não",
  "nao", // sem acento
  "cancelar",
  "não quero",
  "nao quero",
  "dispensar",
  "fechar",
  "cancelado",
];

export type VoiceConfirmResult = "confirm" | "cancel" | "unknown";

export function interpretVoiceConfirm(spokenText: string): VoiceConfirmResult {
  const raw = spokenText.trim();
  if (!raw) return "unknown";
  const t = normalizeForMatch(raw);
  // Verificar cancelar primeiro (ex.: "não quero" não deve bater em "quero")
  if (CANCEL_WORDS.some((w) => t.includes(normalizeForMatch(w)))) return "cancel";
  if (CONFIRM_WORDS.some((w) => t.includes(normalizeForMatch(w)))) return "confirm";
  return "unknown";
}
