"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLote, type ToqueLoteItem } from "@/services/toques";
import { listByFazenda as listCoberturasByFazenda } from "@/services/coberturas";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  ToqueLoteEditor,
  emptyToqueLoteLinha,
  type ToqueLoteLinha,
} from "@/components/gestao/ToqueLoteEditor";
import { DateTimePickerPtBr } from "@/components/ui/datetime-picker-pt-br";
import { todayISODate } from "@/lib/date-limits";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-field-error";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { validateToqueLoteForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { nowDatetimeLocalInputValue } from "@/lib/format";
import { gestacaoToDias } from "@/lib/toquesUtils";

function Content() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const [data, setData] = useState(nowDatetimeLocalInputValue());
  const [linhas, setLinhas] = useState<ToqueLoteLinha[]>([emptyToqueLoteLinha()]);
  const [resultado, setResultado] = useState<{
    sucesso: number;
    falhas: { linha: number; identificacao: string; message: string }[];
  } | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);
  const { data: coberturas = [] } = useQuery({
    queryKey: ["coberturas", fazendaId],
    queryFn: () => listCoberturasByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const animalIdByIdentificacao = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of animais) {
      const key = a.identificacao.trim().toLowerCase();
      if (key) map.set(key, a.id);
    }
    return map;
  }, [animais]);

  const resolveAnimalId = useMemo(
    () => (identificacao: string) =>
      animalIdByIdentificacao.get(identificacao.trim().toLowerCase()),
    [animalIdByIdentificacao]
  );

  const mutation = useMutation({
    mutationFn: () => {
      const dataIso = new Date(data).toISOString();
      const itens: ToqueLoteItem[] = linhas
        .filter((l) => l.identificacao.trim())
        .map((l) => {
          const item: ToqueLoteItem = {
            identificacao: l.identificacao.trim(),
            data: dataIso,
            classificacao_operacional: l.classificacao,
            observacoes: l.observacoes.trim() || undefined,
          };
          if (l.classificacao === "PRENHA" && l.gestacaoValor.trim()) {
            const dias = gestacaoToDias(l.gestacaoValor, l.gestacaoUnidade);
            if (dias != null) {
              item.dias_gestacao_estimados = dias;
            }
          }
          return item;
        });
      return createLote({ fazenda_id: fazendaId, itens });
    },
    onSuccess: async (res) => {
      setResultado({
        sucesso: res.sucesso,
        falhas: res.falhas.map((f) => ({
          linha: f.linha,
          identificacao: f.identificacao,
          message: f.message,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: ["toques", fazendaId] });
      await queryClient.invalidateQueries({ queryKey: ["animais"] });
      await queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] });
      await queryClient.invalidateQueries({ queryKey: ["gestacoes"] });
      if (res.falhas.length === 0) {
        toast.success("Lote de toques registado");
        router.push("/gestao/toques");
      } else {
        toast.warning(
          `${res.sucesso} registo(s) OK; ${res.falhas.length} falha(s) — veja detalhes abaixo`
        );
      }
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao enviar lote."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/gestao/toques">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setFieldErrors({});
    setConformidadeCode(undefined);
    const validation = validateToqueLoteForm(
      {
        data,
        linhas: linhas.map((l) => ({
          identificacao: l.identificacao,
          classificacao: l.classificacao,
        })),
      },
      {
        maxDate: todayISODate(),
        coberturas,
        resolveAnimalId,
      }
    );
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setFormError(validation.summary ?? "Corrija os campos assinalados.");
      setConformidadeCode(validation.conformidadeCode);
      setIsValidationError(true);
      return;
    }
    setIsValidationError(false);
    mutation.mutate();
  };

  return (
    <GestaoFormLayout
      title="Registrar toques em lote"
      backHref="/gestao/toques"
      submitLabel="Enviar lote"
      onSubmit={handleSubmit}
      isPending={mutation.isPending}
      error={formError}
      errorConformidadeCode={conformidadeCode}
      isValidationError={isValidationError}
      fieldErrors={fieldErrors}
    >
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="lote-data">Data/hora da palpação</Label>
        <DateTimePickerPtBr
          id="lote-data"
          value={data}
          maxDate={todayISODate()}
          onChange={setData}
          placeholder="Selecione data e hora"
        />
        <FormFieldError message={fieldErrors.data} />
      </div>

      <FormFieldError message={fieldErrors.linhas} />

      <ToqueLoteEditor
        linhas={linhas}
        onLinhasChange={setLinhas}
        resultado={resultado}
      />
    </GestaoFormLayout>
  );
}

export default function LotePage() {
  return (
    <ProtectedRoute>
      <Content />
    </ProtectedRoute>
  );
}
