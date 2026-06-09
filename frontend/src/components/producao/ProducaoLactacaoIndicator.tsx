"use client";

import Link from "next/link";
import { Milk } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isPathAllowedForPerfil } from "@/config/appAccess";
import { formatDatePtBr } from "@/lib/format";
import { buildGestaoNovoHref } from "@/lib/gestaoNovoUrl";
import type { LactacaoAtiva } from "@/services/animais";
import { isLactacaoAtivaNaData } from "@/components/producao/producaoLactacaoUtils";

type Props = {
  animalId: number;
  dataHora: string;
  lactacaoAtiva?: LactacaoAtiva | null;
  isLoading?: boolean;
  /** Deep link com animal fora da lista em-lactação */
  deepLinkAnimalIndisponivel?: boolean;
};

export function ProducaoLactacaoIndicator({
  animalId,
  dataHora,
  lactacaoAtiva,
  isLoading = false,
  deepLinkAnimalIndisponivel = false,
}: Props) {
  const { user } = useAuth();
  const perfil = user?.perfil;

  if (animalId <= 0) return null;

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground break-words" role="status">
        A verificar lactação…
      </p>
    );
  }

  const lactacaoValidaNaData =
    lactacaoAtiva != null && isLactacaoAtivaNaData(lactacaoAtiva, dataHora);

  if (lactacaoValidaNaData && lactacaoAtiva) {
    return (
      <div
        className="rounded-lg border border-muted-foreground/20 bg-muted/30 p-3 text-sm break-words space-y-1"
        role="status"
      >
        <p className="flex items-center gap-2 flex-wrap font-medium">
          <Milk className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <span>Lactação ativa: Sim</span>
        </p>
        <p className="text-muted-foreground">
          Lactação #{lactacaoAtiva.numero_lactacao} desde{" "}
          {formatDatePtBr(lactacaoAtiva.data_inicio)}.
        </p>
        <p className="text-muted-foreground text-sm">
          O vínculo é preenchido automaticamente ao salvar.
        </p>
      </div>
    );
  }

  const semLactacaoAtiva = lactacaoAtiva == null;
  const mensagemPrincipal = semLactacaoAtiva
    ? "Este animal não possui lactação ativa. Registre uma lactação antes de registrar produção."
    : `A data selecionada não está coberta pela lactação ativa (#${lactacaoAtiva.numero_lactacao} desde ${formatDatePtBr(lactacaoAtiva.data_inicio)}).`;

  const podeRegistarLactacao = isPathAllowedForPerfil(
    perfil,
    "/gestao/lactacoes/novo"
  );
  const lactacaoHref = buildGestaoNovoHref("/gestao/lactacoes/novo", {
    animalId,
  });

  return (
    <div
      className="text-sm text-feedback-warning border border-feedback-warning/30 rounded-lg p-3 break-words space-y-2"
      role="alert"
    >
      <p>
        {deepLinkAnimalIndisponivel && semLactacaoAtiva
          ? "O animal indicado no link não está em lactação ativa. "
          : null}
        {mensagemPrincipal}
      </p>
      {podeRegistarLactacao ? (
        <p>
          <Link
            href={lactacaoHref}
            className="font-medium underline underline-offset-2 hover:text-feedback-warning-foreground"
          >
            Registar lactação
          </Link>
        </p>
      ) : (
        <p className="text-muted-foreground">
          Registre um parto ou contacte a gestão para abrir uma lactação.
        </p>
      )}
    </div>
  );
}
