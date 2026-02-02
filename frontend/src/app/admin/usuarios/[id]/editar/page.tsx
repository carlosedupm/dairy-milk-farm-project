"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUsuarios,
  updateUsuario,
  getFazendasByUsuario,
  setFazendasForUsuario,
} from "@/services/admin";
import type { UsuarioUpdate } from "@/services/admin";
import { list as listFazendas } from "@/services/fazendas";
import { RequireAdminRoute } from "@/components/layout/RequireAdminRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { UsuarioForm } from "@/components/admin/UsuarioForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/errors";
import { useState, useMemo } from "react";

function AdminUsuarioEditarContent({ id }: { id: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [fazendasError, setFazendasError] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "usuarios"],
    queryFn: () => listUsuarios({ limit: 200, offset: 0 }),
  });

  const { data: todasFazendas = [] } = useQuery({
    queryKey: ["fazendas"],
    queryFn: listFazendas,
  });

  const { data: fazendasDoUsuario = [] } = useQuery({
    queryKey: ["admin", "usuarios", id, "fazendas"],
    queryFn: () => getFazendasByUsuario(id),
    enabled: !!id,
  });

  const initialIds = useMemo(
    () => fazendasDoUsuario.map((f) => f.id),
    [fazendasDoUsuario]
  );
  const selectedFazendaIds = dirty ? pendingIds : initialIds;

  const usuario = data?.usuarios.find((u) => u.id === id) ?? null;

  const updateMutation = useMutation({
    mutationFn: (payload: UsuarioUpdate) => updateUsuario(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      router.push("/admin/usuarios");
    },
  });

  const saveFazendasMutation = useMutation({
    mutationFn: (fazendaIds: number[]) => setFazendasForUsuario(id, fazendaIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "usuarios", id, "fazendas"],
      });
      queryClient.invalidateQueries({ queryKey: ["me", "fazendas"] });
      setFazendasError("");
      setDirty(false);
    },
    onError: (err: unknown) => {
      setFazendasError(getApiErrorMessage(err, "Erro ao salvar vínculos."));
    },
  });

  const handleSubmit = async (
    payload: UsuarioUpdate & { senha?: string; enabled?: boolean }
  ) => {
    await updateMutation.mutateAsync({
      nome: payload.nome,
      email: payload.email,
      senha: payload.senha,
      perfil: payload.perfil,
      enabled: payload.enabled,
    });
  };

  const handleToggleFazenda = (fazendaId: number) => {
    const currentIds = dirty ? pendingIds : initialIds;
    const nextIds = currentIds.includes(fazendaId)
      ? currentIds.filter((x) => x !== fazendaId)
      : [...currentIds, fazendaId];
    setPendingIds(nextIds);
    setDirty(true);
  };

  const handleSalvarVinculos = () => {
    setFazendasError("");
    saveFazendasMutation.mutate(selectedFazendaIds);
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  if (error || !usuario) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/admin/usuarios">Voltar</BackLink>
        <p className="text-destructive">Usuário não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/admin/usuarios">Voltar</BackLink>
      <div className="space-y-6 mt-4">
        <UsuarioForm
          initial={usuario}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
        />
        <Card>
          <CardHeader>
            <CardTitle>Fazendas vinculadas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecione as fazendas que este usuário pode acessar. Se houver
              apenas uma, o sistema a considerará automaticamente nas telas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {todasFazendas.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhuma fazenda cadastrada.
              </p>
            ) : (
              <div className="space-y-3">
                {todasFazendas.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`fazenda-${f.id}`}
                      checked={selectedFazendaIds.includes(f.id)}
                      onChange={() => handleToggleFazenda(f.id)}
                      className="rounded border-input min-w-[18px] min-h-[18px]"
                    />
                    <Label
                      htmlFor={`fazenda-${f.id}`}
                      className="cursor-pointer flex-1"
                    >
                      {f.nome}
                      {f.localizacao ? ` (${f.localizacao})` : ""}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {fazendasError && (
              <p className="text-sm text-destructive">{fazendasError}</p>
            )}
            <Button
              type="button"
              onClick={handleSalvarVinculos}
              disabled={
                saveFazendasMutation.isPending || todasFazendas.length === 0
              }
            >
              {saveFazendasMutation.isPending ? "Salvando…" : "Salvar vínculos"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function AdminUsuarioEditarPage() {
  const params = useParams();
  const id = params?.id ? parseInt(String(params.id), 10) : NaN;

  if (isNaN(id)) {
    return (
      <RequireAdminRoute>
        <PageContainer variant="narrow">
          <BackLink href="/admin/usuarios">Voltar</BackLink>
          <p className="text-destructive">ID inválido.</p>
        </PageContainer>
      </RequireAdminRoute>
    );
  }

  return (
    <RequireAdminRoute>
      <AdminUsuarioEditarContent id={id} />
    </RequireAdminRoute>
  );
}
