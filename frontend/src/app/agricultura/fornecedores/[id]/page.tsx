"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getFornecedor } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/BackLink";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Truck, Pencil } from "lucide-react";

function FornecedorDetailContent() {
  const params = useParams<{ id?: string }>();
  const id = params?.id ? parseInt(String(params.id), 10) : NaN;

  const { data: fornecedor, isLoading, error } = useQuery({
    queryKey: ["fornecedores", id],
    queryFn: () => getFornecedor(id),
    enabled: !Number.isNaN(id),
  });

  if (!params?.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (Number.isNaN(id) || id <= 0) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  if (isLoading || (!error && !fornecedor)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (error || !fornecedor) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-destructive">Fornecedor não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/agricultura/fornecedores">Voltar aos fornecedores</BackLink>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            {fornecedor.nome}
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href={`/agricultura/fornecedores/${id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2">
            <div>
              <dt className="text-sm text-muted-foreground">Tipo</dt>
              <dd>{fornecedor.tipo}</dd>
            </div>
            {fornecedor.contato && (
              <div>
                <dt className="text-sm text-muted-foreground">Contato</dt>
                <dd>{fornecedor.contato}</dd>
              </div>
            )}
            {fornecedor.observacoes && (
              <div>
                <dt className="text-sm text-muted-foreground">Observações</dt>
                <dd>{fornecedor.observacoes}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Ativo</dt>
              <dd>{fornecedor.ativo ? "Sim" : "Não"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function FornecedorDetailPage() {
  return (
    <ProtectedRoute>
      <FornecedorDetailContent />
    </ProtectedRoute>
  );
}
