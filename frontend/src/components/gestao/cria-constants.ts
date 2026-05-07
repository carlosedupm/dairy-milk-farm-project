/** Alinhado a `models.Cria` / `models.animal` no backend. */
export const CRIA_SEXO_OPTIONS = [
  { value: "M", label: "Macho" },
  { value: "F", label: "Fêmea" },
] as const;

export const CRIA_CONDICAO_OPTIONS = [
  { value: "VIVO", label: "Vivo" },
  { value: "NATIMORTO", label: "Natimorto" },
] as const;

export type CriaSexo = (typeof CRIA_SEXO_OPTIONS)[number]["value"];
export type CriaCondicao = (typeof CRIA_CONDICAO_OPTIONS)[number]["value"];

/** Uma linha do formulário de parto (antes do POST em `/api/v1/crias`). */
export type CriaLinhaFormState = {
  sexo: CriaSexo;
  condicao: CriaCondicao;
  peso: string;
  /** Brinco / identificação opcional; se vazio o backend gera FILHO-… (macho) ou FILHA-… (fêmea)-identMae-AAAAMMDD-parto-n. */
  identificacao: string;
  /** Opcional; enviada como `animal_raca` na API. */
  raca: string;
};

export function defaultCriaLinha(): CriaLinhaFormState {
  return { sexo: "F", condicao: "VIVO", peso: "", identificacao: "", raca: "" };
}
