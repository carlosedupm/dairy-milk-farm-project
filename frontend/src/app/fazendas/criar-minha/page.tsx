"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMinhaFazenda } from "@/services/fazendas";
import type { FazendaCreate } from "@/services/fazendas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { FazendaForm } from "@/components/fazendas/FazendaForm";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/auth";

function CriarMinhaFazendaContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mutation = useMutation({
    mutationFn: (p: FazendaCreate) => createMinhaFazenda(p),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", "fazendas"] });
      await queryClient.invalidateQueries({ queryKey: ["fazendas"] });
      await authService.validate();
      window.location.assign("/fazendas");
    },
  });

  if (user?.perfil !== "PROPRIETARIO") {
    return (
      <PageContainer variant="centered">
        <p className="text-muted-foreground text-center">
          Este fluxo é apenas para titulares (perfil <strong>Proprietário</strong>)
          que desejam registar uma nova exploração. Contas com perfil{' '}
          <strong>USER</strong> devem solicitar provisão a um administrador da
          plataforma.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/fazendas" />
      </div>
      <h1 className="text-2xl font-semibold mb-2">Registar nova fazenda</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Ao guardar, a exploração fica vinculada à sua conta como titular
        (Proprietário).
      </p>
      <FazendaForm
        onSubmit={async (p) => {
          await mutation.mutateAsync(p);
        }}
        isPending={mutation.isPending}
        submitLabel="Criar e vincular"
      />
    </PageContainer>
  );
}

export default function CriarMinhaFazendaPage() {
  return (
    <ProtectedRoute>
      <CriarMinhaFazendaContent />
    </ProtectedRoute>
  );
}
