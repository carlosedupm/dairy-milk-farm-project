"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/toques";
import { listByFazenda as listAnimaisByFazenda } from "@/services/animais";
import { listByFazenda as listCoberturasByFazenda } from "@/services/coberturas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr, nowDatetimeLocalInputValue } from "@/lib/format";

const RESULTADOS = ["POSITIVO", "NEGATIVO", "INCONCLUSIVO"];

function NovoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();

  const defaultAnimalId = searchParams.get("animal_id") ?? "";

  const [animalId, setAnimalId] = useState(defaultAnimalId);
  const [coberturaId, setCoberturaId] = useState("");
  const [data, setData] = useState(nowDatetimeLocalInputValue());
  const [resultado, setResultado] = useState("POSITIVO");

  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaId],
    queryFn: () => listAnimaisByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: coberturasFazenda = [] } = useQuery({
    queryKey: ["coberturas", fazendaId],
    queryFn: () => listCoberturasByFazenda(fazendaId),
    enabled: fazendaId > 0 && resultado === "POSITIVO",
  });

  const coberturasDoAnimal = useMemo(() => {
    const aid = Number(animalId);
    if (!aid) return [];
    return coberturasFazenda
      .filter((c) => c.animal_id === aid)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [animalId, coberturasFazenda]);

  const coberturaSelectValue = useMemo(() => {
    if (!coberturaId) {
      if (coberturasDoAnimal.length === 1) {
        return coberturasDoAnimal[0].id.toString();
      }
      return "";
    }
    if (coberturasDoAnimal.some((c) => c.id.toString() === coberturaId)) {
      return coberturaId;
    }
    return coberturasDoAnimal.length === 1
      ? coberturasDoAnimal[0].id.toString()
      : "";
  }, [coberturaId, coberturasDoAnimal]);

  const mutation = useMutation({
    mutationFn: () => {
      const coberturaIdNum =
        resultado === "POSITIVO" ? Number(coberturaSelectValue) : 0;
      return create({
        animal_id: Number(animalId),
        data: new Date(data).toISOString(),
        resultado,
        fazenda_id: fazendaId,
        cobertura_id:
          resultado === "POSITIVO" && coberturaIdNum > 0
            ? coberturaIdNum
            : null,
      });
    },
    onSuccess: async () => {
      const aid = Number(animalId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["toques", fazendaId] }),
        queryClient.invalidateQueries({ queryKey: ["animais"] }),
        queryClient.invalidateQueries({ queryKey: ["animais", aid] }),
        queryClient.invalidateQueries({ queryKey: ["animais", "contexto"] }),
        queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] }),
        queryClient.invalidateQueries({ queryKey: ["gestacoes"] }),
        queryClient.invalidateQueries({ queryKey: ["coberturas", fazendaId] }),
      ]);
      if (aid > 0) {
        router.push(`/animais/${aid}`);
      } else {
        router.push("/gestao/toques");
      }
    },
  });

  const precisaCobertura = resultado === "POSITIVO";
  const submitDisabled =
    !animalId ||
    (precisaCobertura && !coberturaSelectValue && coberturasDoAnimal.length === 0);

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/toques">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoFormLayout
      title="Registrar toque (diagnóstico de gestação)"
      backHref="/gestao/toques"
      submitLabel="Registrar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError
          ? getApiErrorMessage(mutation.error, "Erro ao registrar.")
          : undefined
      }
      submitDisabled={submitDisabled}
    >
      <AnimalSelect
        animais={animais}
        value={animalId}
        onValueChange={(v) => {
          setAnimalId(v);
          setCoberturaId("");
        }}
        label="Animal"
        placeholder="Selecione"
        femeasOnly
      />
      <div>
        <Label>Data/hora</Label>
        <Input
          type="datetime-local"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>
      <div>
        <Label>Resultado</Label>
        <Select value={resultado} onValueChange={setResultado}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o resultado" />
          </SelectTrigger>
          <SelectContent>
            {RESULTADOS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {precisaCobertura ? (
        <div className="space-y-2">
          <Label htmlFor="cobertura">Cobertura vinculada *</Label>
          {coberturasDoAnimal.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg p-3 break-words">
              Não há cobertura registrada para este animal. Registre uma
              cobertura antes do toque positivo — é ela que abre a gestação
              confirmada e atualiza o status para prenhe.
            </p>
          ) : (
            <Select
              value={coberturaSelectValue}
              onValueChange={setCoberturaId}
            >
              <SelectTrigger id="cobertura">
                <SelectValue placeholder="Selecione a cobertura" />
              </SelectTrigger>
              <SelectContent>
                {coberturasDoAnimal.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {formatDatePtBr(c.data)} — {c.tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground break-words">
            Toque positivo confirma a gestação, define parto previsto e atualiza
            busca, ficha do animal e resumo pecuário na home.
          </p>
        </div>
      ) : null}
    </GestaoFormLayout>
  );
}

function NovoPageFallback() {
  return (
    <PageContainer variant="narrow">
      <p className="text-muted-foreground">Carregando…</p>
    </PageContainer>
  );
}

export default function NovoPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<NovoPageFallback />}>
        <NovoContent />
      </Suspense>
    </ProtectedRoute>
  );
}
