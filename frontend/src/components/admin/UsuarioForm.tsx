"use client";

import { useState } from "react";
import type { Usuario, UsuarioCreate } from "@/services/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/errors";

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

const PERFIS_DISPONIVEIS = [
  { value: "USER", label: "Usuário" },
  { value: "ADMIN", label: "Administrador" },
  { value: "DEVELOPER", label: "Developer" },
];

const PERFIL_LABEL: Record<string, string> = {
  USER: "Usuário",
  ADMIN: "Administrador",
  DEVELOPER: "Developer",
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
  const [perfil, setPerfil] = useState(
    initial?.perfil === "ADMIN"
      ? "ADMIN"
      : initial?.perfil === "DEVELOPER"
      ? "DEVELOPER"
      : "USER"
  );
  const perfilReadOnly = !!(initial && perfilNaoEditavel(initial.perfil));
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nome.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    if (!email.trim()) {
      setError("Email é obrigatório.");
      return;
    }
    if (!initial && !senha.trim()) {
      setError("Senha é obrigatória ao criar usuário.");
      return;
    }
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
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Editar usuário" : "Novo usuário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Nome do usuário"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">
              Senha {initial ? "(deixe em branco para não alterar)" : "*"}
            </Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required={!initial}
              placeholder={initial ? "••••••••" : "Senha"}
            />
          </div>
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
              <select
                id="perfil"
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
                className="flex h-11 min-h-[44px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PERFIS_DISPONIVEIS.filter((p) => p.value !== "DEVELOPER").map(
                  (p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  )
                )}
              </select>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
