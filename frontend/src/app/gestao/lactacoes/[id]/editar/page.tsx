"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { get, type Lactacao } from "@/services/lactacoes";
import { get as getAnimal } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { Label } from "@/components/ui/label";
import { formatDatePtBr } from "@/lib/format";

function LactacaoDetalheFields({ lactacao }: { lactacao: Lactacao }) {
  const { data: animal, isLoading } = useQuery({
    queryKey: ["animais", lactacao.animal_id],
    queryFn: () => getAnimal(lactacao.animal_id),
    enabled: lactacao.animal_id > 0,
  });

  const animalLabel = isLoading
    ? "Carregando…"
    : animal?.identificacao ?? `Animal #${lactacao.animal_id}`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Animal</Label>
        <p className="text-sm font-medium">
          <Link
            href={`/animais/${lactacao.animal_id}?tab=ciclo`}
            className="text-primary hover:underline"
          >
            {animalLabel}
          </Link>
        </p>
      </div>
      <div className="space-y-1">
        <Label>Número da lactação</Label>
        <p className="text-sm">{lactacao.numero_lactacao}</p>
      </div>
      <div className="space-y-1">
        <Label>Data de início</Label>
        <p className="text-sm">{formatDatePtBr(lactacao.data_inicio)}</p>
      </div>
      {lactacao.data_fim ? (
        <div className="space-y-1">
          <Label>Data de fim</Label>
          <p className="text-sm">{formatDatePtBr(lactacao.data_fim)}</p>
        </div>
      ) : null}
    </div>
  );
}

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: lactacao, isLoading } = useQuery({
    queryKey: ["lactacao", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/lactacoes">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/lactacoes">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (!lactacao || lactacao.fazenda_id !== fazendaAtiva.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/lactacoes">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoFormLayout
      title="Detalhe da lactação"
      backHref="/gestao/lactacoes"
      onSubmit={() => undefined}
      hideSubmit
    >
      <p className="text-sm text-muted-foreground">
        Visualização do registo — edição de lactação ainda não está disponível nesta
        tela.
      </p>
      <LactacaoDetalheFields lactacao={lactacao} />
    </GestaoFormLayout>
  );
}

export default function EditarLactacaoPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
