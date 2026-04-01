"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getArea, createAnaliseSolo } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";

function NovaAnaliseSoloContent() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const areaId = params?.id ? parseInt(String(params.id), 10) : NaN;

  const [dataColeta, setDataColeta] = useState("");
  const [dataResultado, setDataResultado] = useState("");
  const [ph, setPh] = useState("");
  const [fosforoP, setFosforoP] = useState("");
  const [potassioK, setPotassioK] = useState("");
  const [materiaOrganica, setMateriaOrganica] = useState("");
  const [recomendacoes, setRecomendacoes] = useState("");
  const [laboratorio, setLaboratorio] = useState("");

  const { data: area } = useQuery({
    queryKey: ["areas", areaId],
    queryFn: () => getArea(areaId),
    enabled: !Number.isNaN(areaId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAnaliseSolo(areaId, {
        data_coleta: dataColeta,
        data_resultado: dataResultado || undefined,
        ph: ph ? parseFloat(ph) : undefined,
        fosforo_p: fosforoP || undefined,
        potassio_k: potassioK || undefined,
        materia_organica: materiaOrganica || undefined,
        recomendacoes: recomendacoes || undefined,
        laboratorio: laboratorio || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analises-solo", areaId] });
      router.push(`/agricultura/areas/${areaId}/analises-solo`);
    },
  });

  if (!params?.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (Number.isNaN(areaId) || areaId <= 0) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href={`/agricultura/areas/${areaId}/analises-solo`}>Voltar às análises</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nova análise de solo – {area?.nome ?? "Área"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="data_coleta">Data da coleta *</Label>
            <DatePicker
              id="data_coleta"
              value={dataColeta || undefined}
              onChange={setDataColeta}
              placeholder="Data da coleta"
            />
          </div>
          <div>
            <Label htmlFor="data_resultado">Data do resultado (opcional)</Label>
            <DatePicker
              id="data_resultado"
              value={dataResultado || undefined}
              onChange={setDataResultado}
              placeholder="Data do resultado"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ph">pH (opcional)</Label>
              <Input id="ph" type="number" step="0.1" value={ph} onChange={(e) => setPh(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fosforo_p">Fósforo P (opcional)</Label>
              <Input id="fosforo_p" value={fosforoP} onChange={(e) => setFosforoP(e.target.value)} placeholder="Ex: 12 mg/dm³" />
            </div>
            <div>
              <Label htmlFor="potassio_k">Potássio K (opcional)</Label>
              <Input id="potassio_k" value={potassioK} onChange={(e) => setPotassioK(e.target.value)} placeholder="Ex: 120 mg/dm³" />
            </div>
            <div>
              <Label htmlFor="materia_organica">Matéria orgânica (opcional)</Label>
              <Input id="materia_organica" value={materiaOrganica} onChange={(e) => setMateriaOrganica(e.target.value)} placeholder="Ex: 3,5%" />
            </div>
          </div>
          <div>
            <Label htmlFor="laboratorio">Laboratório (opcional)</Label>
            <Input id="laboratorio" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="recomendacoes">Recomendações (opcional)</Label>
            <Textarea id="recomendacoes" value={recomendacoes} onChange={(e) => setRecomendacoes(e.target.value)} rows={3} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!dataColeta || createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Registrar análise"}
          </Button>
          {createMutation.isError && (
            <p className="text-destructive text-sm">{getApiErrorMessage(createMutation.error, "Erro ao registrar análise.")}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovaAnaliseSoloPage() {
  return (
    <ProtectedRoute>
      <NovaAnaliseSoloContent />
    </ProtectedRoute>
  );
}
