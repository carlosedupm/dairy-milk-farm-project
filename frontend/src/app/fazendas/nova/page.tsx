"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/fazendas";
import type { FazendaCreate } from "@/services/fazendas";
import { RequireAdminRoute } from "@/components/layout/RequireAdminRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { FazendaForm } from "@/components/fazendas/FazendaForm";
import { toast } from "@/hooks/use-toast";

function NovaFazendaContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (p: FazendaCreate) => create(p),
    onSuccess: async () => {
      toast.success("Fazenda criada");
      await queryClient.invalidateQueries({ queryKey: ["fazendas"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "fazendas"] });
      router.push("/fazendas");
    },
  });

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/fazendas" />
      </div>
      <FazendaForm
        onSubmit={async (p) => {
          await mutation.mutateAsync(p);
        }}
        isPending={mutation.isPending}
        submitLabel="Criar"
      />
    </PageContainer>
  );
}

export default function NovaFazendaPage() {
  return (
    <RequireAdminRoute>
      <NovaFazendaContent />
    </RequireAdminRoute>
  );
}
