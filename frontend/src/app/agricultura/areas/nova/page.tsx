"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createArea } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function NovaAreaContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [hectares, setHectares] = useState("");
  const [descricao, setDescricao] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createArea(fazendaAtiva!.id, {
        nome,
        hectares: parseFloat(hectares) || 0,
        descricao: descricao || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", fazendaAtiva?.id] });
      router.push("/agricultura/areas");
    },
  });

  const hectaresNum = parseFloat(hectares);
  const isValid = nome.trim() && !isNaN(hectaresNum) && hectaresNum > 0;

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Selecione uma fazenda.</p>
        <BackLink href="/agricultura/areas">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/agricultura/areas">Voltar às áreas</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nova área / Talhão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Talhão Norte" />
          </div>
          <div>
            <Label htmlFor="hectares">Hectares</Label>
            <Input
              id="hectares"
              type="number"
              step="0.01"
              min="0.01"
              value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              placeholder="Ex: 10,5"
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Criar área"}
          </Button>
          {createMutation.isError && (
            <p className="text-destructive text-sm">{getApiErrorMessage(createMutation.error, "Erro ao criar área.")}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovaAreaPage() {
  return (
    <ProtectedRoute>
      <NovaAreaContent />
    </ProtectedRoute>
  );
}
