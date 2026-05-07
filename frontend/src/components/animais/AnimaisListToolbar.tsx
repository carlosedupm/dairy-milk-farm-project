"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIAS,
  CATEGORIA_LABELS,
  SEXOS,
  SEXO_LABELS,
  STATUS_REPRODUTIVO_LABELS,
  STATUS_REPRODUTIVO_OPTIONS,
  STATUS_SAUDE_LABELS,
  STATUS_SAUDE_OPTIONS,
} from "@/services/animais";

const ALL = "__all__";

export type AnimaisFilterFormState = {
  identificacao: string;
  categoria: string;
  sexo: string;
  status_saude: string;
  status_reprodutivo: string;
  lote_id: string;
};

type Props = {
  values: AnimaisFilterFormState;
  onChange: (next: AnimaisFilterFormState) => void;
  onClear?: () => void;
};

export function AnimaisListToolbar({
  values,
  onChange,
  onClear,
}: Props) {
  const set = (partial: Partial<AnimaisFilterFormState>) =>
    onChange({ ...values, ...partial });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="animais-filter-ident">Identificação</Label>
          <Input
            id="animais-filter-ident"
            className="min-h-[44px]"
            value={values.identificacao}
            onChange={(e) => set({ identificacao: e.target.value })}
            placeholder="Buscar por identificação…"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={values.categoria || ALL}
            onValueChange={(v) => set({ categoria: v === ALL ? "" : v })}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIA_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <Select
            value={values.sexo || ALL}
            onValueChange={(v) => set({ sexo: v === ALL ? "" : v })}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {SEXOS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEXO_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Saúde</Label>
          <Select
            value={values.status_saude || ALL}
            onValueChange={(v) =>
              set({ status_saude: v === ALL ? "" : v })
            }
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {STATUS_SAUDE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_SAUDE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status reprodutivo</Label>
          <Select
            value={values.status_reprodutivo || ALL}
            onValueChange={(v) =>
              set({ status_reprodutivo: v === ALL ? "" : v })
            }
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {STATUS_REPRODUTIVO_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_REPRODUTIVO_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="animais-filter-lote">Lote (id)</Label>
          <Input
            id="animais-filter-lote"
            className="min-h-[44px]"
            inputMode="numeric"
            value={values.lote_id}
            onChange={(e) =>
              set({ lote_id: e.target.value.replace(/\D/g, "") })
            }
            placeholder="Opcional"
          />
        </div>
      </div>
      {onClear && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClear}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}

export function emptyAnimaisFilterForm(): AnimaisFilterFormState {
  return {
    identificacao: "",
    categoria: "",
    sexo: "",
    status_saude: "",
    status_reprodutivo: "",
    lote_id: "",
  };
}
