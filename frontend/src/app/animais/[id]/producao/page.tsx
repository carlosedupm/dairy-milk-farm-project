"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { Button } from "@/components/ui/button";
import { AnimalProducaoPorLactacao } from "@/components/animais/AnimalProducaoPorLactacao";
import { buildProducaoGruposPorLactacao } from "@/components/animais/producaoPorLactacaoUtils";
import { useAuth } from "@/contexts/AuthContext";
import { isPathAllowedForPerfil } from "@/config/appAccess";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";
import { listByAnimal } from "@/services/producao";
import { listByFazenda } from "@/services/lactacoes";
import { Plus } from "lucide-react";

function AnimalProducaoContent() {
  const params = useParams();
  const animalId = Number(params.id);
  const { user } = useAuth();

  const {
    data: animal,
    isLoading: loadingAnimal,
    error: animalError,
  } = useQuery({
    queryKey: ["animais", animalId],
    queryFn: () => getAnimal(animalId),
    enabled: !Number.isNaN(animalId) && animalId > 0,
  });

  const {
    data: registros = [],
    isLoading: loadingProducao,
    error: producaoError,
  } = useQuery({
    queryKey: ["producao", "animal", animalId],
    queryFn: () => listByAnimal(animalId),
    enabled: !Number.isNaN(animalId) && animalId > 0,
  });

  const { data: lactacoesFazenda = [] } = useQuery({
    queryKey: ["lactacoes", animal?.fazenda_id],
    queryFn: () => listByFazenda(animal!.fazenda_id),
    enabled: !!animal?.fazenda_id,
  });

  const lactacoesAnimal = useMemo(
    () => lactacoesFazenda.filter((l) => l.animal_id === animalId),
    [lactacoesFazenda, animalId],
  );

  const grupos = useMemo(
    () => buildProducaoGruposPorLactacao(registros, lactacoesAnimal),
    [registros, lactacoesAnimal],
  );

  const canRegistrar =
    user?.perfil &&
    isPathAllowedForPerfil(user.perfil, "/producao/novo") &&
    animal &&
    !isAnimalForaDoRebanho(animal);

  if (Number.isNaN(animalId) || animalId <= 0) {
    return (
      <PageContainer variant="default">
        <p className="text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  if (loadingAnimal || (!animalError && !animal)) {
    return (
      <PageContainer variant="default">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (animalError || !animal) {
    return (
      <PageContainer variant="default">
        <p className="text-destructive">Animal não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <PageBreadcrumb
        items={[
          { label: "Animais", href: "/animais" },
          { label: animal.identificacao ?? `#${animal.id}`, href: `/animais/${animalId}` },
          { label: "Produção por lactação" },
        ]}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Produção por lactação
          </h1>
          <p className="text-sm text-muted-foreground">
            {animal.identificacao ?? `Animal #${animal.id}`}
          </p>
        </div>
        {canRegistrar ? (
          <Button asChild>
            <Link href={`/producao/novo?animal_id=${animalId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar produção
            </Link>
          </Button>
        ) : null}
      </div>

      <QueryListContent
        isLoading={loadingProducao}
        error={producaoError}
        errorFallback="Erro ao carregar produção do animal."
      >
        <AnimalProducaoPorLactacao
          grupos={grupos}
          fazendaId={animal.fazenda_id}
        />
      </QueryListContent>
    </PageContainer>
  );
}

export default function AnimalProducaoPage() {
  return (
    <ProtectedRoute>
      <AnimalProducaoContent />
    </ProtectedRoute>
  );
}
