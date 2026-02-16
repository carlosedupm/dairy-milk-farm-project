"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  Animal,
  AnimalCreate,
  Categoria,
  Sexo,
  StatusSaude,
} from "@/services/animais";
import {
  SEXOS,
  STATUS_SAUDE_OPTIONS,
  SEXO_LABELS,
  STATUS_SAUDE_LABELS,
  CATEGORIAS,
  CATEGORIA_LABELS,
} from "@/services/animais";
import { getMinhasFazendas, type Fazenda } from "@/services/fazendas";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
  const { fazendaAtiva } = useFazendaAtiva();

  // Usar fazenda ativa como fallback se não tiver defaultFazendaId
  const initialFazendaId =
    fazendaUnicaId ??
    defaultFazendaId ??
    initial?.fazenda_id ??
    fazendaAtiva?.id ??
    0;

  const [fazendaId, setFazendaId] = useState<number>(initialFazendaId);
  const [identificacao, setIdentificacao] = useState(
    initial?.identificacao ?? ""
  );
  const [raca, setRaca] = useState(initial?.raca ?? "");
  const [dataNascimento, setDataNascimento] = useState(
    initial?.data_nascimento ? initial.data_nascimento.slice(0, 10) : ""
  );
  const [dataEntrada, setDataEntrada] = useState(
    initial?.data_entrada ? initial.data_entrada.slice(0, 10) : ""
  );
  const [dataSaida, setDataSaida] = useState(
    initial?.data_saida ? initial.data_saida.slice(0, 10) : ""
  );
  const [sexo, setSexo] = useState<Sexo>((initial?.sexo as Sexo) ?? "F");
  const [statusSaude, setStatusSaude] = useState<StatusSaude>(
    (initial?.status_saude as StatusSaude) ?? "SAUDAVEL"
  );
  const [categoria, setCategoria] = useState<Categoria | "">(
    (initial?.categoria as Categoria) ?? ""
  );
  const [error, setError] = useState("");

  // Usar fazendas vinculadas ao usuário (não todas)
  const { data: fazendas = [] } = useQuery<Fazenda[]>({
    queryKey: ["me", "fazendas"],
    queryFn: getMinhasFazendas,
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
      categoria: categoria || null,
    };

    if (raca.trim()) payload.raca = raca.trim();
    if (dataNascimento.trim()) payload.data_nascimento = dataNascimento.trim();
    if (dataEntrada.trim()) payload.data_entrada = dataEntrada.trim();
    if (dataSaida.trim()) payload.data_saida = dataSaida.trim();

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de nascimento</Label>
              <DatePicker
                id="dataNascimento"
                value={dataNascimento || undefined}
                onChange={(v) => setDataNascimento(v)}
                placeholder="Selecione a data"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataEntrada">Data de entrada</Label>
              <DatePicker
                id="dataEntrada"
                value={dataEntrada || undefined}
                onChange={(v) => setDataEntrada(v)}
                placeholder="Selecione a data"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataSaida">Data de saída</Label>
              <DatePicker
                id="dataSaida"
                value={dataSaida || undefined}
                onChange={(v) => setDataSaida(v)}
                placeholder="Selecione a data"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={categoria || "_"}
                onValueChange={(v) =>
                  setCategoria(v === "_" ? "" : (v as Categoria))
                }
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Não informada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Não informada</SelectItem>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIA_LABELS[c]}
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
