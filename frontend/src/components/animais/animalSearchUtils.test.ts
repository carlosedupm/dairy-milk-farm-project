import { describe, expect, it } from "vitest";
import type { Animal } from "@/services/animais";
import {
  findExactIdentificacaoMatch,
  formatAnimalSearchResultMeta,
  normalizeIdentificacao,
} from "@/components/animais/animalSearchUtils";

function animal(partial: Partial<Animal> & Pick<Animal, "id" | "identificacao">): Animal {
  return {
    fazenda_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("normalizeIdentificacao", () => {
  it("trim e case-insensitive pt-BR", () => {
    expect(normalizeIdentificacao("  Mira  ")).toBe("mira");
    expect(normalizeIdentificacao("123")).toBe("123");
  });
});

describe("findExactIdentificacaoMatch", () => {
  const lista = [
    animal({ id: 1, identificacao: "123" }),
    animal({ id: 2, identificacao: "1234" }),
    animal({ id: 3, identificacao: "Mira" }),
  ];

  it("encontra match exacto ignorando case e espaços", () => {
    expect(findExactIdentificacaoMatch(lista, "123")?.id).toBe(1);
    expect(findExactIdentificacaoMatch(lista, "  mira ")?.id).toBe(3);
  });

  it("não confunde prefixo parcial com exacto", () => {
    expect(findExactIdentificacaoMatch(lista, "12")).toBeNull();
    expect(findExactIdentificacaoMatch(lista, "12345")).toBeNull();
  });

  it("termo vazio devolve null", () => {
    expect(findExactIdentificacaoMatch(lista, "   ")).toBeNull();
  });
});

describe("formatAnimalSearchResultMeta", () => {
  it("compõe categoria · sexo · status reprodutivo", () => {
    const meta = formatAnimalSearchResultMeta(
      animal({
        id: 1,
        identificacao: "10",
        categoria: "MATRIZ",
        sexo: "F",
        status_reprodutivo: "VAZIA",
      }),
    );
    expect(meta).toContain("Vaca (Matriz)");
    expect(meta).toContain("Fêmea");
    expect(meta).toContain("Vazia");
  });

  it("omite status reprodutivo em cria jovem", () => {
    const meta = formatAnimalSearchResultMeta(
      animal({
        id: 2,
        identificacao: "B1",
        categoria: "BEZERRA",
        sexo: "F",
        status_reprodutivo: "VAZIA",
      }),
    );
    expect(meta).toContain("Bezerra");
    expect(meta).not.toMatch(/Vazia/i);
  });
});
