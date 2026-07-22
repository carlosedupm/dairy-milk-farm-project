"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { formatLitrosForList } from "@/lib/litros-format";
import {
  ORDENHA_TURNOS,
  ORDENHA_TURNO_LABELS,
  type OrdenhaTurno,
} from "@/lib/ordenha-turno";
import { useOrdenhaSession } from "@/hooks/useOrdenhaSession";
import { OrdenhaAnimalCard } from "@/components/producao/OrdenhaAnimalCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAnimalOptionLabel } from "@/components/animais/animalSelectUtils";
import { cn } from "@/lib/utils";

type Props = {
  fazendaId: number;
};

export function OrdenhaSessionView({ fazendaId }: Props) {
  const session = useOrdenhaSession(fazendaId);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  if (finished) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-2">
          <h2 className="text-lg font-semibold text-content-primary">
            Ordenha encerrada
          </h2>
          <p className="text-sm text-content-secondary">
            Turno: {session.turnoLabel} · {session.dia}
          </p>
          <p className="text-base text-content-primary">
            Registos nesta sessão:{" "}
            <strong>{session.sessionCount}</strong>
          </p>
          <p className="text-base text-content-primary">
            Total:{" "}
            <strong>{formatLitrosForList(session.sessionLitros)} L</strong>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-[44px]">
            <Link href="/producao">Ver listagem</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-[44px]"
            onClick={() => setFinished(false)}
          >
            Continuar ordenha
          </Button>
        </div>
      </div>
    );
  }

  if (session.isLoading) {
    return (
      <p className="text-muted-foreground" aria-live="polite">
        A carregar lista da ordenha…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border bg-surface-primary p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ordenha-turno">Turno</Label>
            <Select
              value={session.turno}
              onValueChange={(v) => session.changeTurno(v as OrdenhaTurno)}
            >
              <SelectTrigger id="ordenha-turno" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDENHA_TURNOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ORDENHA_TURNO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dia</Label>
            <p className="flex min-h-[44px] items-center text-sm text-content-secondary">
              {session.dia}
            </p>
          </div>
        </div>

        {session.turnoDesalinhado ? (
          <p
            className="text-sm text-feedback-warning-foreground bg-feedback-warning/10 border border-feedback-warning/40 rounded-md p-3"
            role="status"
          >
            A hora atual corresponde ao turno{" "}
            <strong>{session.turnoInferidoLabel}</strong>, mas a sessão está em{" "}
            <strong>{session.turnoLabel}</strong>. O registo será gravado com a
            hora atual e, em sessões futuras, classificado pela janela dessa
            hora.
          </p>
        ) : null}

        <p className="text-sm text-content-secondary">
          Pendentes: {session.pendenteCount} · Já neste turno:{" "}
          {session.blockedCount} · Nesta sessão: {session.sessionCount} (
          {formatLitrosForList(session.sessionLitros)} L)
        </p>
      </div>

      {session.activeRow ? (
        <OrdenhaAnimalCard
          key={session.activeRow.animal.id}
          animal={session.activeRow.animal}
          jaNoTurno={session.activeRow.jaNoTurno}
          temRestricao={session.activeRow.temRestricao}
          isPending={submitting}
          onSkip={() => session.skipAnimal(session.activeRow!.animal.id)}
          onSubmit={async (qtd, qualidade) => {
            setSubmitting(true);
            try {
              await session.registerProducao(
                session.activeRow!.animal.id,
                qtd,
                qualidade,
              );
              toast.success("Produção registada");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : (
        <p className="text-sm text-content-secondary" role="status">
          {session.totalAnimais === 0
            ? "Não há animais em lactação nesta fazenda."
            : "Não há vacas pendentes neste turno. Pode encerrar a ordenha."}
        </p>
      )}

      <ul className="space-y-2" aria-label="Lista de animais da ordenha">
        {session.rows.map((row) => {
          const active = session.activeRow?.animal.id === row.animal.id;
          return (
            <li key={row.animal.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full min-h-[44px] items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface-elevated",
                  row.jaNoTurno && "opacity-70",
                )}
                onClick={() => {
                  if (row.pulada) session.unskipAnimal(row.animal.id);
                  session.selectAnimal(row.animal.id);
                }}
              >
                <span className="truncate font-medium text-content-primary">
                  {formatAnimalOptionLabel(row.animal)}
                </span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {row.temRestricao ? (
                    <Badge
                      variant="outline"
                      className="border-feedback-warning/40 bg-feedback-warning/10 text-feedback-warning-foreground"
                    >
                      Descarte
                    </Badge>
                  ) : null}
                  {row.jaNoTurno ? (
                    <Badge variant="secondary">Feito</Badge>
                  ) : row.pulada ? (
                    <Badge variant="outline">Pulada</Badge>
                  ) : (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="min-h-[44px] w-full sm:w-auto"
        onClick={() => setFinished(true)}
      >
        Encerrar ordenha
      </Button>
    </div>
  );
}
