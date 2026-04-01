"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafraCultura, createCusto, listFornecedoresByFazenda } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function NovoCustoContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fazendaAtiva } = useFazendaAtiva();
  const safraCulturaId = Number(params.id);

  const [tipo, setTipo] = useState("INSUMO");
  const [subcategoria, setSubcategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("");
  const [fornecedorId, setFornecedorId] = useState<string>("");

  const { data: sc } = useQuery({
    queryKey: ["safras-culturas", safraCulturaId],
    queryFn: () => getSafraCultura(safraCulturaId),
    enabled: !Number.isNaN(safraCulturaId),
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores", fazendaAtiva?.id],
    queryFn: () => listFornecedoresByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCusto(safraCulturaId, {
        tipo,
        subcategoria: subcategoria || undefined,
        descricao: descricao || undefined,
        valor: parseFloat(valor),
        data,
        quantidade: quantidade ? parseFloat(quantidade) : undefined,
        unidade: unidade || undefined,
        fornecedor_id: fornecedorId ? Number(fornecedorId) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custos", safraCulturaId] });
      queryClient.invalidateQueries({ queryKey: ["safras-culturas", sc?.area_id, sc?.ano] });
      router.push(`/agricultura/safras-culturas/${safraCulturaId}`);
    },
  });

  const handleSubmit = () => createMutation.mutate();

  const valorNum = parseFloat(valor);
  const isValid = valor && !isNaN(valorNum) && valorNum >= 0;

  if (Number.isNaN(safraCulturaId)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href={`/agricultura/safras-culturas/${safraCulturaId}`}>Voltar à safra/cultura</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Registrar custo – {sc?.cultura} {sc?.ano}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSUMO">Insumo</SelectItem>
                <SelectItem value="SERVICO_PROPRIO">Serviço próprio</SelectItem>
                <SelectItem value="SERVICO_TERCEIRO">Serviço terceirizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subcategoria">Subcategoria (opcional)</Label>
            <Input id="subcategoria" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} placeholder="Ex: semente, fertilizante, colheita" />
          </div>
          {tipo === "INSUMO" && fornecedores.length > 0 && (
            <div>
              <Label htmlFor="fornecedor">Fornecedor (opcional)</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger id="fornecedor">
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Nenhum —</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="valor">Valor *</Label>
            <Input id="valor" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="data">Data *</Label>
            <DatePicker
              id="data"
              value={data}
              onChange={setData}
              placeholder="Data do custo"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quantidade">Quantidade (opcional)</Label>
              <Input id="quantidade" type="number" step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="unidade">Unidade (opcional)</Label>
              <Input id="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="KG, HA, L" />
            </div>
          </div>
          <div>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Registrar custo"}
          </Button>
          {createMutation.isError && (
            <p className="text-destructive text-sm">{getApiErrorMessage(createMutation.error, "Erro ao registrar custo.")}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovoCustoPage() {
  return (
    <ProtectedRoute>
      <NovoCustoContent />
    </ProtectedRoute>
  );
}
