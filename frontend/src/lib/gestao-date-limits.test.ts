import { describe, expect, it } from "vitest";

import type { Cobertura } from "@/services/coberturas";
import type { Cio } from "@/services/cios";
import type { Gestacao } from "@/services/gestacoes";
import {
  DIAS_MINIMOS_TOQUE,
  addDaysToISODate,
  isIsoDateAfterMax,
  isIsoDateBeforeMin,
  minDateCoberturaFromCios,
  minDatePartoFromGestacao,
  minDateToqueFromCobertura,
  resolveGestacaoAtivaForPartoAnimal,
  resolveGestacaoForPartoMinDate,
} from "@/lib/gestao-date-limits";

describe("gestao-date-limits", () => {
  it("minDateCoberturaFromCios usa o cio mais recente", () => {
    const cios: Cio[] = [
      {
        id: 1,
        animal_id: 10,
        data_detectado: "2024-01-01T08:00",
        fazenda_id: 1,
        created_at: "",
      },
      {
        id: 2,
        animal_id: 10,
        data_detectado: "2024-06-15T10:30",
        fazenda_id: 1,
        created_at: "",
      },
    ];
    expect(minDateCoberturaFromCios(cios)).toBe("2024-06-15");
  });

  it("minDateToqueFromCobertura soma DIAS_MINIMOS_TOQUE", () => {
    const cobertura = {
      id: 1,
      animal_id: 10,
      data: "2024-03-01T12:00",
      tipo: "IA",
      fazenda_id: 1,
      created_at: "",
      updated_at: "",
    } as Cobertura;
    expect(DIAS_MINIMOS_TOQUE).toBe(15);
    expect(minDateToqueFromCobertura(cobertura)).toBe(
      addDaysToISODate("2024-03-01", 15)
    );
  });

  it("minDatePartoFromGestacao usa data_confirmacao", () => {
    const gestacao = {
      id: 5,
      animal_id: 10,
      cobertura_id: 1,
      data_confirmacao: "2024-07-01T09:00",
      status: "CONFIRMADA",
      fazenda_id: 1,
      created_at: "",
      updated_at: "",
    } as Gestacao;
    expect(minDatePartoFromGestacao(gestacao)).toBe("2024-07-01");
  });

  it("resolveGestacaoAtivaForPartoAnimal retorna CONFIRMADA mais recente", () => {
    const gestacoes: Gestacao[] = [
      {
        id: 1,
        animal_id: 10,
        cobertura_id: 1,
        data_confirmacao: "2024-01-10",
        status: "CONFIRMADA",
        fazenda_id: 1,
        created_at: "",
        updated_at: "",
      },
      {
        id: 2,
        animal_id: 10,
        cobertura_id: 2,
        data_confirmacao: "2024-05-20",
        status: "CONFIRMADA",
        fazenda_id: 1,
        created_at: "",
        updated_at: "",
      },
      {
        id: 3,
        animal_id: 99,
        cobertura_id: 3,
        data_confirmacao: "2024-06-01",
        status: "CONFIRMADA",
        fazenda_id: 1,
        created_at: "",
        updated_at: "",
      },
    ];
    expect(resolveGestacaoAtivaForPartoAnimal(gestacoes, "10")?.id).toBe(2);
    expect(resolveGestacaoAtivaForPartoAnimal(gestacoes, "")).toBeUndefined();
  });

  it("resolveGestacaoForPartoMinDate prioriza gestacaoId", () => {
    const gestacoes: Gestacao[] = [
      {
        id: 1,
        animal_id: 10,
        cobertura_id: 1,
        data_confirmacao: "2024-01-10",
        status: "CONFIRMADA",
        fazenda_id: 1,
        created_at: "",
        updated_at: "",
      },
      {
        id: 2,
        animal_id: 10,
        cobertura_id: 2,
        data_confirmacao: "2024-05-20",
        status: "CONFIRMADA",
        fazenda_id: 1,
        created_at: "",
        updated_at: "",
      },
    ];
    expect(resolveGestacaoForPartoMinDate(gestacoes, "1", "10")?.id).toBe(1);
    expect(resolveGestacaoForPartoMinDate(gestacoes, "", "10")?.id).toBe(2);
  });

  it("isIsoDateBeforeMin e isIsoDateAfterMax comparam só o dia", () => {
    expect(isIsoDateBeforeMin("2024-03-01T23:59", "2024-03-02")).toBe(true);
    expect(isIsoDateBeforeMin("2024-03-02T00:00", "2024-03-02")).toBe(false);
    expect(isIsoDateAfterMax("2024-03-03", "2024-03-02")).toBe(true);
    expect(isIsoDateAfterMax("2024-03-02T12:00", "2024-03-02")).toBe(false);
  });
});
