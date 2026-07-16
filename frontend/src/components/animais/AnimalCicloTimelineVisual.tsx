"use client";

import Link from "next/link";
import {
  Baby,
  BarChart3,
  Droplets,
  Eye,
  Link2,
  LogOut,
  PauseCircle,
  PartyPopper,
  Search,
} from "lucide-react";
import { formatDatePtBr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { canProximaAcao } from "@/components/animais/animalProximasAcoesUtils";
import {
  getCicloTipoLabel,
  isCicloTimelineTipo,
  isTipoSecundario,
  type CicloMarco,
  type CicloMarcoConcluido,
  type CicloMarcoPrevisto,
} from "@/components/animais/animalCicloTimelineUtils";
import { cn } from "@/lib/utils";
import { timelineItemHref } from "@/lib/animalEventoLinks";

export function CicloTimelineSkeleton() {
  return (
    <div className="space-y-0 min-w-0" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-2 sm:gap-4 animate-pulse">
          <div className="flex flex-col items-center shrink-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted" />
            {i < 3 ? (
              <div className="w-0.5 flex-1 min-h-8 bg-muted my-1" />
            ) : null}
          </div>
          <div className="flex-1 pb-6 min-w-0">
            <div className="rounded-md border border-border p-3 sm:p-4 space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-3/4 max-w-xs rounded bg-muted" />
              <div className="h-3 w-1/2 max-w-[200px] rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  marcos: CicloMarco[];
  animalId: number;
};

function MarcoPrevistoCard({
  marco,
  perfil,
}: {
  marco: CicloMarcoPrevisto;
  perfil: string | undefined;
}) {
  const allowed = canProximaAcao(perfil, {
    codigo: marco.codigo,
    label: marco.titulo,
    href_path: marco.hrefPath,
  });

  const titleContent = allowed ? (
    <Link
      href={marco.hrefPath}
      className="font-medium break-words hover:underline"
    >
      {marco.titulo}
    </Link>
  ) : (
    <p className="font-medium break-words">{marco.titulo}</p>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Badge variant="outline" className="shrink-0 border-dashed">
          Previsto
        </Badge>
        <Badge variant="outline" className="shrink-0">
          {getCicloTipoLabel(marco.tipo)}
        </Badge>
      </div>
      {titleContent}
    </>
  );
}

function MarcoConcluidoCard({
  marco,
  animalId,
  perfil,
}: {
  marco: CicloMarcoConcluido;
  animalId: number;
  perfil: string | undefined;
}) {
  const secundario = isTipoSecundario(marco.tipo);
  const href = timelineItemHref(
    animalId,
    { tipo: marco.tipo, ref_id: marco.ref_id },
    perfil
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Badge variant={secundario ? "secondary" : "outline"} className="shrink-0">
          {getCicloTipoLabel(marco.tipo)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatDatePtBr(marco.data)}
        </span>
      </div>
      {href ? (
        <Link
          href={href}
          className="font-medium break-words hover:underline"
          aria-label={`Ver detalhes: ${marco.titulo}`}
        >
          {marco.titulo}
        </Link>
      ) : (
        <p className="font-medium break-words">{marco.titulo}</p>
      )}
      {marco.detalhe ? (
        <p className="text-sm text-muted-foreground break-words mt-0.5">
          {marco.detalhe}
        </p>
      ) : null}
      {marco.registrado_por ? (
        <p className="text-sm text-muted-foreground mt-1">
          Registado por {marco.registrado_por}
        </p>
      ) : null}
    </>
  );
}

function CicloTipoIcon({
  tipo,
  className,
}: {
  tipo: string;
  className?: string;
}) {
  const props = { className, "aria-hidden": true as const };

  if (!isCicloTimelineTipo(tipo)) {
    return <Eye {...props} />;
  }

  switch (tipo) {
    case "CIO":
      return <Eye {...props} />;
    case "COBERTURA":
      return <Link2 {...props} />;
    case "TOQUE":
      return <Search {...props} />;
    case "GESTACAO":
      return <Baby {...props} />;
    case "SECAGEM":
      return <PauseCircle {...props} />;
    case "PARTO":
      return <PartyPopper {...props} />;
    case "LACTACAO":
      return <Droplets {...props} />;
    case "PRODUCAO":
      return <BarChart3 {...props} />;
    case "BAIXA":
      return <LogOut {...props} />;
    default:
      return <Eye {...props} />;
  }
}

function MarcoNode({
  marco,
  isLast,
  perfil,
  animalId,
}: {
  marco: CicloMarco;
  isLast: boolean;
  perfil: string | undefined;
  animalId: number;
}) {
  const isPrevisto = marco.status === "previsto";
  const tipo = marco.status === "previsto" ? marco.tipo : marco.tipo;

  return (
    <div className="flex gap-2 sm:gap-4 min-w-0">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 shrink-0",
            isPrevisto
              ? "border-dashed border-muted-foreground bg-muted/30"
              : "border-primary bg-primary text-primary-foreground",
          )}
          aria-hidden
        >
          <CicloTipoIcon
            tipo={tipo}
            className={cn(
              "h-4 w-4 sm:h-5 sm:w-5",
              isPrevisto ? "text-muted-foreground" : "text-primary-foreground",
            )}
          />
        </div>
        {!isLast ? (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-8 my-1",
              isPrevisto ? "bg-muted-foreground/30" : "bg-border",
            )}
            aria-hidden
          />
        ) : null}
      </div>

      <div className={cn("flex-1 min-w-0", !isLast && "pb-4 sm:pb-6")}>
        <div
          className={cn(
            "rounded-md border p-3 sm:p-4 min-w-0",
            isPrevisto
              ? "border-dashed border-muted-foreground/50 bg-muted/20"
              : "border-border bg-surface-elevated",
          )}
        >
          {isPrevisto ? (
            <MarcoPrevistoCard marco={marco} perfil={perfil} />
          ) : (
            <MarcoConcluidoCard
              marco={marco}
              animalId={animalId}
              perfil={perfil}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function AnimalCicloTimelineVisual({ marcos, animalId }: Props) {
  const { user } = useAuth();

  return (
    <div className="min-w-0" role="list" aria-label="Timeline do ciclo reprodutivo">
      {marcos.map((marco, idx) => (
        <div key={marcoKey(marco, idx)} role="listitem">
          <MarcoNode
            marco={marco}
            isLast={idx === marcos.length - 1}
            perfil={user?.perfil}
            animalId={animalId}
          />
        </div>
      ))}
    </div>
  );
}

function marcoKey(marco: CicloMarco, idx: number): string {
  if (marco.status === "previsto") {
    return `previsto-${marco.codigo}-${idx}`;
  }
  return `concluido-${marco.tipo}-${marco.ref_id ?? idx}-${marco.data}`;
}
