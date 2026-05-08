"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Filter, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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

function loteAtivo(loteId: string): boolean {
  const n = loteId ? Number.parseInt(loteId, 10) : 0;
  return !Number.isNaN(n) && n > 0;
}

export function countAdvancedFiltersActive(
  v: AnimaisFilterFormState
): number {
  let n = 0;
  if (v.categoria) n++;
  if (v.sexo) n++;
  if (v.status_saude) n++;
  if (v.status_reprodutivo) n++;
  if (loteAtivo(v.lote_id)) n++;
  return n;
}

function emptyAdvanced(): Pick<
  AnimaisFilterFormState,
  "categoria" | "sexo" | "status_saude" | "status_reprodutivo" | "lote_id"
> {
  return {
    categoria: "",
    sexo: "",
    status_saude: "",
    status_reprodutivo: "",
    lote_id: "",
  };
}

function AnimaisAdvancedFiltersForm({
  values,
  onChange,
}: {
  values: AnimaisFilterFormState;
  onChange: (next: AnimaisFilterFormState) => void;
}) {
  const set = (partial: Partial<AnimaisFilterFormState>) =>
    onChange({ ...values, ...partial });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Categoria
        </Label>
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
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Sexo
        </Label>
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
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Saúde
        </Label>
        <Select
          value={values.status_saude || ALL}
          onValueChange={(v) => set({ status_saude: v === ALL ? "" : v })}
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
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Status reprodutivo
        </Label>
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
      <div className="space-y-1.5 sm:col-span-2">
        <Label
          htmlFor="animais-filter-lote"
          className="text-xs font-medium text-muted-foreground"
        >
          Lote (id)
        </Label>
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
  );
}

export function AnimaisListToolbar({
  values,
  onChange,
  onClear,
}: Props) {
  const isMd = useMediaQuery("(min-width: 768px)");
  const [panelOpen, setPanelOpen] = useState(false);

  const advancedCount = countAdvancedFiltersActive(values);
  const hasIdent = values.identificacao.trim().length > 0;
  const hasAnyFilter = hasIdent || advancedCount > 0;

  const set = (partial: Partial<AnimaisFilterFormState>) =>
    onChange({ ...values, ...partial });

  const clearAdvanced = () => {
    onChange({ ...values, ...emptyAdvanced() });
  };

  const filterTriggerButton = (
    <Button
      type="button"
      variant="outline"
      className="min-h-[44px] shrink-0 gap-2"
      aria-expanded={panelOpen}
      aria-controls="animais-filtros-avancados"
      id="animais-filtros-trigger"
    >
      <Filter className="h-4 w-4 shrink-0" aria-hidden />
      <span>Mais filtros</span>
      {advancedCount > 0 ? (
        <Badge variant="secondary" className="tabular-nums">
          {advancedCount}
        </Badge>
      ) : null}
    </Button>
  );

  const advancedForm = (
    <AnimaisAdvancedFiltersForm values={values} onChange={onChange} />
  );

  const footerActions = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] w-full sm:w-auto"
        onClick={() => {
          clearAdvanced();
        }}
      >
        Limpar filtros avançados
      </Button>
      <Button
        type="button"
        className="min-h-[44px] w-full sm:w-auto"
        onClick={() => setPanelOpen(false)}
      >
        Fechar
      </Button>
    </div>
  );

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Busca
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-0 sm:space-y-1.5">
              <Label
                htmlFor="animais-filter-ident"
                className="max-sm:sr-only text-xs font-medium text-muted-foreground"
              >
                Identificação ou brinco
              </Label>
              <Input
                id="animais-filter-ident"
                className="min-h-[44px] w-full"
                value={values.identificacao}
                onChange={(e) => set({ identificacao: e.target.value })}
                placeholder="Identificação ou brinco…"
                autoComplete="off"
              />
            </div>

            <div className="flex shrink-0">
              {isMd ? (
                <Popover open={panelOpen} onOpenChange={setPanelOpen}>
                  <PopoverTrigger asChild>{filterTriggerButton}</PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    collisionPadding={16}
                    className="flex w-[min(100vw-2rem,32rem)] flex-col gap-0 overflow-hidden p-0 max-h-[min(85vh,calc(100dvh-4rem))]"
                  >
                    <div className="shrink-0 border-b border-border px-4 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        Os resultados atualizam ao alterar qualquer campo.
                      </p>
                    </div>
                    <div
                      id="animais-filtros-avancados"
                      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
                    >
                      {advancedForm}
                    </div>
                    <div className="shrink-0 border-t border-border bg-popover px-4 py-3">
                      {footerActions}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full gap-2 sm:w-auto"
                    aria-expanded={panelOpen}
                    aria-controls="animais-filtros-avancados"
                    onClick={() => setPanelOpen(true)}
                  >
                    <Filter className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Mais filtros</span>
                    {advancedCount > 0 ? (
                      <Badge variant="secondary" className="tabular-nums">
                        {advancedCount}
                      </Badge>
                    ) : null}
                  </Button>
                  <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
                    <DialogContent
                      className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-4 sm:max-w-lg"
                      aria-describedby="animais-filtros-desc"
                    >
                      <DialogHeader>
                        <DialogTitle>Mais filtros</DialogTitle>
                        <DialogDescription id="animais-filtros-desc">
                          Categoria, sexo, saúde, reprodução ou lote. A lista
                          atualiza automaticamente.
                        </DialogDescription>
                      </DialogHeader>
                      <div
                        className="min-h-0 flex-1 overflow-y-auto py-2"
                        id="animais-filtros-avancados"
                      >
                        {advancedForm}
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        {footerActions}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </div>

        {(values.categoria ||
          values.sexo ||
          values.status_saude ||
          values.status_reprodutivo ||
          loteAtivo(values.lote_id)) && (
          <div className="border-t border-border/80 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Filtros aplicados
              </p>
              {onClear && advancedCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-0 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    clearAdvanced();
                  }}
                >
                  Limpar filtros avançados
                </Button>
              ) : null}
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="list"
              aria-label="Filtros ativos"
            >
              {values.categoria ? (
                <ActiveChip
                  label={`Categoria: ${CATEGORIA_LABELS[values.categoria as keyof typeof CATEGORIA_LABELS] ?? values.categoria}`}
                  onRemove={() => set({ categoria: "" })}
                />
              ) : null}
              {values.sexo ? (
                <ActiveChip
                  label={`Sexo: ${SEXO_LABELS[values.sexo as keyof typeof SEXO_LABELS] ?? values.sexo}`}
                  onRemove={() => set({ sexo: "" })}
                />
              ) : null}
              {values.status_saude ? (
                <ActiveChip
                  label={`Saúde: ${STATUS_SAUDE_LABELS[values.status_saude as keyof typeof STATUS_SAUDE_LABELS] ?? values.status_saude}`}
                  onRemove={() => set({ status_saude: "" })}
                />
              ) : null}
              {values.status_reprodutivo ? (
                <ActiveChip
                  label={`Reprod.: ${STATUS_REPRODUTIVO_LABELS[values.status_reprodutivo as keyof typeof STATUS_REPRODUTIVO_LABELS] ?? values.status_reprodutivo}`}
                  onRemove={() => set({ status_reprodutivo: "" })}
                />
              ) : null}
              {loteAtivo(values.lote_id) ? (
                <ActiveChip
                  label={`Lote: ${values.lote_id}`}
                  onRemove={() => set({ lote_id: "" })}
                />
              ) : null}
            </div>
          </div>
        )}

        {onClear && hasAnyFilter ? (
          <div className="flex justify-end border-t border-border/80 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] text-muted-foreground"
              onClick={onClear}
            >
              Limpar tudo (busca e filtros)
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActiveChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      role="listitem"
      className="inline-flex min-h-[44px] max-w-full items-center gap-1 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-sm"
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onRemove}
        aria-label={`Remover filtro: ${label}`}
      >
        <X className="h-4 w-4" />
      </button>
    </span>
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
