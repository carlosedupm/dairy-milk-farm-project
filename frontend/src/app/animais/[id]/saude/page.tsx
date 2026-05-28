"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { Button } from "@/components/ui/button";
import { AnimalSaudeList } from "@/components/animais/AnimalSaudeList";
import { ListPaginationBar } from "@/components/ui/pagination";
import { useAuth } from "@/contexts/AuthContext";
import { canCriarRegistroSaude } from "@/config/appAccess";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";
import {
  animalSaudeListQueryKey,
  listByAnimal,
} from "@/services/animalSaude";
import { Plus } from "lucide-react";

const PAGE_SIZE = 20;

function SaudeListContent() {
  const params = useParams();
  const animalId = Number(params.id);
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);

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
    data: allItems = [],
    isLoading: loadingList,
    error: listError,
  } = useQuery({
    queryKey: animalSaudeListQueryKey(animalId),
    queryFn: () => listByAnimal(animalId),
    enabled: !Number.isNaN(animalId) && animalId > 0,
  });

  const pageItems = useMemo(() => {
    return allItems.slice(offset, offset + PAGE_SIZE);
  }, [allItems, offset]);

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

  const foraDoRebanho = isAnimalForaDoRebanho(animal);
  const showNovo = canCriarRegistroSaude(user?.perfil) && !foraDoRebanho;

  return (
    <PageContainer variant="default">
      <PageBreadcrumb
        items={[
          { label: "Animais", href: "/animais" },
          { label: animal.identificacao, href: `/animais/${animalId}` },
          { label: "Saúde" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Saúde do animal {animal.identificacao}
        </h1>
        {showNovo ? (
          <Button asChild className="min-h-[44px] shrink-0">
            <Link href={`/animais/${animalId}/saude/novo`}>
              <Plus className="mr-2 h-4 w-4" />
              Novo registro
            </Link>
          </Button>
        ) : null}
      </div>

      {foraDoRebanho ? (
        <p className="text-muted-foreground text-sm">
          Animal fora do rebanho — não é possível registar novos casos de saúde.
        </p>
      ) : null}

      <QueryListContent
        isLoading={loadingList}
        error={listError}
        errorFallback="Erro ao carregar registos."
      >
        <div className="space-y-4">
          <AnimalSaudeList
            animalId={animalId}
            items={pageItems}
            perfil={user?.perfil}
          />
          {allItems.length > 0 ? (
            <ListPaginationBar
              total={allItems.length}
              pageSize={PAGE_SIZE}
              offset={offset}
              onOffsetChange={setOffset}
            />
          ) : null}
        </div>
      </QueryListContent>
    </PageContainer>
  );
}

export default function AnimalSaudePage() {
  return (
    <ProtectedRoute>
      <SaudeListContent />
    </ProtectedRoute>
  );
}
