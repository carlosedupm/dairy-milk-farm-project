import { describe, expect, it } from "vitest";
import {
  animalIdsComProducaoNoTurno,
  isSameTurno,
  sessionStorageKey,
  turnoFromApiDateTime,
  turnoFromDateTime,
} from "@/lib/ordenha-turno";

describe("ordenha-turno", () => {
  it("infere MANHA antes das 12h e TARDE a partir das 12h", () => {
    expect(turnoFromDateTime(new Date(2026, 6, 21, 0, 0))).toBe("MANHA");
    expect(turnoFromDateTime(new Date(2026, 6, 21, 11, 59))).toBe("MANHA");
    expect(turnoFromDateTime(new Date(2026, 6, 21, 12, 0))).toBe("TARDE");
    expect(turnoFromDateTime(new Date(2026, 6, 21, 23, 59))).toBe("TARDE");
  });

  it("classifica ISO da API no fuso local", () => {
    const manha = new Date(2026, 6, 21, 7, 30);
    const tarde = new Date(2026, 6, 21, 15, 0);
    expect(turnoFromApiDateTime(manha.toISOString())).toBe("MANHA");
    expect(turnoFromApiDateTime(tarde.toISOString())).toBe("TARDE");
    expect(turnoFromApiDateTime("")).toBeNull();
    expect(turnoFromApiDateTime("nao-e-data")).toBeNull();
  });

  it("isSameTurno compara janela da sessão", () => {
    const manhaIso = new Date(2026, 6, 21, 8, 0).toISOString();
    expect(isSameTurno(manhaIso, "MANHA")).toBe(true);
    expect(isSameTurno(manhaIso, "TARDE")).toBe(false);
  });

  it("animalIdsComProducaoNoTurno agrega por animal", () => {
    const manha = new Date(2026, 6, 21, 6, 0).toISOString();
    const tarde = new Date(2026, 6, 21, 14, 0).toISOString();
    const ids = animalIdsComProducaoNoTurno(
      [
        { animal_id: 1, data_hora: manha },
        { animal_id: 1, data_hora: manha },
        { animal_id: 2, data_hora: tarde },
      ],
      "MANHA",
    );
    expect([...ids].sort()).toEqual([1]);
  });

  it("sessionStorageKey inclui fazenda dia e turno", () => {
    expect(sessionStorageKey(3, "2026-07-21", "TARDE")).toBe(
      "ceialmilk:ordenha:v1:3:2026-07-21:TARDE",
    );
  });
});
