"use client";

import Link from "next/link";
import type { ProducaoLactacaoGrupo } from "@/components/animais/producaoPorLactacaoUtils";
import { formatDateTimePtBr } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Props = {
  grupos: ProducaoLactacaoGrupo[];
  fazendaId?: number;
};

function formatLitros(litros: number) {
  return litros.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function AnimalProducaoPorLactacao({ grupos, fazendaId }: Props) {
  if (grupos.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhum registro de produção para este animal.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <Card key={grupo.lactacaoId ?? "legado"}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{grupo.titulo}</CardTitle>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Produção total</dt>
                  <dd className="font-semibold">{formatLitros(grupo.totalLitros)} L</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Média diária</dt>
                  <dd className="font-semibold">
                    {grupo.lactacaoId != null
                      ? `${formatLitros(grupo.mediaDiaria)} L/dia`
                      : `${formatLitros(grupo.mediaDiaria)} L/registro`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Duração</dt>
                  <dd className="font-semibold">
                    {grupo.lactacaoId != null
                      ? `${grupo.duracaoDias} dia(s)`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
            {grupo.lactacaoId != null && fazendaId ? (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link
                  href={`/producao?fazenda_id=${fazendaId}&lactacao_id=${grupo.lactacaoId}`}
                >
                  Ver na listagem
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">Litros</TableHead>
                    <TableHead>Qualidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupo.registros.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDateTimePtBr(r.data_hora)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatLitros(r.quantidade)} L
                      </TableCell>
                      <TableCell>
                        {r.qualidade ? (
                          <Badge variant="outline">{r.qualidade}/10</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
