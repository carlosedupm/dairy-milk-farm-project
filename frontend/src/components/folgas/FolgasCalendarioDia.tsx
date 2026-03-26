"use client";

import { format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { EscalaFolga, FolgasRodizioDia } from "@/services/folgas";
import { buildFolgasCellTooltipText } from "./folgas-cell-tooltip";
import { divergeRegistradoDoRodizio, labelRodizioPrevisto } from "./folgas-rodizio-utils";
import { toYMD } from "./folgas-utils";

export type FolgasCalendarioDiaProps = {
  d: Date;
  month: Date;
  lista: EscalaFolga[];
  /** Previsto do rodízio nesta data (API); opcional se não houver config. */
  rodizioDia?: FolgasRodizioDia | null;
  temAlerta: boolean;
  meuDia: boolean;
  isFuncionario: boolean;
  canManage: boolean;
  filtroVisualAtivo: boolean;
  filtroFuncionarioId: number | null;
  userId: number | undefined;
  onOpenDetails: (ymd: string) => void;
};

export function FolgasCalendarioDia({
  d,
  month,
  lista,
  rodizioDia,
  temAlerta,
  meuDia,
  isFuncionario,
  canManage,
  filtroVisualAtivo,
  filtroFuncionarioId,
  userId,
  onOpenDetails,
}: FolgasCalendarioDiaProps) {
  const ymd = toYMD(d);
  const fora = !isSameMonth(d, month);
  const excecaoMotivoDia = lista[0]?.excecao_motivo_dia ?? null;

  const listaVisivel =
    filtroVisualAtivo && filtroFuncionarioId != null
      ? lista.filter((e) => e.usuario_id === filtroFuncionarioId)
      : lista;
  const diaDestaqueFiltro =
    filtroVisualAtivo && listaVisivel.length > 0;
  const diaEsmaecidoFiltro =
    filtroVisualAtivo && listaVisivel.length === 0;
  const mostrarExcecaoDia =
    excecaoMotivoDia &&
    (canManage || (isFuncionario && meuDia)) &&
    (!filtroVisualAtivo || diaDestaqueFiltro);

  /** Na gestão com filtro, célula esmaecida ainda pode mostrar o dia inteiro no tooltip. */
  const entradasTooltip =
    diaEsmaecidoFiltro && canManage && lista.length > 0 ? lista : listaVisivel;

  const incluirExcecaoTooltip =
    !!excecaoMotivoDia &&
    (canManage ||
      (isFuncionario &&
        meuDia &&
        (!filtroVisualAtivo || diaDestaqueFiltro)));

  const foraDoRodizio =
    canManage && divergeRegistradoDoRodizio(lista, rodizioDia ?? undefined);
  const rodizioCurto = (() => {
    if (!rodizioDia?.tem_folga) return null;
    if (rodizioDia.usuario_nome?.trim()) {
      return rodizioDia.usuario_nome.trim();
    }
    if (rodizioDia.usuario_id != null) return `#${rodizioDia.usuario_id}`;
    return "Folga prevista";
  })();

  const tooltipText = buildFolgasCellTooltipText({
    entradas: entradasTooltip,
    rodizioDia: rodizioDia ?? undefined,
    excecaoMotivoDia,
    incluirExcecao: incluirExcecaoTooltip,
    canManage,
    isFuncionario,
    userId,
  });

  const totalFolgasVisiveis = listaVisivel.length;
  const diaLabel =
    isFuncionario && meuDia
      ? "Meu dia"
      : `${totalFolgasVisiveis} ${totalFolgasVisiveis === 1 ? "folga" : "folgas"}`;
  const cellClassName = `min-h-[88px] rounded-md border border-border p-1.5 text-base outline-none ${
    fora ? "bg-muted/40 text-muted-foreground" : "bg-card"
  } ${temAlerta ? "ring-2 ring-destructive/60" : ""} ${
    diaDestaqueFiltro && !temAlerta
      ? "bg-primary/5 ring-2 ring-primary/50"
      : ""
  } ${diaEsmaecidoFiltro ? "opacity-45" : ""}`;

  const cellBody = (
    <>
      <div className="font-medium leading-tight">
        {fora ? (
          <span>{format(d, "d MMM", { locale: ptBR })}</span>
        ) : (
          format(d, "d")
        )}
      </div>
      <div className="mt-1 space-y-1">
        {!fora && rodizioCurto && (
          <div className="truncate text-[12px] leading-snug text-muted-foreground">
            {rodizioCurto}
          </div>
        )}
        {!fora && !diaEsmaecidoFiltro && (
          <div className="text-sm leading-snug">
            {totalFolgasVisiveis > 0 ? (
              <span className="font-medium">{diaLabel}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        )}
        {foraDoRodizio && (
          <Badge
            variant="outline"
            className="mt-0.5 hidden border-amber-500/70 text-amber-900 dark:text-amber-100 md:inline-flex"
          >
            Fora do rodízio
          </Badge>
        )}
        {foraDoRodizio && (
          <span
            className="mt-0.5 inline-block h-2 w-2 rounded-full bg-amber-500 md:hidden"
            aria-label="Fora do rodízio"
            title="Fora do rodízio"
          />
        )}
        {!fora && mostrarExcecaoDia && (
          <p className="truncate text-sm text-muted-foreground">Exceção</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="mt-1 hidden h-auto min-h-[44px] w-full px-2 text-sm font-normal md:flex"
        onClick={() => onOpenDetails(ymd)}
      >
        Ver detalhes
      </Button>
    </>
  );

  if (tooltipText) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            className={`${cellClassName} cursor-pointer`}
            aria-label={`${format(d, "d/MM/yyyy")}. ${diaLabel}. Toque para ver detalhes.`}
            role="button"
            onClick={() => onOpenDetails(ymd)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenDetails(ymd);
              }
            }}
          >
            {cellBody}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-sm whitespace-pre-wrap leading-snug"
        >
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      tabIndex={0}
      role="button"
      className={`${cellClassName} cursor-pointer`}
      aria-label={`${format(d, "d/MM/yyyy")}. ${diaLabel}. Toque para ver detalhes.`}
      onClick={() => onOpenDetails(ymd)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails(ymd);
        }
      }}
    >
      {cellBody}
    </div>
  );
}
