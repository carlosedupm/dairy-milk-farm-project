import { formatDatePtBr } from "@/lib/format";
import {
  type Animal,
  type GestacaoResumoContexto,
  type ProducaoResumo,
  SEXO_LABELS,
  type Sexo,
  STATUS_REPRODUTIVO_LABELS,
  type StatusReprodutivo,
  type TratamentoAtivoContexto,
  getCategoriaLabel,
} from "@/services/animais";
import { TIPO_CASO_SAUDE_LABELS, type TipoCasoSaude } from "@/services/animalSaude";

export function getStatusReprodutivoLabel(status?: string | null): string {
  if (!status) return "Não informado";
  return STATUS_REPRODUTIVO_LABELS[status as StatusReprodutivo] ?? status;
}

export function formatTratamentoAtivoLinha(
  tratamento: TratamentoAtivoContexto,
): string {
  const tipoLabel =
    TIPO_CASO_SAUDE_LABELS[tratamento.tipo_caso as TipoCasoSaude] ??
    tratamento.tipo_caso;
  const inicio = formatDatePtBr(tratamento.data_inicio);
  let line = `iniciado ${inicio !== "—" ? inicio : tratamento.data_inicio}`;
  if (tratamento.data_fim_prevista) {
    const fim = formatDatePtBr(tratamento.data_fim_prevista);
    if (fim !== "—") {
      line += ` · previsto fim ${fim}`;
    }
  }
  return `${tipoLabel}: ${line}`;
}

/** Bezerra/bezerro gerados no parto — status reprodutivo não se aplica no resumo rápido. */
export function isAnimalCriaJovem(animal: Animal): boolean {
  return animal.categoria === "BEZERRA" || animal.categoria === "BEZERRO";
}

/** Data de nascimento só quando cadastrada (resumo rápido omite ausência). */
export function formatAnimalNascimento(animal: Animal): string | null {
  if (!animal.data_nascimento) {
    return null;
  }
  const formatted = formatDatePtBr(animal.data_nascimento);
  return formatted === "—" ? null : formatted;
}

/** Produção histórica só quando há registros (evita ruído no resumo). */
export function formatProducaoHistoricoResumo(
  resumo: ProducaoResumo,
): string | null {
  if (resumo.total_registros === 0) {
    return null;
  }
  const fmt = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  return `${fmt(resumo.total_litros)} L total · média ${fmt(resumo.media_litros)} L · ${resumo.total_registros} reg.`;
}

/**
 * Gestação confirmada (toque positivo). Retorna null se não houver gestação ativa —
 * status reprodutivo (ex.: Servida) já cobre o restante no resumo rápido.
 */
export function formatGestacaoResumoLinha(
  gestacao: GestacaoResumoContexto | null | undefined,
): string | null {
  if (!gestacao?.confirmada) {
    return null;
  }
  const meses = gestacao.meses_gestacao;
  const mesLabel = meses === 1 ? "1 mês" : `${meses} meses`;
  const ordem = meses + 1;
  const confirmadaEm = gestacao.data_confirmacao
    ? formatDatePtBr(gestacao.data_confirmacao)
    : null;
  let line = `${ordem}º mês (${mesLabel}`;
  if (confirmadaEm && confirmadaEm !== "—") {
    line += ` · confirmada em ${confirmadaEm}`;
  }
  line += ")";
  if (gestacao.data_prevista_parto) {
    const previsto = formatDatePtBr(gestacao.data_prevista_parto);
    if (previsto !== "—") {
      line += ` · parto previsto ${previsto}`;
    }
  }
  return line;
}

/**
 * Status reprodutivo no resumo rápido (saúde coberta pelo badge).
 * Crias jovens: omitir linha se não houver status reprodutivo.
 */
export function formatAnimalContextoStatusLinha(animal: Animal): string | null {
  if (isAnimalCriaJovem(animal)) {
    return null;
  }
  if (!animal.status_reprodutivo) {
    return null;
  }
  return getStatusReprodutivoLabel(animal.status_reprodutivo);
}

/** Meta compacta: categoria · sexo · raça; crias incluem nasc. na mesma linha. */
export function formatAnimalContextoMeta(animal: Animal): string | null {
  const parts: string[] = [];
  const categoria = getCategoriaLabel(animal.categoria);
  if (categoria !== "—") {
    parts.push(categoria);
  }
  if (animal.sexo) {
    parts.push(SEXO_LABELS[animal.sexo as Sexo] ?? animal.sexo);
  }
  if (animal.raca?.trim()) {
    parts.push(animal.raca.trim());
  }
  if (isAnimalCriaJovem(animal)) {
    const nasc = formatAnimalNascimento(animal);
    if (nasc) {
      parts.push(`nasc. ${nasc}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type AnimalContextoLinhaResumo = {
  label: string;
  value: string;
  /** Destaque visual (ex.: gestação confirmada, restrição de leite). */
  destaque?: boolean;
};

/** Monta apenas linhas com informação útil para decisão rápida na busca. */
export function buildAnimalContextoLinhasResumo(input: {
  animal: Animal;
  resumo_producao: ProducaoResumo;
  gestacao_resumo?: GestacaoResumoContexto | null;
  tratamentos_ativos?: TratamentoAtivoContexto[] | null;
  fora_do_rebanho?: boolean;
}): AnimalContextoLinhaResumo[] {
  const linhas: AnimalContextoLinhaResumo[] = [];

  if (!input.fora_do_rebanho && input.tratamentos_ativos?.length) {
    for (const tratamento of input.tratamentos_ativos) {
      linhas.push({
        label: "Saúde",
        value: formatTratamentoAtivoLinha(tratamento),
        destaque: true,
      });
    }
  }

  const gestacao = formatGestacaoResumoLinha(input.gestacao_resumo);
  if (gestacao) {
    linhas.push({ label: "Gestação", value: gestacao, destaque: true });
  }

  const nascimento = formatAnimalNascimento(input.animal);
  if (nascimento && !isAnimalCriaJovem(input.animal)) {
    linhas.push({ label: "Nascimento", value: nascimento });
  }

  const producao = formatProducaoHistoricoResumo(input.resumo_producao);
  if (producao) {
    linhas.push({ label: "Produção", value: producao });
  }

  return linhas;
}
