"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IntegracaoCliente } from "@/services/integracoes";
import {
  updateIntegracao,
  rotacionarChaveIntegracao,
  revogarIntegracao,
  INTEGRATION_SCOPES,
} from "@/services/integracoes";
import type { Fazenda } from "@/services/fazendas";
import { ApiKeyRevealDialog } from "@/components/admin/ApiKeyRevealDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/errors";

type Props = {
  cliente: IntegracaoCliente;
  fazendas: Fazenda[];
  onRevoked: () => void;
};

export function IntegracaoEditForm({ cliente, fazendas, onRevoked }: Props) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(cliente.nome);
  const [fazendaIds, setFazendaIds] = useState<number[]>(cliente.fazenda_ids ?? []);
  const [scopes, setScopes] = useState<string[]>(cliente.scopes ?? []);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateIntegracao(cliente.id, {
        nome: nome.trim(),
        fazenda_ids: fazendaIds,
        scopes,
      }),
    onSuccess: () => {
      setMsg("Alterações guardadas.");
      queryClient.invalidateQueries({
        queryKey: ["admin", "integracoes", cliente.id],
      });
    },
    onError: (err) =>
      setMsg(getApiErrorMessage(err, "Erro ao guardar alterações.")),
  });

  const rotateMutation = useMutation({
    mutationFn: () => rotacionarChaveIntegracao(cliente.id),
    onSuccess: (res) => {
      setApiKey(res.api_key);
      setShowKeyDialog(true);
      queryClient.invalidateQueries({
        queryKey: ["admin", "integracoes", cliente.id],
      });
    },
    onError: (err) =>
      setMsg(getApiErrorMessage(err, "Erro ao rotacionar chave.")),
  });

  const revokeMutation = useMutation({
    mutationFn: () => revogarIntegracao(cliente.id),
    onSuccess: onRevoked,
    onError: (err) =>
      setMsg(getApiErrorMessage(err, "Erro ao revogar cliente.")),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-edit">Nome</Label>
            <Input
              id="nome-edit"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fazendas</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {fazendas.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={fazendaIds.includes(f.id)}
                    onChange={() =>
                      setFazendaIds((prev) =>
                        prev.includes(f.id)
                          ? prev.filter((x) => x !== f.id)
                          : [...prev, f.id]
                      )
                    }
                    className="rounded border-input min-w-[18px] min-h-[18px]"
                  />
                  <span>{f.nome}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Scopes</Label>
            {INTEGRATION_SCOPES.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scopes.includes(s.id)}
                  onChange={() =>
                    setScopes((prev) =>
                      prev.includes(s.id)
                        ? prev.filter((x) => x !== s.id)
                        : [...prev, s.id]
                    )
                  }
                  className="rounded border-input min-w-[18px] min-h-[18px]"
                />
                <span className="text-sm">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => rotateMutation.mutate()}
              disabled={rotateMutation.isPending || !!cliente.revogado_em}
            >
              Rotacionar chave
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (
                  confirm(
                    "Revogar este cliente? A chave atual deixará de funcionar."
                  )
                ) {
                  revokeMutation.mutate();
                }
              }}
              disabled={revokeMutation.isPending || !!cliente.revogado_em}
            >
              Revogar
            </Button>
          </div>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      <ApiKeyRevealDialog
        open={showKeyDialog}
        onOpenChange={setShowKeyDialog}
        apiKey={apiKey ?? ""}
        title="Nova chave de API"
      />
    </>
  );
}
