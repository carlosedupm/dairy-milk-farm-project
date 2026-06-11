"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIntegracao } from "@/services/integracoes";
import { list as listFazendas } from "@/services/fazendas";
import { RequireAdminRoute } from "@/components/layout/RequireAdminRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { IntegracaoEditForm } from "@/components/admin/IntegracaoEditForm";
import { ApiKeyRevealDialog } from "@/components/admin/ApiKeyRevealDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTimePtBr } from "@/lib/format";

function AdminIntegracaoDetalheContent({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [keyDialogTitle, setKeyDialogTitle] = useState("Nova chave de API");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "integracoes", id],
    queryFn: () => getIntegracao(id),
  });

  const { data: fazendas = [] } = useQuery({
    queryKey: ["fazendas", "admin-all"],
    queryFn: listFazendas,
  });

  function handleKeyRevealed(key: string, title = "Nova chave de API") {
    setApiKey(key);
    setKeyDialogTitle(title);
    setShowKeyDialog(true);
  }

  function handleKeyDialogChange(open: boolean) {
    setShowKeyDialog(open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ["admin", "integracoes", id] });
    }
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">A carregar…</p>
      </PageContainer>
    );
  }

  if (error || !data?.cliente) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/admin/integracoes">Voltar</BackLink>
        <p className="text-destructive mt-4">Cliente não encontrado.</p>
      </PageContainer>
    );
  }

  const cliente = data.cliente;
  const chamadas = data.chamadas_recentes ?? [];

  return (
    <PageContainer variant="default">
      <BackLink href="/admin/integracoes">Voltar</BackLink>
      <div className="space-y-6 mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
          {cliente.revogado_em ? (
            <Badge variant="destructive">Revogado</Badge>
          ) : cliente.ativo ? (
            <Badge>Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
          <code className="text-xs text-muted-foreground ml-2">
            {cliente.key_prefix}…
          </code>
        </div>

        <IntegracaoEditForm
          key={cliente.id}
          cliente={cliente}
          fazendas={fazendas}
          onKeyRevealed={handleKeyRevealed}
          onRevoked={() => {
            queryClient.invalidateQueries({
              queryKey: ["admin", "integracoes", id],
            });
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Chamadas recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {chamadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma chamada registada ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Caminho</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chamadas.map((ch) => (
                      <TableRow key={ch.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateTimePtBr(ch.created_at)}
                        </TableCell>
                        <TableCell>{ch.method}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {ch.path}
                        </TableCell>
                        <TableCell>{ch.status_code}</TableCell>
                        <TableCell>{ch.duracao_ms}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ApiKeyRevealDialog
        open={showKeyDialog}
        onOpenChange={handleKeyDialogChange}
        apiKey={apiKey ?? ""}
        title={keyDialogTitle}
      />
    </PageContainer>
  );
}

export default function AdminIntegracaoDetalhePage() {
  const params = useParams();
  const id = params?.id ? parseInt(String(params.id), 10) : NaN;

  return (
    <RequireAdminRoute>
      {isNaN(id) ? (
        <PageContainer variant="narrow">
          <p className="text-destructive">ID inválido.</p>
        </PageContainer>
      ) : (
        <AdminIntegracaoDetalheContent id={id} />
      )}
    </RequireAdminRoute>
  );
}
