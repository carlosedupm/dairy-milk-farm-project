"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { get, type Gestacao } from "@/services/gestacoes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { Label } from "@/components/ui/label";
import { formatDatePtBr } from "@/lib/format";

function GestacaoDetalheFields({ gestacao }: { gestacao: Gestacao }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Animal</Label>
        <p className="text-sm">
          <Link
            href={`/animais/${gestacao.animal_id}?tab=ciclo`}
            className="text-primary hover:underline"
          >
            Abrir ficha do animal #{gestacao.animal_id}
          </Link>
        </p>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <p className="text-sm font-medium">{gestacao.status}</p>
      </div>
      <div className="space-y-1">
        <Label>Data de confirmação</Label>
        <p className="text-sm">{formatDatePtBr(gestacao.data_confirmacao)}</p>
      </div>
      <div className="space-y-1">
        <Label>Parto previsto</Label>
        <p className="text-sm">
          {gestacao.data_prevista_parto
            ? formatDatePtBr(gestacao.data_prevista_parto)
            : "—"}
        </p>
      </div>
      <div className="space-y-1">
        <Label>Cobertura vinculada</Label>
        <p className="text-sm">
          <Link
            href={`/gestao/coberturas/${gestacao.cobertura_id}/editar`}
            className="text-primary hover:underline"
          >
            Cobertura #{gestacao.cobertura_id}
          </Link>
        </p>
      </div>
    </div>
  );
}

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: gestacao, isLoading } = useQuery({
    queryKey: ["gestacao", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/gestacoes">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/gestacoes">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (!gestacao || gestacao.fazenda_id !== fazendaAtiva.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/gestacoes">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoFormLayout
      title="Detalhe da gestação"
      backHref="/gestao/gestacoes"
      onSubmit={() => undefined}
      hideSubmit
    >
      <p className="text-sm text-muted-foreground">
        Visualização do registo — gestação é gerada pelo ciclo (toque prenhe).
      </p>
      <GestacaoDetalheFields gestacao={gestacao} />
    </GestaoFormLayout>
  );
}

export default function EditarGestacaoPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
