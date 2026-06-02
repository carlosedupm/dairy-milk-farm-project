import type { OrigemAquisicao } from "@/services/animais";
import type { CoberturaFormState } from "@/components/gestao/CoberturaFormFields";
import type { CioFormState } from "@/components/gestao/CioFormFields";
import type { PartoFormState } from "@/components/gestao/PartoFormFields";
import type { AnimalSaudeFormState } from "@/components/animais/AnimalSaudeFormFields";
import {
  GESTAO_DATE_MESSAGES,
  isIsoDateAfterMax,
  isIsoDateBeforeMin,
} from "@/lib/gestao-date-limits";
import { todayISODate } from "@/lib/date-limits";

export type FieldErrors = Partial<Record<string, string>>;

export type FormValidationResult = {
  valid: boolean;
  fields: FieldErrors;
  summary?: string;
};

export function mergeFormErrors(...parts: FieldErrors[]): FieldErrors {
  return Object.assign({}, ...parts);
}

function invalid(
  fields: FieldErrors,
  summary = "Corrija os campos assinalados."
): FormValidationResult {
  return { valid: false, fields, summary };
}

function valid(): FormValidationResult {
  return { valid: true, fields: {} };
}

export type AnimalFormInput = {
  identificacao: string;
  fazendaId: number;
  fazendaUnicaId?: number;
  origemAquisicao: OrigemAquisicao;
  dataNascimento: string;
};

export function validateAnimalForm(input: AnimalFormInput): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.identificacao.trim()) {
    fields.identificacao = "Identificação é obrigatória.";
  }
  const effectiveFazenda = input.fazendaUnicaId ?? input.fazendaId;
  if (!effectiveFazenda || effectiveFazenda <= 0) {
    fields.fazendaId = "Selecione uma fazenda.";
  }
  if (input.origemAquisicao === "NASCIDO" && !input.dataNascimento.trim()) {
    fields.dataNascimento =
      "Data de nascimento é obrigatória para animais nascidos na propriedade.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export type ProducaoFormInput = {
  animalId: number;
  quantidade: string;
};

export function validateProducaoForm(input: ProducaoFormInput): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.animalId || input.animalId <= 0) {
    fields.animalId = "Selecione um animal em lactação.";
  }
  const qtd = parseFloat(input.quantidade);
  if (isNaN(qtd) || qtd <= 0) {
    fields.quantidade = "Quantidade deve ser maior que zero.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateCoberturaForm(
  formState: CoberturaFormState,
  options?: { minDate?: string; maxDate?: string }
): FormValidationResult {
  const fields: FieldErrors = {};
  const maxDate = options?.maxDate ?? todayISODate();
  if (!formState.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!formState.data.trim()) {
    fields.data = "Informe a data e hora da cobertura.";
  } else {
    if (isIsoDateBeforeMin(formState.data, options?.minDate)) {
      fields.data = GESTAO_DATE_MESSAGES.coberturaAfterCio;
    } else if (isIsoDateAfterMax(formState.data, maxDate)) {
      fields.data = GESTAO_DATE_MESSAGES.datetimeFuture;
    }
  }
  if (formState.tipo === "MONTA_NATURAL") {
    const hasReprodutor =
      !!formState.touroAnimalId || !!formState.touroInfo.trim();
    if (!hasReprodutor) {
      fields.touro =
        "Para monta natural, selecione um reprodutor ou informe dados do touro.";
    }
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateCioForm(
  formState: CioFormState,
  options?: { maxDate?: string }
): FormValidationResult {
  const fields: FieldErrors = {};
  const maxDate = options?.maxDate ?? todayISODate();
  if (!formState.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!formState.dataDetectado.trim()) {
    fields.dataDetectado = "Informe a data e hora do cio.";
  } else if (isIsoDateAfterMax(formState.dataDetectado, maxDate)) {
    fields.dataDetectado = GESTAO_DATE_MESSAGES.datetimeFuture;
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validatePartoForm(
  formState: PartoFormState,
  options?: { skipCrias?: boolean; minDate?: string; maxDate?: string }
): FormValidationResult {
  const fields: FieldErrors = {};
  const maxDate = options?.maxDate ?? todayISODate();
  if (!formState.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!formState.data.trim()) {
    fields.data = "Informe a data e hora do parto.";
  } else {
    if (isIsoDateBeforeMin(formState.data, options?.minDate)) {
      fields.data = GESTAO_DATE_MESSAGES.partoAfterGestacao;
    } else if (isIsoDateAfterMax(formState.data, maxDate)) {
      fields.data = GESTAO_DATE_MESSAGES.datetimeFuture;
    }
  }
  if (options?.skipCrias) {
    if (Object.keys(fields).length > 0) return invalid(fields);
    return valid();
  }
  const n = Math.max(1, parseInt(formState.numeroCrias, 10) || 1);
  if (formState.crias.length !== n) {
    fields.numeroCrias =
      "Ajuste o número de animais na cria para coincidir com os dados informados.";
  }
  for (let i = 0; i < n; i++) {
    const row = formState.crias[i];
    if (!row) continue;
    if (row.condicao === "VIVO" && row.peso.trim()) {
      const p = Number(row.peso.trim().replace(",", "."));
      if (!Number.isFinite(p) || p < 0) {
        fields[`cria_${i}_peso`] = `Peso inválido na cria ${i + 1}. Use número em kg (ex.: 38 ou 38,5).`;
      }
    }
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export type ToqueFormInput = {
  animalId: string;
  data: string;
  classificacao: string;
  coberturaId: string;
};

export function validateToqueForm(
  input: ToqueFormInput,
  options?: { minDate?: string; maxDate?: string }
): FormValidationResult {
  const fields: FieldErrors = {};
  const maxDate = options?.maxDate ?? todayISODate();
  if (!input.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!input.data.trim()) {
    fields.data = "Informe a data e hora do toque.";
  } else {
    if (isIsoDateBeforeMin(input.data, options?.minDate)) {
      fields.data = GESTAO_DATE_MESSAGES.toqueAfterCobertura;
    } else if (isIsoDateAfterMax(input.data, maxDate)) {
      fields.data = GESTAO_DATE_MESSAGES.datetimeFuture;
    }
  }
  if (!input.classificacao.trim()) {
    fields.classificacao = "Selecione a classificação operacional.";
  }
  if (input.classificacao === "PRENHA" && !input.coberturaId) {
    fields.coberturaId = "Selecione a cobertura associada ao diagnóstico prenha.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateLactacaoForm(
  input: {
    animalId: string;
    dataInicio: string;
  },
  options?: { maxDate?: string }
): FormValidationResult {
  const fields: FieldErrors = {};
  const maxDate = options?.maxDate ?? todayISODate();
  if (!input.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!input.dataInicio.trim()) {
    fields.dataInicio = "Informe a data de início.";
  } else if (isIsoDateAfterMax(input.dataInicio, maxDate)) {
    fields.dataInicio = GESTAO_DATE_MESSAGES.dateFuture;
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateSecagemForm(
  input: {
    animalId: string;
    data: string;
  },
  options?: { minDate?: string; maxDate?: string }
): FormValidationResult {
  const fields: FieldErrors = {};
  const maxDate = options?.maxDate ?? todayISODate();
  if (!input.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!input.data.trim()) {
    fields.data = "Informe a data da secagem.";
  } else {
    if (isIsoDateBeforeMin(input.data, options?.minDate)) {
      fields.data = GESTAO_DATE_MESSAGES.secagemAfterLactacao;
    } else if (isIsoDateAfterMax(input.data, maxDate)) {
      fields.data = GESTAO_DATE_MESSAGES.dateFuture;
    }
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateRegistrarBaixa(input: {
  animalId: string;
  dataSaida: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!input.dataSaida.trim()) {
    fields.dataSaida = "Informe a data da baixa.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateAnimalSaudeForm(
  formState: AnimalSaudeFormState
): FormValidationResult {
  const fields: FieldErrors = {};
  if (!formState.tipoCaso.trim()) {
    fields.tipoCaso = "Selecione o tipo de caso.";
  }
  if (!formState.dataInicio.trim()) {
    fields.dataInicio = "Informe a data de início.";
  }
  if (!formState.status.trim()) {
    fields.status = "Selecione o status.";
  }
  if (
    formState.dataFim.trim() &&
    formState.dataFim < formState.dataInicio
  ) {
    fields.dataFim = "A data de fim não pode ser anterior à data de início.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateUsuarioForm(input: {
  nome: string;
  email: string;
  senha: string;
  isCreate: boolean;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.nome.trim()) {
    fields.nome = "Nome é obrigatório.";
  }
  if (!input.email.trim()) {
    fields.email = "Email é obrigatório.";
  }
  if (input.isCreate && !input.senha.trim()) {
    fields.senha = "Senha é obrigatória ao criar usuário.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateFazendaForm(input: { nome: string }): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.nome.trim()) {
    fields.nome = "Nome é obrigatório.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateLoginForm(input: {
  email: string;
  password: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.email.trim()) {
    fields.email = "Email é obrigatório.";
  }
  if (!input.password.trim()) {
    fields.password = "Senha é obrigatória.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateRegistroForm(input: {
  nome: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.nome.trim()) {
    fields.nome = "Nome é obrigatório.";
  }
  if (!input.email.trim()) {
    fields.email = "Email é obrigatório.";
  }
  if (!input.password.trim()) {
    fields.senha = "Senha é obrigatória.";
  } else if (input.password.length < 6) {
    fields.senha = "A senha deve ter pelo menos 6 caracteres.";
  }
  if (input.password !== input.confirmPassword) {
    fields.confirmPassword = "As senhas não coincidem.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateAreaForm(input: {
  nome: string;
  hectares: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.nome.trim()) {
    fields.nome = "Nome é obrigatório.";
  }
  const ha = parseFloat(input.hectares);
  if (!input.hectares.trim() || isNaN(ha) || ha <= 0) {
    fields.hectares = "Informe hectares maior que zero.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateFornecedorForm(input: { nome: string }): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.nome.trim()) {
    fields.nome = "Nome é obrigatório.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateAnaliseSoloForm(input: {
  dataColeta: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.dataColeta.trim()) {
    fields.dataColeta = "Informe a data da coleta.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateCustoAgriculturaForm(input: {
  valor: string;
  data: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  const valor = parseFloat(input.valor);
  if (!input.valor.trim() || isNaN(valor) || valor < 0) {
    fields.valor = "Informe um valor válido (≥ 0).";
  }
  if (!input.data.trim()) {
    fields.data = "Informe a data do custo.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateProducaoAgriculturaForm(input: {
  quantidadeKg: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  const qtd = parseFloat(input.quantidadeKg);
  if (!input.quantidadeKg.trim() || isNaN(qtd) || qtd <= 0) {
    fields.quantidadeKg = "Quantidade deve ser maior que zero.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateReceitaAgriculturaForm(input: {
  valor: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  const valor = parseFloat(input.valor);
  if (!input.valor.trim() || isNaN(valor) || valor < 0) {
    fields.valor = "Informe um valor válido (≥ 0).";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateCriarAlertaForm(input: {
  titulo: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!input.titulo.trim()) {
    fields.titulo = "Título é obrigatório.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}
