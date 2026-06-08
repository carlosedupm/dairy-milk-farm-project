"use client";

import { formatDatePtBr } from "@/lib/format";
import type { AnimalContexto } from "@/services/animais";
import {
  formatGestacaoResumoLinha,
  formatProducaoHistoricoResumo,
  getStatusReprodutivoLabel,
} from "@/components/animais/animalResumoUtils";
import { AnimalProximasAcoesCta } from "@/components/animais/AnimalProximasAcoesCta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Milk } from "lucide-react";
import {
  MOTIVO_RESTRICAO_LEITE_LABELS,
  type MotivoRestricaoLeite,
} from "@/services/restricoesLeite";

type Props = {
  contexto: AnimalContexto;
  showProximasAcoes?: boolean;
};

export function AnimalFichaCiclo({
  contexto,
  showProximasAcoes = true,
}: Props) {
  const gestacaoLinha = formatGestacaoResumoLinha(contexto.gestacao_resumo);
  const producaoLinha = formatProducaoHistoricoResumo(contexto.resumo_producao);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Estado atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm min-w-0">
          {contexto.fora_do_rebanho ? (
            <div
              className="rounded-md border border-muted-foreground/30 bg-muted/50 p-3"
              role="status"
            >
              <p className="font-medium">Animal fora do rebanho</p>
              {contexto.saida_resumo?.motivo_label ? (
                <p className="text-muted-foreground mt-1">
                  {contexto.saida_resumo.motivo_label}
                  {contexto.saida_resumo.data_saida
                    ? ` — ${formatDatePtBr(contexto.saida_resumo.data_saida)}`
                    : null}
                </p>
              ) : null}
              {contexto.saida_resumo?.registrado_por ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Baixa registada por {contexto.saida_resumo.registrado_por}
                </p>
              ) : null}
            </div>
          ) : null}
          {contexto.registrado_por_cadastro ? (
            <p className="text-xs text-muted-foreground">
              Animal registado por {contexto.registrado_por_cadastro}
            </p>
          ) : null}
          {contexto.restricao_leite_ativa ? (
            <div className="flex gap-2 rounded-md border border-feedback-warning/40 bg-feedback-warning/10 p-3 min-w-0">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-feedback-warning"
                aria-hidden
              />
              <p className="break-words">
                <span className="font-medium">Leite aguardando laboratório: </span>
                {MOTIVO_RESTRICAO_LEITE_LABELS[
                  contexto.restricao_leite_ativa.motivo as MotivoRestricaoLeite
                ] ?? contexto.restricao_leite_ativa.motivo}
              </p>
            </div>
          ) : null}
          {contexto.animal.status_reprodutivo ? (
            <p>
              <span className="text-muted-foreground">
                {contexto.fora_do_rebanho
                  ? "Estado reprodutivo ao sair: "
                  : "Reprodução: "}
              </span>
              {getStatusReprodutivoLabel(contexto.animal.status_reprodutivo)}
            </p>
          ) : null}
          {gestacaoLinha ? (
            <p className="break-words">
              <span className="text-muted-foreground">Gestação: </span>
              {gestacaoLinha}
            </p>
          ) : null}
          {contexto.lactacao_ativa ? (
            <p className="flex items-center gap-2 flex-wrap">
              <Milk className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              <span>
                Lactação #{contexto.lactacao_ativa.numero_lactacao} desde{" "}
                {formatDatePtBr(contexto.lactacao_ativa.data_inicio)}
              </span>
            </p>
          ) : null}
          {producaoLinha ? (
            <p className="break-words text-muted-foreground">{producaoLinha}</p>
          ) : null}
        </CardContent>
      </Card>

      {showProximasAcoes && contexto.proximas_acoes?.length ? (
        <AnimalProximasAcoesCta
          acoes={contexto.proximas_acoes}
          foraDoRebanho={contexto.fora_do_rebanho}
        />
      ) : null}
    </div>
  );
}
