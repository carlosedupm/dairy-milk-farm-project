"use client";

import { useState } from "react";
import type { Usuario, UsuarioCreate } from "@/services/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { validateUsuarioForm, type FieldErrors } from "@/lib/form-validation";
import { PERFIS_DISPONIVEIS, PERFIL_LABEL } from "@/lib/perfilLabels";

type CreatePayload = UsuarioCreate;
type UpdatePayload = Omit<UsuarioCreate, "senha"> & {
  senha?: string;
  enabled?: boolean;
};

type Props = {
  initial?: Usuario | null;
  onSubmit: (payload: CreatePayload | UpdatePayload) => Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
};

const perfilNaoEditavel = (perfil: string) =>
  perfil === "ADMIN" || perfil === "DEVELOPER";

export function UsuarioForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = "Salvar",
}: Props) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState(() => {
    const p = initial?.perfil ?? "USER";
    const editaveis = ["USER", "FUNCIONARIO", "GERENTE", "GESTAO", "PROPRIETARIO", "ADMIN"];
    if (editaveis.includes(p)) return p;
    return "USER";
  });
  const perfilReadOnly = !!(initial && perfilNaoEditavel(initial.perfil));
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [error, setError] = useState("");
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [isValidationError, setIsValidationError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConformidadeCode(undefined);
    setFieldErrors({});

    const validation = validateUsuarioForm({
      nome,
      email,
      senha,
      isCreate: !initial,
    });
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setError(validation.summary ?? "Corrija os campos assinalados.");
      setIsValidationError(true);
      return;
    }
    setIsValidationError(false);

    try {
      const payload: CreatePayload | UpdatePayload = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        perfil: perfilReadOnly && initial ? initial.perfil : perfil,
      };
      if (initial) {
        if (senha.trim()) (payload as UpdatePayload).senha = senha.trim();
        (payload as UpdatePayload).enabled = enabled;
      } else {
        (payload as CreatePayload).senha = senha.trim();
      }
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao salvar. Tente novamente."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    }
  };

  const parsed = error ? parsePrefixedConformidadeMessage(error) : null;
  const displayMessage = parsed?.message ?? error;
  const displayCode = conformidadeCode ?? parsed?.conformidadeCode;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Editar usuário" : "Novo usuário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error?.trim() ? (
            <FormValidationAlert
              message={displayMessage}
              conformidadeCode={displayCode}
              isValidation={isValidationError}
            />
          ) : null}

          <FormField label="Nome" htmlFor="nome" required error={fieldErrors.nome}>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do usuário"
            />
          </FormField>

          <FormField label="Email" htmlFor="email" required error={fieldErrors.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </FormField>

          <FormField
            label={initial ? "Senha (deixe em branco para não alterar)" : "Senha"}
            htmlFor="senha"
            required={!initial}
            error={fieldErrors.senha}
          >
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={initial ? "••••••••" : "Senha"}
            />
          </FormField>

          <div className="space-y-2">
            <Label htmlFor="perfil">Perfil</Label>
            {perfilReadOnly ? (
              <p className="flex h-11 min-h-[44px] items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-base text-muted-foreground">
                {PERFIL_LABEL[initial?.perfil ?? ""] ?? initial?.perfil}
                <span className="ml-2 text-sm">
                  (não editável para Admin/Developer)
                </span>
              </p>
            ) : (
              <Select value={perfil} onValueChange={setPerfil}>
                <SelectTrigger id="perfil">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {PERFIS_DISPONIVEIS.filter(
                    (p) => p.value !== "DEVELOPER"
                  ).map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {initial && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                Usuário ativo
              </Label>
            </div>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
