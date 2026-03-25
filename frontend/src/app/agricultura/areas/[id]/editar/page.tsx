"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getArea, updateArea } from "@/services/agricultura";
import type { AreaUpdate } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function EditarAreaContent() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id ? parseInt(String(params.id), 10) : NaN;

  const [nome, setNome] = useState("");
  const [hectares, setHectares] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: area, isLoading, error } = useQuery({
    queryKey: ["areas", id],
    queryFn: () => getArea(id),
    enabled: !Number.isNaN(id),
  });

  useEffect(() => {
    if (area) {
      setNome(area.nome);
      setHectares(String(area.hectares));
      setDescricao(area.descricao ?? "");
    }
  }, [area]);

  const updateMutation = useMutation({
    mutationFn: (p: AreaUpdate) => updateArea(id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      router.push(`/agricultura/areas/${id}`);
    },
  });

  const hectaresNum = parseFloat(hectares);
  const isValid = nome.trim() && !isNaN(hectaresNum) && hectaresNum > 0;

  const handleSubmit = () => {
    updateMutation.mutate({
      nome,
      hectares: hectaresNum,
      descricao: descricao || undefined,
    });
  };

  if (!params?.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (Number.isNaN(id) || id <= 0) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  if (isLoading || (!error && !area)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (error || !area) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">Área não encontrada.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href={`/agricultura/areas/${id}`}>Voltar à área</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Editar área / Talhão</CardTitle>
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
          <Button onClick={handleSubmit} disabled={!isValid || updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
          {updateMutation.isError && (
            <p className="text-destructive text-sm">{getApiErrorMessage(updateMutation.error, "Erro ao atualizar área.")}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function EditarAreaPage() {
  return (
    <ProtectedRoute>
      <EditarAreaContent />
    </ProtectedRoute>
  );
}
