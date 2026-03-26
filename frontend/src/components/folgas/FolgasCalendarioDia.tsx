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
  onAlterar: (ymd: string) => void;
  onJustificar: (ymd: string) => void;
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
  onAlterar,
  onJustificar,
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
  const linhaRodizio = labelRodizioPrevisto(rodizioDia ?? undefined);

  const tooltipText = buildFolgasCellTooltipText({
    entradas: entradasTooltip,
    rodizioDia: rodizioDia ?? undefined,
    excecaoMotivoDia,
    incluirExcecao: incluirExcecaoTooltip,
    canManage,
    isFuncionario,
    userId,
  });

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
      <div className="mt-1 space-y-0.5">
        {linhaRodizio && (
          <div className="truncate text-[13px] leading-snug text-muted-foreground">
            {linhaRodizio}
          </div>
        )}
        {foraDoRodizio && (
          <Badge variant="outline" className="mt-0.5 border-amber-500/70 text-amber-900 dark:text-amber-100">
            Fora do rodízio
          </Badge>
        )}
        {listaVisivel.map((e) => (
          <div key={e.id}>
            <div className="truncate text-base leading-snug">
              {e.usuario_nome || `Usuário #${e.usuario_id}`}
              {e.origem === "MANUAL" && (
                <span className="text-muted-foreground"> (aj.)</span>
              )}
              {e.justificada && (
                <span className="text-muted-foreground"> ✓</span>
              )}
            </div>
            {e.motivo &&
              (canManage ||
                (isFuncionario && userId && e.usuario_id === userId)) && (
                <div className="mt-0.5 truncate text-base leading-snug text-muted-foreground">
                  Motivo: {e.motivo}
                </div>
              )}
          </div>
        ))}
        {!diaEsmaecidoFiltro &&
          listaVisivel.length === 0 &&
          !excecaoMotivoDia && (
            <span className="text-base text-muted-foreground">—</span>
          )}

        {mostrarExcecaoDia && (
          <div className="mt-1 truncate text-base leading-snug text-muted-foreground">
            Exceção do dia: {excecaoMotivoDia}
          </div>
        )}
      </div>
      {canManage && (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="mt-1 h-auto min-h-[44px] w-full px-2 text-base font-normal"
          onClick={() => onAlterar(ymd)}
        >
          Alterar dia
        </Button>
      )}
      {isFuncionario && meuDia && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-1 h-auto min-h-[44px] w-full px-2 text-base font-normal"
          onClick={() => onJustificar(ymd)}
        >
          Justificar
        </Button>
      )}
    </>
  );

  if (tooltipText) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            className={cellClassName}
            aria-label={`${format(d, "d/MM/yyyy")}. Ver detalhes ao focar ou passar o mouse.`}
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

  return <div className={cellClassName}>{cellBody}</div>;
}
