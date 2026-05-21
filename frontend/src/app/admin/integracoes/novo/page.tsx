"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createIntegracao, INTEGRATION_SCOPES } from "@/services/integracoes";
import { list as listFazendas } from "@/services/fazendas";
import { RequireAdminRoute } from "@/components/layout/RequireAdminRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { ApiKeyRevealDialog } from "@/components/admin/ApiKeyRevealDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/errors";

function AdminIntegracaoNovoContent() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [fazendaIds, setFazendaIds] = useState<number[]>([]);
  const [scopes, setScopes] = useState<string[]>([
    "animais:read",
    "toques:write",
    "coberturas:read",
  ]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: fazendas = [] } = useQuery({
    queryKey: ["fazendas", "admin-all"],
    queryFn: listFazendas,
  });

  const mutation = useMutation({
    mutationFn: createIntegracao,
    onSuccess: (res) => {
      setApiKey(res.api_key);
      setShowKeyDialog(true);
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  function toggleFazenda(id: number) {
    setFazendaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!nome.trim()) {
      setFormError("Nome é obrigatório.");
      return;
    }
    if (fazendaIds.length === 0) {
      setFormError("Selecione pelo menos uma fazenda.");
      return;
    }
    if (scopes.length === 0) {
      setFormError("Selecione pelo menos um scope.");
      return;
    }
    mutation.mutate({ nome: nome.trim(), fazenda_ids: fazendaIds, scopes });
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/admin/integracoes">Voltar</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Novo cliente de integração</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sistemas externos ou agentes de IA usam a chave API para registar
            toques e consultar animais, com rastreio em «Registado por».
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do cliente</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Clínica Veterinária ABC"
              />
            </div>

            <div className="space-y-2">
              <Label>Fazendas autorizadas</Label>
              {fazendas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma fazenda cadastrada.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {fazendas.map((f) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`faz-${f.id}`}
                        checked={fazendaIds.includes(f.id)}
                        onChange={() => toggleFazenda(f.id)}
                        className="rounded border-input min-w-[18px] min-h-[18px]"
                      />
                      <Label htmlFor={`faz-${f.id}`} className="cursor-pointer">
                        {f.nome}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Permissões (scopes)</Label>
              <div className="space-y-2">
                {INTEGRATION_SCOPES.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`scope-${s.id}`}
                      checked={scopes.includes(s.id)}
                      onChange={() => toggleScope(s.id)}
                      className="rounded border-input min-w-[18px] min-h-[18px]"
                    />
                    <Label htmlFor={`scope-${s.id}`} className="cursor-pointer">
                      {s.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "A criar…" : "Criar cliente"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ApiKeyRevealDialog
        open={showKeyDialog}
        onOpenChange={(open) => {
          setShowKeyDialog(open);
          if (!open && apiKey) {
            router.push("/admin/integracoes");
          }
        }}
        apiKey={apiKey ?? ""}
      />
    </PageContainer>
  );
}

export default function AdminIntegracaoNovoPage() {
  return (
    <RequireAdminRoute>
      <AdminIntegracaoNovoContent />
    </RequireAdminRoute>
  );
}
