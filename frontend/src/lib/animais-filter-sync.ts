import type { FilterFieldDef } from "@/hooks/useFilterSync";
import {
  parseOptionalInt,
  parseOptionalString,
} from "@/lib/filter-url";
import {
  emptyAnimaisFilterForm,
  type AnimaisFilterFormState,
  type RebanhoFiltro,
} from "@/components/animais/AnimaisListToolbar";

const REBANHO_VALUES: RebanhoFiltro[] = ["ativos", "baixa", "todos"];

function parseRebanho(raw: string | null): RebanhoFiltro {
  const trimmed = raw?.trim() ?? "";
  if ((REBANHO_VALUES as readonly string[]).includes(trimmed)) {
    return trimmed as RebanhoFiltro;
  }
  return "ativos";
}

export const animaisFilterFields: FilterFieldDef<AnimaisFilterFormState>[] = [
  {
    key: "identificacao",
    param: "identificacao",
    parse: (raw) => parseOptionalString(raw) ?? "",
    serialize: (value) => (value.trim() ? value.trim() : null),
    isDefault: (value) => value.trim() === "",
  },
  {
    key: "categoria",
    param: "categoria",
    parse: (raw) => parseOptionalString(raw) ?? "",
    serialize: (value) => (value.trim() ? value.trim() : null),
    isDefault: (value) => value.trim() === "",
  },
  {
    key: "sexo",
    param: "sexo",
    parse: (raw) => parseOptionalString(raw) ?? "",
    serialize: (value) => (value.trim() ? value.trim() : null),
    isDefault: (value) => value.trim() === "",
  },
  {
    key: "status_saude",
    param: "status_saude",
    parse: (raw) => parseOptionalString(raw) ?? "",
    serialize: (value) => (value.trim() ? value.trim() : null),
    isDefault: (value) => value.trim() === "",
  },
  {
    key: "status_reprodutivo",
    param: "status_reprodutivo",
    parse: (raw) => parseOptionalString(raw) ?? "",
    serialize: (value) => (value.trim() ? value.trim() : null),
    isDefault: (value) => value.trim() === "",
  },
  {
    key: "lote_id",
    param: "lote_id",
    parse: (raw) => {
      const id = parseOptionalInt(raw);
      return id != null ? String(id) : "";
    },
    serialize: (value) => (value.trim() ? value.trim() : null),
    isDefault: (value) => value.trim() === "",
  },
  {
    key: "rebanho",
    param: "rebanho",
    parse: (raw) => parseRebanho(raw),
    serialize: (value) => (value !== "ativos" ? value : null),
    isDefault: (value) => value === "ativos",
  },
];

export { emptyAnimaisFilterForm, type AnimaisFilterFormState };

export function hasActiveAnimaisToolbarFilters(
  filters: AnimaisFilterFormState,
): boolean {
  return (
    Boolean(filters.identificacao.trim()) ||
    Boolean(filters.categoria) ||
    Boolean(filters.sexo) ||
    Boolean(filters.status_saude) ||
    Boolean(filters.status_reprodutivo) ||
    Boolean(filters.lote_id) ||
    filters.rebanho !== "ativos"
  );
}
