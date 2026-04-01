"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafraCultura, createProducao } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function NovaProducaoContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const safraCulturaId = Number(params.id);

  const [destino, setDestino] = useState("GRAO");
  const [quantidadeKg, setQuantidadeKg] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");

  const { data: sc } = useQuery({
    queryKey: ["safras-culturas", safraCulturaId],
    queryFn: () => getSafraCultura(safraCulturaId),
    enabled: !Number.isNaN(safraCulturaId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProducao(safraCulturaId, {
        destino,
        quantidade_kg: parseFloat(quantidadeKg),
        data,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producoes", safraCulturaId] });
      router.push(`/agricultura/safras-culturas/${safraCulturaId}`);
    },
  });

  const quantidadeNum = parseFloat(quantidadeKg);
  const isValid = quantidadeKg && !isNaN(quantidadeNum) && quantidadeNum > 0;

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
          <CardTitle>Registrar produção – {sc?.cultura} {sc?.ano}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="destino">Destino *</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger id="destino">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SILAGEM">Silagem (alimentação rebanho)</SelectItem>
                <SelectItem value="GRAO">Grão (para venda)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantidade_kg">Quantidade (kg) *</Label>
            <Input id="quantidade_kg" type="number" step="0.01" min="0.01" value={quantidadeKg} onChange={(e) => setQuantidadeKg(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="data">Data *</Label>
            <DatePicker id="data" value={data} onChange={setData} placeholder="Data da produção" />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Registrar produção"}
          </Button>
          {createMutation.isError && (
            <p className="text-destructive text-sm">{getApiErrorMessage(createMutation.error, "Erro ao registrar produção.")}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovaProducaoPage() {
  return (
    <ProtectedRoute>
      <NovaProducaoContent />
    </ProtectedRoute>
  );
}
