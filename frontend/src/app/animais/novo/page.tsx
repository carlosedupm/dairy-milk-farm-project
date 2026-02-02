"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/animais";
import type { AnimalCreate } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalForm } from "@/components/animais/AnimalForm";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";

function NovoAnimalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isSingleFazenda, fazendaUnica } = useMinhasFazendas();

  // Pré-seleção: fazenda única do perfil ou query param ?fazenda_id=X
  const defaultFazendaId =
    isSingleFazenda && fazendaUnica
      ? fazendaUnica.id
      : searchParams.get("fazenda_id")
      ? Number(searchParams.get("fazenda_id"))
      : undefined;

  const mutation = useMutation({
    mutationFn: (p: AnimalCreate) => create(p),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["animais"] });
      if (data?.fazenda_id) {
        await queryClient.invalidateQueries({
          queryKey: ["fazendas", data.fazenda_id, "animais"],
        });
      }
      router.push("/animais");
    },
  });

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/animais" />
      </div>
      <AnimalForm
        onSubmit={async (p) => {
          await mutation.mutateAsync(p);
        }}
        isPending={mutation.isPending}
        submitLabel="Criar"
        defaultFazendaId={defaultFazendaId}
        fazendaUnicaId={
          isSingleFazenda && fazendaUnica ? fazendaUnica.id : undefined
        }
      />
    </PageContainer>
  );
}

export default function NovoAnimalPage() {
  return (
    <ProtectedRoute>
      <NovoAnimalContent />
    </ProtectedRoute>
  );
}
