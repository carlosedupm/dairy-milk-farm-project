import { describe, expect, it } from "vitest";
import type { Animal, ProducaoResumo } from "@/services/animais";
import {
  buildAnimalContextoLinhasResumo,
  formatLactacaoAtivaResumoLinha,
  formatRestricaoLeiteResumoLinha,
} from "@/components/animais/animalResumoUtils";

function animal(
  partial: Partial<Animal> & Pick<Animal, "id" | "identificacao">,
): Animal {
  return {
    fazenda_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    categoria: "MATRIZ",
    ...partial,
  };
}

const producaoVazia: ProducaoResumo = {
  total_litros: 0,
  media_litros: 0,
  total_registros: 0,
};

describe("formatRestricaoLeiteResumoLinha", () => {
  it("retorna null sem restrição", () => {
    expect(formatRestricaoLeiteResumoLinha(null)).toBeNull();
    expect(formatRestricaoLeiteResumoLinha(undefined)).toBeNull();
  });

  it("traduz motivo conhecido", () => {
    expect(
      formatRestricaoLeiteResumoLinha({
        id: 1,
        fazenda_id: 1,
        animal_id: 1,
        motivo: "TRATAMENTO_ANTIBIOTICO",
        inicio_em: "2026-08-01T00:00:00Z",
        status: "AGUARDANDO_LAB",
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
      }),
    ).toBe("Tratamento / antibiótico");
  });
});

describe("formatLactacaoAtivaResumoLinha", () => {
  it("retorna null sem lactação", () => {
    expect(formatLactacaoAtivaResumoLinha(null)).toBeNull();
  });

  it("formata número e data de início", () => {
    expect(
      formatLactacaoAtivaResumoLinha({
        id: 10,
        animal_id: 1,
        fazenda_id: 1,
        numero_lactacao: 3,
        data_inicio: "2026-03-15",
      }),
    ).toMatch(/^Lactação #3 desde /);
  });
});

describe("buildAnimalContextoLinhasResumo", () => {
  const baseAnimal = animal({
    id: 1,
    identificacao: "DEV-001",
    data_nascimento: "2020-01-10",
  });

  it("inclui restrição, tratamentos, gestação, lactação e produção na ordem", () => {
    const linhas = buildAnimalContextoLinhasResumo({
      animal: baseAnimal,
      resumo_producao: {
        total_litros: 100,
        media_litros: 20,
        total_registros: 5,
      },
      gestacao_resumo: {
        confirmada: true,
        dias_gestacao: 60,
        meses_gestacao: 2,
        data_confirmacao: "2026-06-01",
        data_prevista_parto: "2026-12-01",
      },
      tratamentos_ativos: [
        {
          tipo_caso: "TRATAMENTO",
          data_inicio: "2026-08-01",
          data_fim_prevista: "2026-08-20",
        },
      ],
      restricao_leite_ativa: {
        id: 1,
        fazenda_id: 1,
        animal_id: 1,
        motivo: "POS_PARTO_AMOSTRA",
        inicio_em: "2026-08-01T00:00:00Z",
        status: "AGUARDANDO_LAB",
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
      },
      lactacao_ativa: {
        id: 2,
        animal_id: 1,
        fazenda_id: 1,
        numero_lactacao: 2,
        data_inicio: "2026-01-01",
      },
    });

    expect(linhas.map((l) => l.key)).toEqual([
      "restricao-leite",
      expect.stringMatching(/^tratamento-/),
      "gestacao",
      "lactacao",
      "nascimento",
      "producao",
    ]);
    expect(linhas[0]?.destaque).toBe(true);
    expect(linhas[0]?.label).toBe("Leite aguardando laboratório");
    expect(linhas.find((l) => l.key === "lactacao")?.label).toBe("Lactação");
  });

  it("omite restrição, tratamentos e lactação quando fora do rebanho", () => {
    const linhas = buildAnimalContextoLinhasResumo({
      animal: baseAnimal,
      resumo_producao: producaoVazia,
      fora_do_rebanho: true,
      tratamentos_ativos: [
        { tipo_caso: "TRATAMENTO", data_inicio: "2026-08-01" },
      ],
      restricao_leite_ativa: {
        id: 1,
        fazenda_id: 1,
        animal_id: 1,
        motivo: "OUTRO",
        inicio_em: "2026-08-01T00:00:00Z",
        status: "AGUARDANDO_LAB",
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
      },
      lactacao_ativa: {
        id: 2,
        animal_id: 1,
        fazenda_id: 1,
        numero_lactacao: 1,
        data_inicio: "2026-01-01",
      },
    });

    expect(linhas.some((l) => l.key === "restricao-leite")).toBe(false);
    expect(linhas.some((l) => l.key.startsWith("tratamento-"))).toBe(false);
    expect(linhas.some((l) => l.key === "lactacao")).toBe(false);
    expect(linhas.some((l) => l.key === "nascimento")).toBe(true);
  });

  it("omite linhas vazias (sem produção, sem gestação)", () => {
    const linhas = buildAnimalContextoLinhasResumo({
      animal: animal({
        id: 2,
        identificacao: "B1",
        categoria: "BEZERRA",
        data_nascimento: "2026-07-01",
      }),
      resumo_producao: producaoVazia,
    });
    expect(linhas).toEqual([]);
  });
});
