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
  "confirmo", // "confirmo", "confirmo a operação"
  "confirmo a operação",
  "confirmo a ação",
  "quero confirmar",
  "pode confirmar",
  "ok",
  "quero",
  "pode ser",
  "pode executar",
  "pode",
  "executar",
  "fazer",
  "faz",
  "faça", // "faça", "pode fazer"
  "confirmado",
  "claro",
  "isso",
  "isso mesmo",
  "é isso", // "é isso", "é isso mesmo"
  "prosseguir",
  "avançar",
  "continuar",
  "de acordo",
  "está certo",
  "esta certo",
  "pode prosseguir",
];

const CANCEL_WORDS = [
  "não",
  "nao", // sem acento
  "não confirmo",
  "nao confirmo",
  "cancelar",
  "não quero",
  "nao quero",
  "dispensar",
  "dispenso",
  "fechar",
  "cancelado",
  "desistir",
  "esquece",
  "deixa pra lá",
  "deixa pra la",
  "parar",
  "não fazer",
  "nao fazer",
];

const CORRECT_WORDS = [
  "corrigir",
  "reformular",
  "errado",
  "não é isso",
  "nao e isso",
  "não era isso",
  "nao era isso",
  "mudar",
  "alterar",
  "está errado",
  "esta errado",
  "entendeu errado",
  "não é esse",
  "nao e esse",
  "não é essa",
  "nao e essa",
  "quero corrigir",
  "quero reformular",
  "quero mudar",
];

export type VoiceConfirmResult = "confirm" | "cancel" | "correct" | "unknown";

export function interpretVoiceConfirm(spokenText: string): VoiceConfirmResult {
  const raw = spokenText.trim();
  if (!raw) return "unknown";
  const t = normalizeForMatch(raw);
  // Verificar "corrigir" antes de cancelar/confirmar (ex.: "quero corrigir" não deve bater em "quero")
  if (CORRECT_WORDS.some((w) => t.includes(normalizeForMatch(w)))) return "correct";
  // Verificar cancelar antes de confirmar (ex.: "não quero" não deve bater em "quero")
  if (CANCEL_WORDS.some((w) => t.includes(normalizeForMatch(w)))) return "cancel";
  if (CONFIRM_WORDS.some((w) => t.includes(normalizeForMatch(w)))) return "confirm";
  return "unknown";
}
