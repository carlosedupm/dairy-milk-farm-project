"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { ResponsiveFiltersShell } from "@/components/layout/ResponsiveFiltersShell";
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
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import {
  ALERTAS_FILTER_ALL,
  countActiveAlertasFilters,
  type AlertasFilterState,
} from "./alertas-utils";

type Props = {
  filters: AlertasFilterState;
  onStatusChange: (value: string) => void;
  onTipoChange: (value: string) => void;
  onSeveridadeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function AlertasListToolbar({
  filters,
  onStatusChange,
  onTipoChange,
  onSeveridadeChange,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  isRefreshing,
  onClear,
  hasActiveFilters,
}: Props) {
  const activeCount = countActiveAlertasFilters(filters);

  const form = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
        <div className="space-y-2 min-w-0">
          <Label htmlFor="filtro-status">Status</Label>
          <Select value={filters.status} onValueChange={onStatusChange}>
            <SelectTrigger id="filtro-status" className="w-full">
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
        <div className="space-y-2 min-w-0">
          <Label htmlFor="filtro-tipo">Tipo</Label>
          <Select value={filters.tipo} onValueChange={onTipoChange}>
            <SelectTrigger id="filtro-tipo" className="w-full">
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
        <div className="space-y-2 min-w-0 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="filtro-severidade">Severidade</Label>
          <Select value={filters.severidade} onValueChange={onSeveridadeChange}>
            <SelectTrigger id="filtro-severidade" className="w-full">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
        <div className="space-y-2 min-w-0">
          <Label htmlFor="filtro-start">Data inicial</Label>
          <DatePicker
            id="filtro-start"
            value={filters.start}
            onChange={onStartDateChange}
            placeholder="Selecione a data inicial"
            className="w-full"
          />
        </div>
        <div className="space-y-2 min-w-0">
          <Label htmlFor="filtro-end">Data final</Label>
          <DatePicker
            id="filtro-end"
            value={filters.end}
            onChange={onEndDateChange}
            placeholder="Selecione a data final"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          aria-label="Atualizar lista de alertas"
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            aria-hidden
          />
          Atualizar
        </Button>
      </div>
    </div>
  );

  return (
    <ResponsiveFiltersShell
      hasActiveFilters={hasActiveFilters}
      onClear={onClear}
      activeCount={activeCount}
      title="Filtros de alertas"
      description="Status, tipo, severidade e período."
    >
      {form}
    </ResponsiveFiltersShell>
  );
}
