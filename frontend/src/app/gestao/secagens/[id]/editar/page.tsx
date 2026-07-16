"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { get, type Secagem } from "@/services/secagens";
import { get as getAnimal } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { Label } from "@/components/ui/label";
import { formatDatePtBr } from "@/lib/format";

function SecagemDetalheFields({ secagem }: { secagem: Secagem }) {
  const { data: animal, isLoading } = useQuery({
    queryKey: ["animais", secagem.animal_id],
    queryFn: () => getAnimal(secagem.animal_id),
    enabled: secagem.animal_id > 0,
  });

  const animalLabel = isLoading
    ? "Carregando…"
    : animal?.identificacao ?? `Animal #${secagem.animal_id}`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Animal</Label>
        <p className="text-sm font-medium">
          <Link
            href={`/animais/${secagem.animal_id}?tab=ciclo`}
            className="text-primary hover:underline"
          >
            {animalLabel}
          </Link>
        </p>
      </div>
      <div className="space-y-1">
        <Label>Data da secagem</Label>
        <p className="text-sm">{formatDatePtBr(secagem.data_secagem)}</p>
      </div>
    </div>
  );
}

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: secagem, isLoading } = useQuery({
    queryKey: ["secagem", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/secagens">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/secagens">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (!secagem || secagem.fazenda_id !== fazendaAtiva.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/secagens">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoFormLayout
      title="Detalhe da secagem"
      backHref="/gestao/secagens"
      onSubmit={() => undefined}
      hideSubmit
    >
      <p className="text-sm text-muted-foreground">
        Visualização do registo — edição de secagem ainda não está disponível nesta
        tela.
      </p>
      <SecagemDetalheFields secagem={secagem} />
    </GestaoFormLayout>
  );
}

export default function EditarSecagemPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
