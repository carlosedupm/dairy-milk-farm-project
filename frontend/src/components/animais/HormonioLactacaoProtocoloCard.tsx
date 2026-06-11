"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDatePtBr } from "@/lib/format";
import {
  produtoHormonioLabel,
  type HormonioLactacaoProtocolo,
} from "@/services/animalHormoniosLactacao";

type Props = {
  protocolo: HormonioLactacaoProtocolo | null | undefined;
};

export function HormonioLactacaoProtocoloCard({ protocolo }: Props) {
  if (!protocolo) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Protocolo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nenhum protocolo registrado nesta lactação.
          </p>
        </CardContent>
      </Card>
    );
  }

  const ativo = protocolo.status === "ATIVO";

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Protocolo</CardTitle>
        <Badge variant={ativo ? "default" : "secondary"}>
          {ativo ? "Ativo" : "Encerrado"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Produto referência: </span>
          {produtoHormonioLabel(protocolo.produto)}
        </p>
        <p>
          <span className="text-muted-foreground">Início: </span>
          {formatDatePtBr(protocolo.data_inicio)}
        </p>
        {protocolo.data_prevista_parto ? (
          <p>
            <span className="text-muted-foreground">Parto previsto: </span>
            {formatDatePtBr(protocolo.data_prevista_parto)}
          </p>
        ) : null}
        {protocolo.dias_ate_teto_70 != null && ativo ? (
          <p>
            <span className="text-muted-foreground">Dias até teto 70d: </span>
            {protocolo.dias_ate_teto_70}
          </p>
        ) : null}
        {!ativo && protocolo.motivo_encerramento ? (
          <p>
            <span className="text-muted-foreground">Encerramento: </span>
            {protocolo.motivo_encerramento.replace(/_/g, " ").toLowerCase()}
            {protocolo.data_encerramento
              ? ` (${formatDatePtBr(protocolo.data_encerramento)})`
              : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
