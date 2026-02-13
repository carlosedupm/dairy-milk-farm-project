"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/lotes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function NovoLoteContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");

  const createMutation = useMutation({
    mutationFn: () => create({ nome, fazenda_id: fazendaAtiva!.id, tipo: tipo || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotes", fazendaAtiva?.id] });
      router.push("/lotes");
    },
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Selecione uma fazenda.</p>
        <BackLink href="/lotes">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/lotes">Voltar aos lotes</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Novo lote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lote 1 - Lactação" />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo (opcional)</Label>
            <Input id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="LACTACAO, SECAS, etc." />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!nome.trim() || createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Criar lote"}
          </Button>
          {createMutation.isError && <p className="text-destructive text-sm">Erro ao criar lote.</p>}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovoLotePage() {
  return (
    <ProtectedRoute>
      <NovoLoteContent />
    </ProtectedRoute>
  );
}
