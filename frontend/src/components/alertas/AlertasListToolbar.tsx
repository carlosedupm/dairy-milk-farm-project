"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SEVERIDADE_ALERTA_LABELS,
  SEVERIDADES_ALERTA,
  STATUS_ALERTA,
  STATUS_ALERTA_LABELS,
  TIPOS_ALERTA,
  TIPO_ALERTA_LABELS,
} from "@/services/alertas";
import { ALERTAS_FILTER_ALL } from "./alertas-utils";

type Props = {
  statusFilter: string;
  activeTipoFilter: string;
  severidadeFilter: string;
  onStatusChange: (value: string) => void;
  onTipoChange: (value: string) => void;
  onSeveridadeChange: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function AlertasListToolbar({
  statusFilter,
  activeTipoFilter,
  severidadeFilter,
  onStatusChange,
  onTipoChange,
  onSeveridadeChange,
  onClear,
  hasActiveFilters,
}: Props) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="filtro-status">Status</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger id="filtro-status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALERTAS_FILTER_ALL}>Todos</SelectItem>
              {STATUS_ALERTA.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_ALERTA_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filtro-tipo">Tipo</Label>
          <Select value={activeTipoFilter} onValueChange={onTipoChange}>
            <SelectTrigger id="filtro-tipo">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALERTAS_FILTER_ALL}>Todos</SelectItem>
              {TIPOS_ALERTA.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_ALERTA_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filtro-severidade">Severidade</Label>
          <Select value={severidadeFilter} onValueChange={onSeveridadeChange}>
            <SelectTrigger id="filtro-severidade">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALERTAS_FILTER_ALL}>Todas</SelectItem>
              {SEVERIDADES_ALERTA.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERIDADE_ALERTA_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasActiveFilters ? (
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}
