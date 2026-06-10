"use client";

import Link from "next/link";
import { formatDateTimePtBr } from "@/lib/format";
import type { CicloTimelineItem } from "@/services/animais";
import { Badge } from "@/components/ui/badge";
import { Bell, Pill, Syringe } from "lucide-react";

function timelineTipoLabel(tipo: string): string {
  if (tipo === "SAUDE") return "Saúde";
  if (tipo === "ALERTA") return "Alerta";
  if (tipo === "VACINA") return "Vacina";
  return tipo;
}

export function TimelineSkeletonRows() {
  return (
    <ul className="space-y-3 min-w-0" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="border-b border-border pb-3 last:border-0 last:pb-0 animate-pulse"
        >
          <div className="flex gap-2 mb-2">
            <div className="h-5 w-16 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 max-w-xs rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

type Props = {
  items: CicloTimelineItem[];
  animalId: number;
  canEditSaude: boolean;
};

export function AnimalTimelineList({
  items,
  animalId,
  canEditSaude,
}: Props) {
  return (
    <ul className="space-y-3 min-w-0">
      {items.map((item, idx) => {
        const isSaude = item.tipo === "SAUDE";
        const isAlerta = item.tipo === "ALERTA";
        const isVacina = item.tipo === "VACINA";
        const saudeEditHref =
          isSaude && item.ref_id != null && canEditSaude
            ? `/animais/${animalId}/saude/editar/${item.ref_id}`
            : null;

        return (
          <li
            key={`${item.tipo}-${item.ref_id ?? idx}-${item.data}-${idx}`}
            className="border-b border-border pb-3 last:border-0 last:pb-0 min-w-0"
          >
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              {isSaude ? (
                <Pill
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              {isAlerta ? (
                <Bell
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              {isVacina ? (
                <Syringe
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              <Badge variant="outline" className="shrink-0">
                {timelineTipoLabel(item.tipo)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDateTimePtBr(item.data)}
              </span>
            </div>
            {saudeEditHref ? (
              <Link
                href={saudeEditHref}
                className="font-medium break-words hover:underline block py-0.5"
              >
                {item.titulo}
              </Link>
            ) : isAlerta ? (
              <Link
                href="/alertas"
                className="font-medium break-words hover:underline block py-0.5"
              >
                {item.titulo}
              </Link>
            ) : (
              <p className="font-medium break-words">{item.titulo}</p>
            )}
            {item.detalhe ? (
              <p className="text-sm text-muted-foreground break-words">
                {item.detalhe}
              </p>
            ) : null}
            {item.registrado_por ? (
              <p className="text-sm text-muted-foreground mt-1">
                Registado por {item.registrado_por}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
