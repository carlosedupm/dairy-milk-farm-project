import { describe, expect, it } from "vitest";
import { validateCoberturaForm } from "@/lib/form-validation";
import type { CoberturaFormState } from "@/components/gestao/CoberturaFormFields";

const baseState: CoberturaFormState = {
  animalId: "1",
  cioId: "2",
  tipo: "IA",
  data: "2026-08-20T10:00",
  touroAnimalId: "",
  touroInfo: "",
  semenPartida: "",
  tecnico: "",
  protocoloId: "",
  observacoes: "",
};

describe("validateCoberturaForm", () => {
  it("exige cio vinculado", () => {
    const result = validateCoberturaForm({ ...baseState, cioId: "" });
    expect(result.valid).toBe(false);
    expect(result.fields.cioId).toBeTruthy();
  });

  it("campos de IA opcionais nao bloqueiam", () => {
    const result = validateCoberturaForm({
      ...baseState,
      tipo: "IATF",
      semenPartida: "",
      tecnico: "",
      protocoloId: "",
    });
    expect(result.valid).toBe(true);
  });

  it("monta natural sem reprodutor bloqueia", () => {
    const result = validateCoberturaForm({
      ...baseState,
      tipo: "MONTA_NATURAL",
      touroAnimalId: "",
      touroInfo: "",
    });
    expect(result.valid).toBe(false);
    expect(result.fields.touro).toBeTruthy();
  });
});
