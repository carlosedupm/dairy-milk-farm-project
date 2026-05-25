"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLote, type ToqueLoteItem } from "@/services/toques";
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
import { getApiErrorMessage } from "@/lib/errors";
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
        router.push("/gestao/toques");
      }
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

  const linhasValidas = linhas.some((l) => l.identificacao.trim());

  return (
    <GestaoFormLayout
      title="Registrar toques em lote"
      backHref="/gestao/toques"
      submitLabel="Enviar lote"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError
          ? getApiErrorMessage(mutation.error, "Erro ao enviar lote.")
          : undefined
      }
      submitDisabled={!linhasValidas}
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
      </div>

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
