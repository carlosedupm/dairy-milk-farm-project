"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFornecedor } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function NovoFornecedorContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("COOPERATIVA");
  const [contato, setContato] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createFornecedor(fazendaAtiva!.id, {
        nome,
        tipo,
        contato: contato || undefined,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores", fazendaAtiva?.id] });
      router.push("/agricultura/fornecedores");
    },
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Selecione uma fazenda.</p>
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/agricultura/fornecedores">Voltar aos fornecedores</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Novo fornecedor (cooperativa)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Cooperativa XYZ" />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COOPERATIVA">Cooperativa</SelectItem>
                <SelectItem value="REVENDA">Revenda</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="contato">Contato (opcional)</Label>
            <Input id="contato" value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Telefone ou e-mail" />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!nome.trim() || createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Criar fornecedor"}
          </Button>
          {createMutation.isError && (
            <p className="text-destructive text-sm">{getApiErrorMessage(createMutation.error, "Erro ao criar fornecedor.")}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovoFornecedorPage() {
  return (
    <ProtectedRoute>
      <NovoFornecedorContent />
    </ProtectedRoute>
  );
}
