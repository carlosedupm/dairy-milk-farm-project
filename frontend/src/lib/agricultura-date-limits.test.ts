import { describe, expect, it } from "vitest";

import {
  ANOS_MAX_ANTIGUIDADE_PLANTIO,
  maxIsoDateBound,
  minIsoDateBound,
  plantioMinDateAntiguidade,
  resolveColheitaDateLimits,
  resolvePlantioDateLimits,
  resolveSafraCulturaDateRange,
  safraAnoBounds,
} from "@/lib/agricultura-date-limits";
import { todayISODate } from "@/lib/date-limits";
import type { SafraCultura } from "@/services/agricultura";

describe("agricultura-date-limits", () => {
  it("safraAnoBounds retorna início e fim do ano civil", () => {
    expect(safraAnoBounds(2024)).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
    });
  });

  it("minIsoDateBound escolhe a data mais recente", () => {
    expect(minIsoDateBound("2020-01-01", "2024-06-01")).toBe("2024-06-01");
  });

  it("maxIsoDateBound escolhe a data mais antiga", () => {
    expect(maxIsoDateBound("2024-12-31", "2024-03-15", "2025-01-01")).toBe(
      "2024-03-15"
    );
  });

  it("resolveSafraCulturaDateRange usa plantio/colheita quando existem", () => {
    const sc = {
      id: 1,
      area_id: 1,
      ano: 2024,
      cultura: "MILHO",
      status: "PLANTADA",
      data_plantio: "2024-03-01",
      data_colheita: "2024-09-30",
      created_at: "",
      updated_at: "",
    } satisfies SafraCultura;

    expect(resolveSafraCulturaDateRange(sc)).toEqual({
      minDate: "2024-03-01",
      maxDate: "2024-09-30",
    });
  });

  it("resolveSafraCulturaDateRange faz fallback ao ano civil", () => {
    const sc = {
      id: 1,
      area_id: 1,
      ano: 2023,
      cultura: "SOJA",
      status: "PLANEJADA",
      created_at: "",
      updated_at: "",
    } satisfies SafraCultura;

    const range = resolveSafraCulturaDateRange(sc);
    expect(range.minDate).toBe("2023-01-01");
    expect(range.maxDate).toBe("2023-12-31");
  });

  it("resolvePlantioDateLimits intersecta antiguidade e ano", () => {
    const limits = resolvePlantioDateLimits(2024);
    const antiguidade = plantioMinDateAntiguidade();
    expect(limits.minDate).toBe(
      minIsoDateBound(antiguidade, "2024-01-01")
    );
    expect(limits.maxDate).toBe(
      maxIsoDateBound(todayISODate(), "2024-12-31")
    );
    expect(limits.minYear).toBe(2024 - ANOS_MAX_ANTIGUIDADE_PLANTIO);
    expect(limits.maxYear).toBe(2025);
  });

  it("resolveColheitaDateLimits usa plantio como mínimo", () => {
    const limits = resolveColheitaDateLimits(2024, "2024-04-10");
    expect(limits.minDate).toBe("2024-04-10");
    expect(limits.maxDate).toBe(
      maxIsoDateBound(todayISODate(), "2024-12-31")
    );
  });
});
