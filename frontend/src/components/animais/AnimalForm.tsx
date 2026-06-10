"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  Animal,
  AnimalCreate,
  Categoria,
  OrigemAquisicao,
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
  ORIGENS_AQUISICAO,
  ORIGEM_LABELS,
} from "@/services/animais";
import { getMinhasFazendas, type Fazenda } from "@/services/fazendas";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { todayISODate } from "@/lib/date-limits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { FormFieldError } from "@/components/ui/form-field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getApiErrorCode,
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { AnimalStatusSaudeBadge } from "@/components/animais/AnimalStatusSaudeBadge";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  animalSaudeListQueryKey,
  listByAnimal,
} from "@/services/animalSaude";
import {
  validateAnimalForm,
  type FieldErrors,
} from "@/lib/form-validation";

type Props = {
  initial?: Animal | null;
  onSubmit: (payload: AnimalCreate) => Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  defaultFazendaId?: number;
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

  const initialFazendaId =
    fazendaUnicaId ??
    defaultFazendaId ??
    initial?.fazenda_id ??
    fazendaAtiva?.id ??
    0;

  const [fazendaId, setFazendaId] = useState<number>(initialFazendaId);
  const [origemAquisicao, setOrigemAquisicao] = useState<OrigemAquisicao>(
    (initial?.origem_aquisicao as OrigemAquisicao) ?? "NASCIDO"
  );
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
  const [sexo, setSexo] = useState<Sexo>((initial?.sexo as Sexo) ?? "F");
  const [statusSaude, setStatusSaude] = useState<StatusSaude>(
    (initial?.status_saude as StatusSaude) ?? "SAUDAVEL"
  );
  const [categoria, setCategoria] = useState<Categoria | "">(
    (initial?.categoria as Categoria) ?? ""
  );
  const [error, setError] = useState("");
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [isValidationError, setIsValidationError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isEdit = Boolean(initial?.id);
  const animalId = initial?.id ?? 0;

  const { data: casosSaude = [] } = useQuery({
    queryKey: animalSaudeListQueryKey(animalId),
    queryFn: () => listByAnimal(animalId),
    enabled: isEdit && animalId > 0,
  });
  const temCasosAtivos = casosSaude.some((c) => c.status === "ATIVO");
  const statusSaudeAtual =
    (initial?.status_saude as StatusSaude | undefined) ?? statusSaude;

  const { data: fazendas = [] } = useQuery<Fazenda[]>({
    queryKey: ["me", "fazendas"],
    queryFn: getMinhasFazendas,
  });

  const clearErrors = () => {
    setError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const validation = validateAnimalForm({
      identificacao,
      fazendaId,
      fazendaUnicaId,
      origemAquisicao,
      dataNascimento,
    });
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setError(validation.summary ?? "Corrija os campos assinalados.");
      setIsValidationError(true);
      return;
    }

    const payload: AnimalCreate = {
      fazenda_id: fazendaUnicaId ?? fazendaId,
      identificacao: identificacao.trim(),
      sexo,
      categoria: categoria || null,
      origem_aquisicao: origemAquisicao,
    };

    if (isEdit) {
      payload.status_saude = statusSaude;
    }

    if (raca.trim()) payload.raca = raca.trim();
    if (origemAquisicao === "NASCIDO" && dataNascimento.trim()) {
      payload.data_nascimento = dataNascimento.trim();
    } else if (origemAquisicao === "COMPRADO") {
      payload.data_nascimento = null;
    }
    if (dataEntrada.trim()) payload.data_entrada = dataEntrada.trim();

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao salvar. Tente novamente."));
      setConformidadeCode(
        getApiErrorConformidadeCode(err) ?? getApiErrorCode(err)
      );
      setIsValidationError(false);
    }
  };

  const parsed = error ? parsePrefixedConformidadeMessage(error) : null;
  const displayMessage = parsed?.message ?? error;
  const displayCode = conformidadeCode ?? parsed?.conformidadeCode;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Editar animal" : "Novo animal"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error?.trim() ? (
            <FormValidationAlert
              message={displayMessage}
              conformidadeCode={displayCode}
              isValidation={isValidationError}
            />
          ) : null}

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
                <SelectTrigger
                  id="fazenda"
                  aria-invalid={fieldErrors.fazendaId ? true : undefined}
                  className={
                    fieldErrors.fazendaId ? "border-destructive" : undefined
                  }
                >
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
              <FormFieldError message={fieldErrors.fazendaId} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Origem</Label>
            <Select
              value={origemAquisicao}
              onValueChange={(v) => setOrigemAquisicao(v as OrigemAquisicao)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGENS_AQUISICAO.map((o) => (
                  <SelectItem key={o} value={o}>
                    {ORIGEM_LABELS[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {origemAquisicao === "NASCIDO"
                ? "Animal nascido na fazenda — informe a data de nascimento."
                : "Animal comprado — data de nascimento não é necessária. Use data de entrada como referência."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Identificação"
              htmlFor="identificacao"
              required
              error={fieldErrors.identificacao}
            >
              <Input
                value={identificacao}
                onChange={(e) => setIdentificacao(e.target.value)}
                placeholder="Ex.: BR001 ou Mimosa"
              />
            </FormField>

            <FormField label="Raça" htmlFor="raca">
              <Input
                value={raca}
                onChange={(e) => setRaca(e.target.value)}
                placeholder="Ex.: Holandesa"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {origemAquisicao === "NASCIDO" && (
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">
                  Data de nascimento <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  id="dataNascimento"
                  value={dataNascimento || undefined}
                  onChange={(v) => setDataNascimento(v)}
                  maxDate={todayISODate()}
                  placeholder="Selecione a data"
                />
                <FormFieldError message={fieldErrors.dataNascimento} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dataEntrada">
                Data de entrada
                {origemAquisicao === "COMPRADO" && (
                  <span className="text-muted-foreground text-xs ml-1">
                    (data de aquisição)
                  </span>
                )}
              </Label>
              <DatePicker
                id="dataEntrada"
                value={dataEntrada || undefined}
                onChange={(v) => setDataEntrada(v)}
                maxDate={todayISODate()}
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

          {isEdit ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="statusSaude">Status de saúde</Label>
                {statusSaudeAtual ? (
                  <AnimalStatusSaudeBadge status={statusSaudeAtual} />
                ) : null}
              </div>
              {temCasosAtivos ? (
                <TooltipProvider delayDuration={300}>
                  <div className="space-y-2">
                    <ButtonWithTooltip
                      tooltip="Status derivado dos casos clínicos ativos. Conclua ou cancele os casos na tab Saúde para alterar manualmente."
                      className="w-full justify-start h-auto min-h-10 px-3 py-2 font-normal text-muted-foreground bg-muted/50 border border-input rounded-md cursor-not-allowed"
                      type="button"
                      disabled
                    >
                      {STATUS_SAUDE_LABELS[statusSaude]}
                    </ButtonWithTooltip>
                    <p className="text-sm text-muted-foreground">
                      Registe ou encerre casos na{" "}
                      <Link
                        href={`/animais/${animalId}?tab=saude`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        tab Saúde
                      </Link>
                      .
                    </p>
                  </div>
                </TooltipProvider>
              ) : (
                <Select
                  value={statusSaude}
                  onValueChange={(v) => setStatusSaude(v as StatusSaude)}
                >
                  <SelectTrigger id="statusSaude">
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
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Novos animais iniciam como saudáveis. Registe casos na tab Saúde
              após o cadastro, se necessário.
            </p>
          )}

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
