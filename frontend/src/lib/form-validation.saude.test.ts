import { describe, expect, it } from "vitest";
import { validateAnimalSaudeForm } from "@/lib/form-validation";
import { SAUDE_CONFORMIDADE } from "@/lib/saude-date-limits";
import { todayISODate } from "@/lib/date-limits";
import { addDaysToISODate } from "@/lib/gestao-date-limits";

const baseState = {
  tipoCaso: "TRATAMENTO",
  dataInicio: todayISODate(),
  dataFim: "",
  status: "ATIVO",
  observacoes: "",
};

describe("validateAnimalSaudeForm", () => {
  it("bloqueia data_inicio futura com TMP-001", () => {
    const tomorrow = addDaysToISODate(todayISODate(), 1);
    const result = validateAnimalSaudeForm(
      { ...baseState, dataInicio: tomorrow },
      { maxDate: todayISODate() }
    );
    expect(result.valid).toBe(false);
    expect(result.conformidadeCode).toBe(SAUDE_CONFORMIDADE.naoFuturo);
    expect(result.fields.dataInicio).toContain("BR-CICLO-012");
  });

  it("aceita data_fim futura quando inicio e valido", () => {
    const fimFutura = addDaysToISODate(todayISODate(), 7);
    const result = validateAnimalSaudeForm(
      { ...baseState, dataFim: fimFutura },
      { maxDate: todayISODate() }
    );
    expect(result.valid).toBe(true);
  });

  it("bloqueia data_inicio antes da minDate do animal com TMP-002", () => {
    const minDate = addDaysToISODate(todayISODate(), -10);
    const antes = addDaysToISODate(minDate, -2);
    const result = validateAnimalSaudeForm(
      { ...baseState, dataInicio: antes },
      { minDate, maxDate: todayISODate() }
    );
    expect(result.valid).toBe(false);
    expect(result.conformidadeCode).toBe(SAUDE_CONFORMIDADE.aposEntrada);
    expect(result.fields.dataInicio).toContain("BR-CICLO-013");
  });

  it("passa com datas validas e data_fim futura acima da minDate", () => {
    const minDate = addDaysToISODate(todayISODate(), -10);
    const inicio = addDaysToISODate(todayISODate(), -3);
    const fimFutura = addDaysToISODate(todayISODate(), 7);
    const result = validateAnimalSaudeForm(
      { ...baseState, dataInicio: inicio, dataFim: fimFutura },
      { minDate, maxDate: todayISODate() }
    );
    expect(result.valid).toBe(true);
  });
});
