"use client";

import Link from "next/link";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/format";
import type { AnimalContexto } from "@/services/animais";
import {
  formatGestacaoResumoLinha,
  formatProducaoHistoricoResumo,
  getStatusReprodutivoLabel,
} from "@/components/animais/animalResumoUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Milk, Pill } from "lucide-react";
import {
  MOTIVO_RESTRICAO_LEITE_LABELS,
  type MotivoRestricaoLeite,
} from "@/services/restricoesLeite";
import { useAuth } from "@/contexts/AuthContext";
import { canEditarRegistroSaude } from "@/config/appAccess";

type Props = {
  contexto: AnimalContexto;
};

function timelineTipoLabel(tipo: string): string {
  if (tipo === "SAUDE") return "Saúde";
  return tipo;
}

export function AnimalFichaCiclo({ contexto }: Props) {
  const { user } = useAuth();
  const gestacaoLinha = formatGestacaoResumoLinha(contexto.gestacao_resumo);
  const producaoLinha = formatProducaoHistoricoResumo(contexto.resumo_producao);
  const animalId = contexto.animal.id;
  const canEditSaude = canEditarRegistroSaude(user?.perfil);

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
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 min-w-0">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-600"
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

      {contexto.proximas_acoes && contexto.proximas_acoes.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximas ações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {contexto.proximas_acoes.map((a) => (
              <Button key={a.codigo} variant="secondary" size="sm" asChild>
                <Link href={a.href_path}>{a.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {contexto.timeline && contexto.timeline.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 max-h-[min(24rem,50dvh)] overflow-y-auto min-w-0 pr-1">
              {contexto.timeline.map((item, idx) => {
                const isSaude = item.tipo === "SAUDE";
                const saudeEditHref =
                  isSaude &&
                  item.ref_id != null &&
                  canEditSaude
                    ? `/animais/${animalId}/saude/${item.ref_id}/editar`
                    : null;

                return (
                  <li
                    key={`${item.tipo}-${item.ref_id ?? idx}-${item.data}`}
                    className="border-b border-border pb-3 last:border-0 last:pb-0 min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      {isSaude ? (
                        <Pill
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                      <Badge variant="outline" className="shrink-0">
                        {timelineTipoLabel(item.tipo)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimePtBr(item.data)}
                      </span>
                    </div>
                    {saudeEditHref ? (
                      <Link
                        href={saudeEditHref}
                        className="font-medium break-words hover:underline"
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Registado por {item.registrado_por}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
