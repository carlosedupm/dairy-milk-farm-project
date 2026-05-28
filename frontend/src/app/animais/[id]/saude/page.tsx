"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimalSaudeTable } from "@/components/animais/AnimalSaudeTable";
import { useAuth } from "@/contexts/AuthContext";
import { canCriarRegistroSaude } from "@/config/appAccess";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";
import {
  animalSaudeListQueryKey,
  listByAnimal,
} from "@/services/animalSaude";
import { getApiErrorMessage } from "@/lib/errors";
import { Plus, Stethoscope } from "lucide-react";

function SaudeListContent() {
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
    data: items = [],
    isLoading: loadingList,
    error: listError,
  } = useQuery({
    queryKey: animalSaudeListQueryKey(animalId),
    queryFn: () => listByAnimal(animalId),
    enabled: !Number.isNaN(animalId) && animalId > 0,
  });

  if (Number.isNaN(animalId) || animalId <= 0) {
    return (
      <PageContainer variant="default">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/animais">Voltar</BackLink>
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
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  const foraDoRebanho = isAnimalForaDoRebanho(animal);
  const showNovo =
    canCriarRegistroSaude(user?.perfil) && !foraDoRebanho;

  return (
    <PageContainer variant="default">
      <BackLink href={`/animais/${animalId}`}>Voltar à ficha</BackLink>
      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
            <CardTitle>
              Saúde — {animal.identificacao}
            </CardTitle>
          </div>
          {showNovo ? (
            <Button asChild className="min-h-[44px]">
              <Link href={`/animais/${animalId}/saude/novo`}>
                <Plus className="mr-2 h-4 w-4" />
                Novo registro
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {foraDoRebanho ? (
            <p className="text-muted-foreground text-sm mb-4">
              Animal fora do rebanho — não é possível registar novos casos de
              saúde.
            </p>
          ) : null}
          {loadingList && (
            <p className="text-muted-foreground">Carregando registos…</p>
          )}
          {listError && (
            <p className="text-destructive">
              {getApiErrorMessage(listError, "Erro ao carregar registos.")}
            </p>
          )}
          {!loadingList && !listError && (
            <AnimalSaudeTable
              animalId={animalId}
              items={items}
              perfil={user?.perfil}
            />
          )}
        </CardContent>
      </Card>
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
