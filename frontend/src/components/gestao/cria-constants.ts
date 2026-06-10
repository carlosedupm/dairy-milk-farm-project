/** Alinhado a `models.Cria` / `models.animal` no backend. */
export const CRIA_SEXO_OPTIONS = [
  { value: "M", label: "Macho" },
  { value: "F", label: "Fêmea" },
] as const;

export const CRIA_CONDICAO_OPTIONS = [
  { value: "VIVO", label: "Vivo" },
  { value: "NATIMORTO", label: "Natimorto" },
] as const;

export const CRIA_STATUS_SAUDE_INICIAL_OPTIONS = [
  { value: "DOENTE", label: "Doente" },
  { value: "EM_TRATAMENTO", label: "Em tratamento" },
] as const;

export type CriaSexo = (typeof CRIA_SEXO_OPTIONS)[number]["value"];
export type CriaCondicao = (typeof CRIA_CONDICAO_OPTIONS)[number]["value"];
export type CriaStatusSaudeInicial =
  (typeof CRIA_STATUS_SAUDE_INICIAL_OPTIONS)[number]["value"];

/** Uma linha do formulário de parto (antes do POST em `/api/v1/crias`). */
export type CriaLinhaFormState = {
  sexo: CriaSexo;
  condicao: CriaCondicao;
  peso: string;
  /** Brinco / identificação opcional; se vazio o backend gera FILHO-… (macho) ou FILHA-… (fêmea)-identMae-AAAAMMDD-parto-n. */
  identificacao: string;
  /** Opcional; enviada como `animal_raca` na API. */
  raca: string;
  /** Cria viva nasceu não saudável (BR-PARTOS-008). */
  naoSaudavel: boolean;
  /** Quando `naoSaudavel`; default DOENTE. */
  statusSaudeInicial: CriaStatusSaudeInicial;
};

export function defaultCriaLinha(): CriaLinhaFormState {
  return {
    sexo: "F",
    condicao: "VIVO",
    peso: "",
    identificacao: "",
    raca: "",
    naoSaudavel: false,
    statusSaudeInicial: "DOENTE",
  };
}

/** Campos de saúde inicial para POST parto/cria (transitórios no backend). */
export function criaSaudeInicialPayload(row: CriaLinhaFormState): {
  nao_saudavel?: boolean;
  status_saude_inicial?: CriaStatusSaudeInicial;
} {
  if (row.condicao !== "VIVO" || !row.naoSaudavel) {
    return {};
  }
  return {
    nao_saudavel: true,
    status_saude_inicial: row.statusSaudeInicial,
  };
}
