"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFornecedor, updateFornecedor } from "@/services/agricultura";
import type { FornecedorUpdate } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function EditarFornecedorContent() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id ? parseInt(String(params.id), 10) : NaN;

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("COOPERATIVA");
  const [contato, setContato] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  const { data: fornecedor, isLoading, error } = useQuery({
    queryKey: ["fornecedores", id],
    queryFn: () => getFornecedor(id),
    enabled: !Number.isNaN(id),
  });

  useEffect(() => {
    if (fornecedor) {
      setNome(fornecedor.nome);
      setTipo(fornecedor.tipo);
      setContato(fornecedor.contato ?? "");
      setObservacoes(fornecedor.observacoes ?? "");
      setAtivo(fornecedor.ativo);
    }
  }, [fornecedor]);

  const updateMutation = useMutation({
    mutationFn: (p: FornecedorUpdate) => updateFornecedor(id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      router.push(`/agricultura/fornecedores/${id}`);
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate({ nome, tipo, contato: contato || undefined, observacoes: observacoes || undefined, ativo });
  };

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
      <BackLink href={`/agricultura/fornecedores/${id}`}>Voltar ao fornecedor</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Editar fornecedor</CardTitle>
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
          <div>
            <Label htmlFor="ativo">Ativo</Label>
            <Select value={ativo ? "true" : "false"} onValueChange={(v) => setAtivo(v === "true")}>
              <SelectTrigger id="ativo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={!(nome ?? "").trim() || updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
          {updateMutation.isError && (
            <p className="text-destructive text-sm">{getApiErrorMessage(updateMutation.error, "Erro ao atualizar fornecedor.")}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function EditarFornecedorPage() {
  return (
    <ProtectedRoute>
      <EditarFornecedorContent />
    </ProtectedRoute>
  );
}
