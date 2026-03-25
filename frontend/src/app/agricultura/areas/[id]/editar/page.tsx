"use client";

import { useMemo, useState } from "react";
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

  const [draft, setDraft] = useState({
    nome: "",
    hectares: "",
    descricao: "",
  });
  const [dirty, setDirty] = useState(false);

  const { data: area, isLoading, error } = useQuery({
    queryKey: ["areas", id],
    queryFn: () => getArea(id),
    enabled: !Number.isNaN(id),
  });

  const initialForm = useMemo(
    () => ({
      nome: area?.nome ?? "",
      hectares: area ? String(area.hectares) : "",
      descricao: area?.descricao ?? "",
    }),
    [area]
  );

  const form = dirty ? draft : initialForm;

  const updateMutation = useMutation({
    mutationFn: (p: AreaUpdate) => updateArea(id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      router.push(`/agricultura/areas/${id}`);
    },
  });

  const hectaresNum = parseFloat(form.hectares);
  const isValid = form.nome.trim() && !isNaN(hectaresNum) && hectaresNum > 0;

  const handleSubmit = () => {
    updateMutation.mutate({
      nome: form.nome,
      hectares: hectaresNum,
      descricao: form.descricao || undefined,
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
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), nome: e.target.value }));
              }}
              placeholder="Ex: Talhão Norte"
            />
          </div>
          <div>
            <Label htmlFor="hectares">Hectares</Label>
            <Input
              id="hectares"
              type="number"
              step="0.01"
              min="0.01"
              value={form.hectares}
              onChange={(e) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), hectares: e.target.value }));
              }}
              placeholder="Ex: 10,5"
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), descricao: e.target.value }));
              }}
            />
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
