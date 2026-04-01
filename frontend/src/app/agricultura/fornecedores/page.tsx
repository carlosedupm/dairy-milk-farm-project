"use client";

import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listFornecedoresByFazenda } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BackLink } from "@/components/layout/BackLink";
import { Plus, Truck } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

function FornecedoresContent() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["fornecedores", fazendaId],
    queryFn: () => listFornecedoresByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Selecione uma fazenda para ver os fornecedores.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href="/agricultura">Voltar</BackLink>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Fornecedores – {fazendaAtiva.nome}
          </CardTitle>
          <Button asChild>
            <Link href="/agricultura/fornecedores/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="text-destructive">
              {getApiErrorMessage(error, "Erro ao carregar fornecedores.")}
            </p>
          )}
          {!isLoading && !error && items.length === 0 && (
            <p className="text-muted-foreground">Nenhum fornecedor cadastrado.</p>
          )}
          {!isLoading && !error && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((f, index) => {
                // Suporta id, ID ou fornecedor_id (diferentes formatos de API)
                const rawId =
                  f?.id ??
                  (f as { ID?: number | string })?.ID ??
                  (f as { fornecedor_id?: number | string })?.fornecedor_id;
                const fornecedorId =
                  rawId != null && String(rawId).trim() !== ""
                    ? Number(rawId)
                    : NaN;
                const hasValidId = !Number.isNaN(fornecedorId) && fornecedorId > 0;
                return (
                  <li key={hasValidId ? fornecedorId : `f-${index}`} className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">{f.nome}</span>
                    <span className="text-muted-foreground text-sm">{f.tipo}</span>
                    {hasValidId ? (
                      <div className="flex gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/agricultura/fornecedores/${fornecedorId}`}>Ver</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/agricultura/fornecedores/${fornecedorId}/editar`}>Editar</Link>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function FornecedoresPage() {
  return (
    <ProtectedRoute>
      <FornecedoresContent />
    </ProtectedRoute>
  );
}
