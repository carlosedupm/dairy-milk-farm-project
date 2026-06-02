"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/producao";
import type { ProducaoCreate } from "@/services/producao";
import { invalidateAnimalTimeline } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { ProducaoForm } from "@/components/producao/ProducaoForm";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import { toast } from "@/hooks/use-toast";
import { gestaoNovoSuccessPath } from "@/lib/gestaoNovoUrl";

function NovaProducaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isSingleFazenda, fazendaUnica } = useMinhasFazendas();

  // Pré-seleção: fazenda única do perfil ou query params
  const defaultFazendaId =
    isSingleFazenda && fazendaUnica
      ? fazendaUnica.id
      : searchParams.get("fazenda_id")
      ? Number(searchParams.get("fazenda_id"))
      : undefined;
  const defaultAnimalId = searchParams.get("animal_id")
    ? Number(searchParams.get("animal_id"))
    : undefined;

  const mutation = useMutation({
    mutationFn: (p: ProducaoCreate) => create(p),
    onSuccess: async (_data, variables) => {
      toast.success("Produção registada");
      await queryClient.invalidateQueries({ queryKey: ["producao"] });
      await queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] });
      if (variables.animal_id) {
        await queryClient.invalidateQueries({
          queryKey: ["animais", variables.animal_id, "contexto"],
        });
        invalidateAnimalTimeline(queryClient, variables.animal_id);
      }
      router.push(
        gestaoNovoSuccessPath(
          variables.animal_id ? String(variables.animal_id) : "",
          "/producao",
        ),
      );
    },
  });

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/producao" />
      </div>
      <ProducaoForm
        onSubmit={async (p) => {
          await mutation.mutateAsync(p);
        }}
        isPending={mutation.isPending}
        submitLabel="Registrar"
        defaultFazendaId={defaultFazendaId}
        defaultAnimalId={defaultAnimalId}
        fazendaUnicaId={
          isSingleFazenda && fazendaUnica ? fazendaUnica.id : undefined
        }
      />
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
