import type { OrigemAquisicao } from "@/services/animais";
import type { CoberturaFormState } from "@/components/gestao/CoberturaFormFields";
import type { CioFormState } from "@/components/gestao/CioFormFields";
import type { PartoFormState } from "@/components/gestao/PartoFormFields";
import type { AnimalSaudeFormState } from "@/components/animais/AnimalSaudeFormFields";
import {
  AGRICULTURA_DATE_MESSAGES,
  resolveColheitaDateLimits,
  resolvePlantioDateLimits,
  type SafraCulturaDateRange,
} from "@/lib/agricultura-date-limits";
import {
  GESTAO_CONFORMIDADE,
  GESTAO_DATE_MESSAGES,
  gestaoMessageCoberturaAfterCio,
  gestaoMessagePartoAfterGestacao,
  gestaoMessageSecagemAfterLactacao,
  isIsoDateAfterMax,
  isIsoDateBeforeMin,
  resolveToqueChronologyError,
  toqueChronologyForAnimalCoberturas,
  type GestaoChronologyContext,
} from "@/lib/gestao-date-limits";
import type { Cobertura } from "@/services/coberturas";
import { todayISODate } from "@/lib/date-limits";
import {
  SAUDE_CONFORMIDADE,
  SAUDE_DATE_MESSAGES,
  saudeMessageBeforeAnimalRef,
} from "@/lib/saude-date-limits";
import { parseLitrosValue } from "@/lib/litros-format";

export type FieldErrors = Partial<Record<string, string>>;

export type FormValidationResult = {
  valid: boolean;
  fields: FieldErrors;
  summary?: string;
  conformidadeCode?: string;
};

export function mergeFormErrors(...parts: FieldErrors[]): FieldErrors {
  return Object.assign({}, ...parts);
}

function invalid(
  fields: FieldErrors,
  summary = "Corrija os campos assinalados.",
  conformidadeCode?: string
): FormValidationResult {
  return { valid: false, fields, summary, conformidadeCode };
}

function valid(): FormValidationResult {
  return { valid: true, fields: {} };
}

export type GestaoChronologyOptions = GestaoChronologyContext & {
  maxDate?: string;
};

type GestaoChronologyValidation = {
  message: string;
  conformidadeCode?: string;
};

function gestaoChronologyError(
  value: string,
  minDate: string | undefined,
  referenceDateIso: string | undefined,
  buildMessage: (ref: string) => string,
  conformidadeCode: string
): GestaoChronologyValidation | undefined {
  if (!minDate || !value.trim()) return undefined;
  if (!isIsoDateBeforeMin(value, minDate)) return undefined;
  const ref = referenceDateIso ?? minDate;
  return { message: buildMessage(ref), conformidadeCode };
}

function gestaoFutureDateError(
  value: string,
  maxDate: string,
  message: string
): string | undefined {
  if (isIsoDateAfterMax(value, maxDate)) return message;
  return undefined;
}

function resolveGestaoDateFieldValidation(
  value: string,
  options: GestaoChronologyOptions | undefined,
  buildMessage: (ref: string) => string,
  conformidadeCode: string,
  futureMessage: string
): GestaoChronologyValidation | undefined {
  if (!value.trim()) return undefined;
  const maxDate = options?.maxDate ?? todayISODate();
  const future = gestaoFutureDateError(value, maxDate, futureMessage);
  if (future) return { message: future };
  return gestaoChronologyError(
    value,
    options?.minDate,
    options?.referenceDateIso,
    buildMessage,
    conformidadeCode
  );
}

function resolveToqueDateFieldValidation(
  value: string,
  options: GestaoChronologyOptions | undefined,
  requiresCobertura: boolean
): GestaoChronologyValidation | undefined {
  if (!value.trim()) return undefined;
  const maxDate = options?.maxDate ?? todayISODate();
  const future = gestaoFutureDateError(
    value,
    maxDate,
    GESTAO_DATE_MESSAGES.datetimeFuture
  );
  if (future) return { message: future };
  if (!requiresCobertura) return undefined;
  const chronology = resolveToqueChronologyError(value, {
    minDate: options?.minDate,
    coberturaDateIso: options?.coberturaDateIso,
  });
  if (chronology) {
    const isBeforeCobertura =
      options?.coberturaDateIso &&
      isIsoDateBeforeMin(value, options.coberturaDateIso);
    return {
      message: chronology,
      conformidadeCode: isBeforeCobertura
        ? GESTAO_CONFORMIDADE.toqueAfterCobertura
        : undefined,
    };
  }
  return undefined;
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
  const qtd = parseLitrosValue(input.quantidade);
  if (isNaN(qtd) || qtd <= 0) {
    fields.quantidade = "Quantidade deve ser maior que zero.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateCoberturaForm(
  formState: CoberturaFormState,
  options?: GestaoChronologyOptions
): FormValidationResult {
  const fields: FieldErrors = {};
  let conformidadeCode: string | undefined;
  if (!formState.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!formState.data.trim()) {
    fields.data = "Informe a data e hora da cobertura.";
  } else {
    const dateError = resolveGestaoDateFieldValidation(
      formState.data,
      options,
      gestaoMessageCoberturaAfterCio,
      GESTAO_CONFORMIDADE.coberturaAfterCio,
      GESTAO_DATE_MESSAGES.datetimeFuture
    );
    if (dateError) {
      fields.data = dateError.message;
      conformidadeCode = dateError.conformidadeCode;
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
  if (Object.keys(fields).length > 0) return invalid(fields, undefined, conformidadeCode);
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
  options?: { skipCrias?: boolean } & GestaoChronologyOptions
): FormValidationResult {
  const fields: FieldErrors = {};
  let conformidadeCode: string | undefined;
  if (!formState.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!formState.data.trim()) {
    fields.data = "Informe a data e hora do parto.";
  } else {
    const dateError = resolveGestaoDateFieldValidation(
      formState.data,
      options,
      gestaoMessagePartoAfterGestacao,
      GESTAO_CONFORMIDADE.partoAfterGestacao,
      GESTAO_DATE_MESSAGES.datetimeFuture
    );
    if (dateError) {
      fields.data = dateError.message;
      conformidadeCode = dateError.conformidadeCode;
    }
  }
  if (options?.skipCrias) {
    if (Object.keys(fields).length > 0) {
      return invalid(fields, undefined, conformidadeCode);
    }
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
  if (Object.keys(fields).length > 0) return invalid(fields, undefined, conformidadeCode);
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
  options?: GestaoChronologyOptions
): FormValidationResult {
  const fields: FieldErrors = {};
  let conformidadeCode: string | undefined;
  const requiresCobertura = input.classificacao === "PRENHA";
  if (!input.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!input.data.trim()) {
    fields.data = "Informe a data e hora do toque.";
  } else {
    const dateError = resolveToqueDateFieldValidation(
      input.data,
      options,
      requiresCobertura && !!input.coberturaId
    );
    if (dateError) {
      fields.data = dateError.message;
      conformidadeCode = dateError.conformidadeCode;
    }
  }
  if (!input.classificacao.trim()) {
    fields.classificacao = "Selecione a classificação operacional.";
  }
  if (input.classificacao === "PRENHA" && !input.coberturaId) {
    fields.coberturaId = "Selecione a cobertura associada ao diagnóstico prenha.";
  }
  if (Object.keys(fields).length > 0) return invalid(fields, undefined, conformidadeCode);
  return valid();
}

export type ToqueLoteLinhaInput = {
  identificacao: string;
  classificacao: string;
};

export function validateToqueLoteForm(
  input: {
    data: string;
    linhas: ToqueLoteLinhaInput[];
  },
  options: {
    maxDate?: string;
    coberturas: Cobertura[];
    resolveAnimalId: (identificacao: string) => number | undefined;
  }
): FormValidationResult {
  const fields: FieldErrors = {};
  let conformidadeCode: string | undefined;
  const maxDate = options.maxDate ?? todayISODate();

  if (!input.data.trim()) {
    fields.data = "Informe a data e hora da palpação.";
  } else if (isIsoDateAfterMax(input.data, maxDate)) {
    fields.data = GESTAO_DATE_MESSAGES.datetimeFuture;
  }

  const linhasPreenchidas = input.linhas.filter((l) => l.identificacao.trim());
  if (linhasPreenchidas.length === 0) {
    fields.linhas = "Informe pelo menos uma identificação de animal.";
  }

  if (input.data.trim() && linhasPreenchidas.length > 0) {
    for (let i = 0; i < input.linhas.length; i++) {
      const linha = input.linhas[i];
      if (!linha?.identificacao.trim()) continue;
      if (linha.classificacao !== "PRENHA") continue;

      const animalId = options.resolveAnimalId(linha.identificacao.trim());
      if (!animalId) continue;

      const chronology = toqueChronologyForAnimalCoberturas(
        options.coberturas,
        animalId
      );
      if (!chronology.coberturaDateIso && !chronology.minDate) continue;

      const dateError = resolveToqueDateFieldValidation(
        input.data,
        { ...chronology, maxDate },
        true
      );
      if (dateError) {
        fields.linhas = `${linha.identificacao.trim()}: ${dateError.message}`;
        conformidadeCode = dateError.conformidadeCode;
        break;
      }
    }
  }

  if (Object.keys(fields).length > 0) return invalid(fields, undefined, conformidadeCode);
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
  options?: GestaoChronologyOptions
): FormValidationResult {
  const fields: FieldErrors = {};
  let conformidadeCode: string | undefined;
  if (!input.animalId) {
    fields.animalId = "Selecione um animal.";
  }
  if (!input.data.trim()) {
    fields.data = "Informe a data da secagem.";
  } else {
    const dateError = resolveGestaoDateFieldValidation(
      input.data,
      options,
      gestaoMessageSecagemAfterLactacao,
      GESTAO_CONFORMIDADE.secagemAfterLactacao,
      GESTAO_DATE_MESSAGES.dateFuture
    );
    if (dateError) {
      fields.data = dateError.message;
      conformidadeCode = dateError.conformidadeCode;
    }
  }
  if (Object.keys(fields).length > 0) return invalid(fields, undefined, conformidadeCode);
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

export type SaudeFormValidationOptions = {
  minDate?: string;
  maxDate?: string;
};

export function validateAnimalSaudeForm(
  formState: AnimalSaudeFormState,
  options?: SaudeFormValidationOptions
): FormValidationResult {
  const fields: FieldErrors = {};
  let conformidadeCode: string | undefined;
  if (!formState.tipoCaso.trim()) {
    fields.tipoCaso = "Selecione o tipo de caso.";
  }
  if (!formState.dataInicio.trim()) {
    fields.dataInicio = "Informe a data de início.";
  }
  if (!formState.status.trim()) {
    fields.status = "Selecione o status.";
  }
  if (formState.dataInicio.trim()) {
    const maxDate = options?.maxDate ?? todayISODate();
    if (isIsoDateAfterMax(formState.dataInicio, maxDate)) {
      fields.dataInicio = SAUDE_DATE_MESSAGES.inicioFuture;
      conformidadeCode = SAUDE_CONFORMIDADE.naoFuturo;
    } else if (
      options?.minDate &&
      isIsoDateBeforeMin(formState.dataInicio, options.minDate)
    ) {
      fields.dataInicio = saudeMessageBeforeAnimalRef(options.minDate);
      conformidadeCode = SAUDE_CONFORMIDADE.aposEntrada;
    }
  }
  if (formState.dataFim.trim()) {
    if (formState.dataFim < formState.dataInicio) {
      fields.dataFim = "A data de fim não pode ser anterior à data de início.";
    } else if (
      options?.minDate &&
      isIsoDateBeforeMin(formState.dataFim, options.minDate)
    ) {
      fields.dataFim = saudeMessageBeforeAnimalRef(options.minDate);
      conformidadeCode = SAUDE_CONFORMIDADE.aposEntrada;
    }
  }
  if (Object.keys(fields).length > 0) {
    return invalid(fields, undefined, conformidadeCode);
  }
  return valid();
}

export function validateAnimalVacinaForm(formState: {
  modo: "APLICADA" | "PREVISTA";
  tipoVacina: string;
  dataPrevista: string;
  dataAplicacao: string;
  validadeDias: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  if (!formState.tipoVacina.trim()) {
    fields.tipoVacina = "Selecione a vacina.";
  }
  if (formState.modo === "APLICADA" && !formState.dataAplicacao.trim()) {
    fields.dataAplicacao = "Informe a data de aplicação.";
  }
  if (formState.modo === "PREVISTA" && !formState.dataPrevista.trim()) {
    fields.dataPrevista = "Informe a data prevista.";
  }
  if (formState.validadeDias.trim() && Number(formState.validadeDias) <= 0) {
    fields.validadeDias = "Validade deve ser maior que zero.";
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
  } else if (input.senha.trim() && input.senha.length < 8) {
    fields.senha = "A senha deve ter pelo menos 8 caracteres.";
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
  } else if (input.password.length < 8) {
    fields.senha = "A senha deve ter pelo menos 8 caracteres.";
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

function validateAgriculturaIsoDate(
  fields: FieldErrors,
  fieldKey: string,
  value: string,
  options: {
    required?: boolean;
    requiredMessage?: string;
    minDate?: string;
    maxDate?: string;
    beforeMinMessage?: string;
    afterMaxMessage?: string;
  }
): void {
  const trimmed = value.trim();
  if (!trimmed) {
    if (options.required) {
      fields[fieldKey] =
        options.requiredMessage ?? "Informe a data.";
    }
    return;
  }
  const maxDate = options.maxDate ?? todayISODate();
  if (isIsoDateAfterMax(trimmed, maxDate)) {
    fields[fieldKey] =
      options.afterMaxMessage ?? AGRICULTURA_DATE_MESSAGES.dateFuture;
  } else if (isIsoDateBeforeMin(trimmed, options.minDate)) {
    fields[fieldKey] =
      options.beforeMinMessage ?? AGRICULTURA_DATE_MESSAGES.dateOutsideSafra;
  }
}

export function validateSafraCulturaForm(input: {
  ano: number;
  dataPlantio: string;
  dataColheita: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  const plantioLimits = resolvePlantioDateLimits(
    input.ano,
    input.dataColheita || undefined
  );
  const colheitaLimits = resolveColheitaDateLimits(
    input.ano,
    input.dataPlantio || undefined
  );

  if (input.dataPlantio.trim()) {
    validateAgriculturaIsoDate(fields, "dataPlantio", input.dataPlantio, {
      minDate: plantioLimits.minDate,
      maxDate: plantioLimits.maxDate,
      beforeMinMessage: AGRICULTURA_DATE_MESSAGES.plantioTooOld,
      afterMaxMessage: AGRICULTURA_DATE_MESSAGES.dateFuture,
    });
  }

  if (input.dataColheita.trim()) {
    validateAgriculturaIsoDate(fields, "dataColheita", input.dataColheita, {
      minDate: colheitaLimits.minDate,
      maxDate: colheitaLimits.maxDate,
      afterMaxMessage: AGRICULTURA_DATE_MESSAGES.dateFuture,
    });
    if (
      input.dataPlantio.trim() &&
      input.dataColheita.slice(0, 10) < input.dataPlantio.slice(0, 10)
    ) {
      fields.dataColheita = AGRICULTURA_DATE_MESSAGES.colheitaBeforePlantio;
    }
  }

  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateAnaliseSoloForm(input: {
  dataColeta: string;
  dataResultado?: string;
}): FormValidationResult {
  const fields: FieldErrors = {};
  const today = todayISODate();

  validateAgriculturaIsoDate(fields, "dataColeta", input.dataColeta, {
    required: true,
    requiredMessage: "Informe a data da coleta.",
    maxDate: today,
    afterMaxMessage: AGRICULTURA_DATE_MESSAGES.dateFuture,
  });

  const resultado = input.dataResultado?.trim() ?? "";
  if (resultado) {
    const minDate = input.dataColeta.trim().slice(0, 10) || undefined;
    validateAgriculturaIsoDate(fields, "dataResultado", resultado, {
      minDate,
      maxDate: today,
      beforeMinMessage:
        "A data do resultado deve ser igual ou posterior à data da coleta.",
      afterMaxMessage: AGRICULTURA_DATE_MESSAGES.dateFuture,
    });
  }

  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateCustoAgriculturaForm(
  input: {
    valor: string;
    data: string;
  },
  options?: { safraRange?: SafraCulturaDateRange }
): FormValidationResult {
  const fields: FieldErrors = {};
  const valor = parseFloat(input.valor);
  if (!input.valor.trim() || isNaN(valor) || valor < 0) {
    fields.valor = "Informe um valor válido (≥ 0).";
  }
  validateAgriculturaIsoDate(fields, "data", input.data, {
    required: true,
    requiredMessage: "Informe a data do custo.",
    minDate: options?.safraRange?.minDate,
    maxDate: options?.safraRange?.maxDate,
  });
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateProducaoAgriculturaForm(
  input: {
    quantidadeKg: string;
    data: string;
  },
  options?: { safraRange?: SafraCulturaDateRange }
): FormValidationResult {
  const fields: FieldErrors = {};
  const qtd = parseFloat(input.quantidadeKg);
  if (!input.quantidadeKg.trim() || isNaN(qtd) || qtd <= 0) {
    fields.quantidadeKg = "Quantidade deve ser maior que zero.";
  }
  validateAgriculturaIsoDate(fields, "data", input.data, {
    required: true,
    requiredMessage: "Informe a data da produção.",
    minDate: options?.safraRange?.minDate,
    maxDate: options?.safraRange?.maxDate,
  });
  if (Object.keys(fields).length > 0) return invalid(fields);
  return valid();
}

export function validateReceitaAgriculturaForm(
  input: {
    valor: string;
    data: string;
  },
  options?: { safraRange?: SafraCulturaDateRange }
): FormValidationResult {
  const fields: FieldErrors = {};
  const valor = parseFloat(input.valor);
  if (!input.valor.trim() || isNaN(valor) || valor < 0) {
    fields.valor = "Informe um valor válido (≥ 0).";
  }
  validateAgriculturaIsoDate(fields, "data", input.data, {
    required: true,
    requiredMessage: "Informe a data da receita.",
    minDate: options?.safraRange?.minDate,
    maxDate: options?.safraRange?.maxDate,
  });
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
