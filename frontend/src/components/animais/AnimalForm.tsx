"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  Animal,
  AnimalCreate,
  Sexo,
  StatusSaude,
} from "@/services/animais";
import {
  SEXOS,
  STATUS_SAUDE_OPTIONS,
  SEXO_LABELS,
  STATUS_SAUDE_LABELS,
} from "@/services/animais";
import { list as listFazendas, type Fazenda } from "@/services/fazendas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/errors";

type Props = {
  initial?: Animal | null;
  onSubmit: (payload: AnimalCreate) => Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  defaultFazendaId?: number;
  /** Quando definido, usa esta fazenda e não exibe o seletor (usuário com uma única fazenda). */
  fazendaUnicaId?: number;
};

export function AnimalForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = "Salvar",
  defaultFazendaId,
  fazendaUnicaId,
}: Props) {
  const [fazendaId, setFazendaId] = useState<number>(
    fazendaUnicaId ?? defaultFazendaId ?? initial?.fazenda_id ?? 0
  );
  const [identificacao, setIdentificacao] = useState(
    initial?.identificacao ?? ""
  );
  const [raca, setRaca] = useState(initial?.raca ?? "");
  const [dataNascimento, setDataNascimento] = useState(
    initial?.data_nascimento ? initial.data_nascimento.slice(0, 10) : ""
  );
  const [sexo, setSexo] = useState<Sexo>((initial?.sexo as Sexo) ?? "F");
  const [statusSaude, setStatusSaude] = useState<StatusSaude>(
    (initial?.status_saude as StatusSaude) ?? "SAUDAVEL"
  );
  const [error, setError] = useState("");

  const { data: fazendas = [] } = useQuery<Fazenda[]>({
    queryKey: ["fazendas"],
    queryFn: listFazendas,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identificacao.trim()) {
      setError("Identificação é obrigatória.");
      return;
    }
    if (!fazendaId || fazendaId <= 0) {
      setError("Selecione uma fazenda.");
      return;
    }

    const payload: AnimalCreate = {
      fazenda_id: fazendaUnicaId ?? fazendaId,
      identificacao: identificacao.trim(),
      sexo,
      status_saude: statusSaude,
    };

    if (raca.trim()) payload.raca = raca.trim();
    if (dataNascimento.trim()) payload.data_nascimento = dataNascimento.trim();

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao salvar. Tente novamente."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Editar animal" : "Novo animal"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fazendaUnicaId != null ? (
            <div className="space-y-2">
              <Label>Fazenda</Label>
              <p className="text-sm text-muted-foreground py-2">
                Fazenda vinculada ao seu perfil (única)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="fazenda">Fazenda *</Label>
              <Select
                value={fazendaId?.toString() ?? ""}
                onValueChange={(v) => setFazendaId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fazenda" />
                </SelectTrigger>
                <SelectContent>
                  {fazendas.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="identificacao">Identificação *</Label>
              <Input
                id="identificacao"
                value={identificacao}
                onChange={(e) => setIdentificacao(e.target.value)}
                required
                placeholder="Ex.: BR001 ou Mimosa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="raca">Raça</Label>
              <Input
                id="raca"
                value={raca}
                onChange={(e) => setRaca(e.target.value)}
                placeholder="Ex.: Holandesa"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de nascimento</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEXOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEXO_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusSaude">Status de Saúde</Label>
              <Select
                value={statusSaude}
                onValueChange={(v) => setStatusSaude(v as StatusSaude)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_SAUDE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_SAUDE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-base text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
