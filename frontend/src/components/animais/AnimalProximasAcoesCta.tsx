"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { showAssistenteForPerfil } from "@/config/appAccess";
import type { ProximaAcao } from "@/services/animais";
import {
  TOUR_STEP_FICHA_PROXIMAS_ACOES,
  TOUR_STEP_FICHA_PROXIMAS_ACOES_MOBILE,
} from "@/components/ui/tour";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  canProximaAcao,
  takeProximasAcoes,
} from "@/components/animais/animalProximasAcoesUtils";

type Props = {
  acoes: ProximaAcao[];
  foraDoRebanho?: boolean;
};

function ProximaAcaoButton({
  acao,
  perfil,
  className,
}: {
  acao: ProximaAcao;
  perfil: string | undefined;
  className?: string;
}) {
  const allowed = canProximaAcao(perfil, acao);
  if (!allowed) {
    return (
      <Button
        type="button"
        variant="default"
        size="touch"
        disabled
        className={className}
        title="Sem permissão para esta ação"
      >
        {acao.label}
      </Button>
    );
  }
  return (
    <Button variant="default" size="touch" className={className} asChild>
      <Link href={acao.href_path}>{acao.label}</Link>
    </Button>
  );
}

function ProximasAcoesButtons({
  acoes,
  perfil,
  layout,
}: {
  acoes: ProximaAcao[];
  perfil: string | undefined;
  layout: "card" | "sticky";
}) {
  const isSticky = layout === "sticky";
  return (
    <div
      className={cn(
        isSticky
          ? "flex flex-col gap-2 px-4 pt-3"
          : "flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      )}
    >
      {acoes.map((a) => (
        <ProximaAcaoButton
          key={a.codigo}
          acao={a}
          perfil={perfil}
          className={isSticky ? "w-full" : undefined}
        />
      ))}
    </div>
  );
}

export function AnimalProximasAcoesCta({ acoes, foraDoRebanho }: Props) {
  const { user } = useAuth();
  const perfil = user?.perfil;
  const visible = takeProximasAcoes(acoes);

  if (foraDoRebanho || visible.length === 0) {
    return null;
  }

  const assistenteVisivel = showAssistenteForPerfil(perfil);

  return (
    <>
      <Card id={TOUR_STEP_FICHA_PROXIMAS_ACOES} className="hidden md:block">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Próximas ações</CardTitle>
        </CardHeader>
        <CardContent>
          <ProximasAcoesButtons acoes={visible} perfil={perfil} layout="card" />
        </CardContent>
      </Card>

      <div
        id={TOUR_STEP_FICHA_PROXIMAS_ACOES_MOBILE}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden",
          assistenteVisivel && "pr-16"
        )}
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
        role="region"
        aria-label="Próximas ações"
      >
        <p className="px-4 pt-3 text-sm font-medium">Próximas ações</p>
        <ProximasAcoesButtons
          acoes={visible}
          perfil={perfil}
          layout="sticky"
        />
      </div>
    </>
  );
}

/** Espaço inferior na ficha para a barra sticky no mobile não tapar a timeline. */
export function animalProximasAcoesPageSpacerClass(
  acoes: ProximaAcao[] | undefined,
  foraDoRebanho?: boolean
): string | undefined {
  if (foraDoRebanho || !acoes?.length) return undefined;
  const count = takeProximasAcoes(acoes).length;
  if (count >= 3) return "pb-56 md:pb-0";
  return "pb-32 md:pb-0";
}
