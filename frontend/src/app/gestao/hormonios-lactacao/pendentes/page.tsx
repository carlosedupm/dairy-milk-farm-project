"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { formatDatePtBr } from "@/lib/format";
import {
  hormoniosLactacaoPendentesQueryKey,
  listPendentes,
  produtoHormonioLabel,
  tipoPendenciaLabel,
} from "@/services/animalHormoniosLactacao";
import { animalFichaHormonioLactacaoTabHref } from "@/components/animais/ficha/animalFichaTabs";

function PendentesContent() {
  const { fazendaAtiva, isReady } = useFazendaAtiva();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: hormoniosLactacaoPendentesQueryKey(fazendaAtiva?.id ?? 0),
    queryFn: () => listPendentes(fazendaAtiva!.id),
    enabled: isReady && !!fazendaAtiva,
  });

  if (!isReady || !fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <p className="text-muted-foreground">
          Selecione uma fazenda para ver hormônios pendentes.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <BackLink href="/gestao">Voltar à gestão</BackLink>
      <h1 className="text-2xl font-bold mt-4 mb-2">
        Hormônios de lactação pendentes
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        {fazendaAtiva.nome} — vacas elegíveis com 1ª dose pendente ou dose
        vencida (sem alertas automáticos).
      </p>

      <QueryListContent
        isLoading={isLoading}
        error={error}
        errorFallback="Erro ao carregar pendentes."
      >
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma vaca pendente de aplicação hoje.
          </p>
        ) : (
          <ResponsiveListContainer
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Animal</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Próxima / Parto</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={`${item.animal_id}-${item.tipo_pendencia}`}>
                      <TableCell>{item.animal_identificacao}</TableCell>
                      <TableCell>
                        {tipoPendenciaLabel(item.tipo_pendencia)}
                        {item.produto_ultimo
                          ? ` (${produtoHormonioLabel(item.produto_ultimo)})`
                          : ""}
                      </TableCell>
                      <TableCell>
                        {item.data_proxima_aplicacao
                          ? formatDatePtBr(item.data_proxima_aplicacao)
                          : item.data_prevista_parto
                            ? `Parto ${formatDatePtBr(item.data_prevista_parto)}`
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/animais/${item.animal_id}/hormonios-lactacao/novo`}
                          >
                            Registrar
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
            mobile={items.map((item) => (
              <MobileListCard
                key={`${item.animal_id}-${item.tipo_pendencia}`}
                title={item.animal_identificacao}
                subtitle={tipoPendenciaLabel(item.tipo_pendencia)}
                meta={
                  item.data_proxima_aplicacao
                    ? `Vencida: ${formatDatePtBr(item.data_proxima_aplicacao)}`
                    : undefined
                }
                actions={
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/animais/${item.animal_id}/hormonios-lactacao/novo`}
                    >
                      Registrar
                    </Link>
                  </Button>
                }
              />
            ))}
          />
        )}
      </QueryListContent>
    </PageContainer>
  );
}

export default function HormoniosPendentesPage() {
  return (
    <ProtectedRoute>
      <PendentesContent />
    </ProtectedRoute>
  );
}
