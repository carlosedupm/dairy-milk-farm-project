"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { create } from "@/services/fazendas";
import type { FazendaCreate } from "@/services/fazendas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { FazendaForm } from "@/components/fazendas/FazendaForm";
import { Button } from "@/components/ui/button";

function NovaFazendaContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (p: FazendaCreate) => create(p),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fazendas"] });
      router.push("/fazendas");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/fazendas">← Voltar</Link>
          </Button>
        </div>
        <FazendaForm
          onSubmit={async (p) => {
            await mutation.mutateAsync(p);
          }}
          isPending={mutation.isPending}
          submitLabel="Criar"
        />
      </main>
    </div>
  );
}

export default function NovaFazendaPage() {
  return (
    <ProtectedRoute>
      <NovaFazendaContent />
    </ProtectedRoute>
  );
}
