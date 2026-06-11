"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IntegracaoCliente } from "@/services/integracoes";
import {
  updateIntegracao,
  rotacionarChaveIntegracao,
  revogarIntegracao,
  reativarIntegracao,
  INTEGRATION_SCOPES,
} from "@/services/integracoes";
import type { Fazenda } from "@/services/fazendas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { FormFieldError } from "@/components/ui/form-field-error";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { toast } from "@/hooks/use-toast";

type Props = {
  cliente: IntegracaoCliente;
  fazendas: Fazenda[];
  onKeyRevealed: (apiKey: string, title?: string) => void;
  onRevoked: () => void;
};

export function IntegracaoEditForm({
  cliente,
  fazendas,
  onKeyRevealed,
  onRevoked,
}: Props) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(cliente.nome);
  const [fazendaIds, setFazendaIds] = useState<number[]>(cliente.fazenda_ids ?? []);
  const [scopes, setScopes] = useState<string[]>(cliente.scopes ?? []);
  const [error, setError] = useState("");
  const [nomeError, setNomeError] = useState("");
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();

  const isRevogado = !!cliente.revogado_em;

  const saveMutation = useMutation({
    mutationFn: () =>
      updateIntegracao(cliente.id, {
        nome: nome.trim(),
        fazenda_ids: fazendaIds,
        scopes,
      }),
    onSuccess: () => {
      setError("");
      toast.success("Alterações guardadas");
      queryClient.invalidateQueries({
        queryKey: ["admin", "integracoes", cliente.id],
      });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Erro ao guardar alterações."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
    },
  });

  const rotateMutation = useMutation({
    mutationFn: () => rotacionarChaveIntegracao(cliente.id),
    onSuccess: (res) => {
      setError("");
      onKeyRevealed(res.api_key, "Nova chave de API");
      toast.info("Chave rotacionada — copie a nova chave no diálogo");
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Erro ao rotacionar chave."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => revogarIntegracao(cliente.id),
    onSuccess: () => {
      toast.success("Cliente de integração revogado");
      onRevoked();
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Erro ao revogar cliente."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
    },
  });

  const reativarMutation = useMutation({
    mutationFn: () => reativarIntegracao(cliente.id),
    onSuccess: (res) => {
      setError("");
      onKeyRevealed(res.api_key, "Chave de API — cliente reativado");
      toast.info("Cliente reativado — copie a nova chave no diálogo");
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Erro ao reativar cliente."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
    },
  });

  const handleSave = () => {
    setError("");
    setNomeError("");
    setConformidadeCode(undefined);
    if (!nome.trim()) {
      const msg = "Nome é obrigatório.";
      setNomeError(msg);
      setError(msg);
      return;
    }
    saveMutation.mutate();
  };

  const parsed = error ? parsePrefixedConformidadeMessage(error) : null;
  const displayMessage = parsed?.message ?? error;
  const displayCode = conformidadeCode ?? parsed?.conformidadeCode;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error?.trim() ? (
          <FormValidationAlert
            message={displayMessage}
            conformidadeCode={displayCode}
          />
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="nome-edit">Nome</Label>
          <Input
            id="nome-edit"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-invalid={nomeError ? true : undefined}
            className={nomeError ? "border-destructive" : undefined}
          />
          <FormFieldError message={nomeError} />
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
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            Guardar
          </Button>
          {isRevogado ? (
            <Button
              type="button"
              variant="default"
              onClick={() => {
                if (
                  confirm(
                    "Reativar este cliente? Será gerada uma nova chave de API; a chave anterior continuará inválida."
                  )
                ) {
                  reativarMutation.mutate();
                }
              }}
              disabled={reativarMutation.isPending}
            >
              Reativar
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => rotateMutation.mutate()}
                disabled={rotateMutation.isPending}
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
                disabled={revokeMutation.isPending}
              >
                Revogar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
