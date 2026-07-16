"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { get, type DiagnosticoGestacao } from "@/services/toques";
import { get as getAnimal } from "@/services/animais";
import { get as getCobertura } from "@/services/coberturas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { Label } from "@/components/ui/label";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/format";
import {
  classificacaoLabel,
  formatDiasGestacao,
  METODOS_DIAGNOSTICO,
} from "@/lib/toquesUtils";

function metodoLabel(metodo: string | null | undefined): string {
  if (!metodo) return "—";
  const found = METODOS_DIAGNOSTICO.find((m) => m.value === metodo);
  return found?.label ?? metodo;
}

function ToqueDetalheFields({ toque }: { toque: DiagnosticoGestacao }) {
  const { data: animal, isLoading: loadingAnimal } = useQuery({
    queryKey: ["animais", toque.animal_id],
    queryFn: () => getAnimal(toque.animal_id),
    enabled: toque.animal_id > 0,
  });

  const coberturaId = toque.cobertura_id ?? 0;
  const { data: cobertura, isLoading: loadingCobertura } = useQuery({
    queryKey: ["cobertura", coberturaId],
    queryFn: () => getCobertura(coberturaId),
    enabled: coberturaId > 0,
  });

  const animalLabel = loadingAnimal
    ? "Carregando…"
    : animal?.identificacao ?? `Animal #${toque.animal_id}`;

  const diagnostico =
    classificacaoLabel(toque.classificacao_operacional) ||
    toque.resultado ||
    "—";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Animal</Label>
        <p className="text-sm font-medium">
          <Link
            href={`/animais/${toque.animal_id}?tab=ciclo`}
            className="text-primary hover:underline"
          >
            {animalLabel}
          </Link>
        </p>
      </div>
      <div className="space-y-1">
        <Label>Data e hora</Label>
        <p className="text-sm">{formatDateTimePtBr(toque.data)}</p>
      </div>
      <div className="space-y-1">
        <Label>Diagnóstico</Label>
        <p className="text-sm font-medium">{diagnostico}</p>
      </div>
      {toque.resultado ? (
        <div className="space-y-1">
          <Label>Resultado canónico</Label>
          <p className="text-sm">{toque.resultado}</p>
        </div>
      ) : null}
      {toque.dias_gestacao_estimados != null ? (
        <div className="space-y-1">
          <Label>Idade gestacional</Label>
          <p className="text-sm">
            {formatDiasGestacao(toque.dias_gestacao_estimados) ||
              `${toque.dias_gestacao_estimados} dias`}
          </p>
        </div>
      ) : null}
      {coberturaId > 0 ? (
        <div className="space-y-1">
          <Label>Cobertura vinculada</Label>
          <p className="text-sm">
            {loadingCobertura ? (
              "Carregando…"
            ) : cobertura ? (
              <Link
                href={`/gestao/coberturas/${cobertura.id}/editar`}
                className="text-primary hover:underline"
              >
                {formatDatePtBr(cobertura.data)} — {cobertura.tipo}
              </Link>
            ) : (
              <Link
                href={`/gestao/coberturas/${coberturaId}/editar`}
                className="text-primary hover:underline"
              >
                Cobertura #{coberturaId}
              </Link>
            )}
          </p>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label>Método</Label>
        <p className="text-sm">{metodoLabel(toque.metodo)}</p>
      </div>
      <div className="space-y-1">
        <Label>Veterinário</Label>
        <p className="text-sm">{toque.veterinario?.trim() || "—"}</p>
      </div>
      <div className="space-y-1">
        <Label>Observações</Label>
        <p className="text-sm whitespace-pre-wrap break-words">
          {toque.observacoes?.trim() || "—"}
        </p>
      </div>
    </div>
  );
}

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: toque, isLoading } = useQuery({
    queryKey: ["toque", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/toques">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/toques">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (!toque || toque.fazenda_id !== fazendaAtiva.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/toques">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoFormLayout
      title="Detalhe do toque"
      backHref="/gestao/toques"
      onSubmit={() => undefined}
      hideSubmit
    >
      <p className="text-sm text-muted-foreground">
        Visualização do registo — edição de toque ainda não está disponível nesta
        tela.
      </p>
      <ToqueDetalheFields toque={toque} />
    </GestaoFormLayout>
  );
}

export default function EditarToquePage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
