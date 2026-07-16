import { describe, expect, it } from "vitest";
import { timelineItemHref } from "@/lib/animalEventoLinks";

const ANIMAL_ID = 10;

describe("timelineItemHref", () => {
  it("mapeia tipos com ref_id para paths corretos (GESTAO)", () => {
    const perfil = "GESTAO";
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "CIO", ref_id: 1 }, perfil)
    ).toBe("/gestao/cios/1/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "COBERTURA", ref_id: 2 }, perfil)
    ).toBe("/gestao/coberturas/2/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "PARTO", ref_id: 3 }, perfil)
    ).toBe("/gestao/partos/3/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "PRODUCAO", ref_id: 4 }, perfil)
    ).toBe("/producao/4/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "SAUDE", ref_id: 5 }, perfil)
    ).toBe("/animais/10/saude/editar/5");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "VACINA", ref_id: 6 }, perfil)
    ).toBe("/animais/10/vacinas/editar/6");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "HORMONIO_LACTACAO", ref_id: 7 }, perfil)
    ).toBe("/animais/10/hormonios-lactacao/7/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "TOQUE", ref_id: 8 }, perfil)
    ).toBe("/gestao/toques/8/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "GESTACAO", ref_id: 9 }, perfil)
    ).toBe("/gestao/gestacoes/9/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "SECAGEM", ref_id: 11 }, perfil)
    ).toBe("/gestao/secagens/11/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "LACTACAO", ref_id: 12 }, perfil)
    ).toBe("/gestao/lactacoes/12/editar");
  });

  it("ALERTA → /alertas; BAIXA e ref_id ausente → null", () => {
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "ALERTA", ref_id: 99 }, "GESTAO")
    ).toBe("/alertas");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "BAIXA", ref_id: ANIMAL_ID }, "GESTAO")
    ).toBeNull();
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "CIO" }, "GESTAO")
    ).toBeNull();
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "CIO", ref_id: 0 }, "GESTAO")
    ).toBeNull();
  });

  it("FUNCIONARIO: paths de leitura permitidos; USER pending sem links operacionais", () => {
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "TOQUE", ref_id: 1 }, "FUNCIONARIO")
    ).toBe("/gestao/toques/1/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "SAUDE", ref_id: 2 }, "FUNCIONARIO")
    ).toBe("/animais/10/saude/editar/2");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "PRODUCAO", ref_id: 3 }, "FUNCIONARIO")
    ).toBe("/producao/3/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "GESTACAO", ref_id: 4 }, "FUNCIONARIO")
    ).toBe("/gestao/gestacoes/4/editar");
    expect(
      timelineItemHref(ANIMAL_ID, { tipo: "CIO", ref_id: 1 }, "USER")
    ).toBeNull();
  });
});
