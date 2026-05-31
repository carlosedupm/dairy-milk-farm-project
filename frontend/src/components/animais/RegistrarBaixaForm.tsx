"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  registrarBaixa,
  invalidateAnimalTimeline,
  type MotivoSaida,
  type RegistrarBaixaPayload,
} from "@/services/animais";
import {
  animaisFazendaQueryKey,
  patchAnimalInFazendaCaches,
  useAnimaisOperacionalList,
} from "@/components/gestao/useAnimaisMap";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  canRegistrarBaixa,
  motivosBaixaParaPerfil,
} from "@/config/appAccess";
import { MOTIVO_SAIDA_LABELS } from "@/services/animais";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { DatePicker } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { todayISODate } from "@/lib/date-limits";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { validateRegistrarBaixa, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";

type Props = {
  defaultAnimalId?: string;
};

export function RegistrarBaixaForm({ defaultAnimalId = "" }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { fazendaAtiva } = useFazendaAtiva();
  const perfil = user?.perfil;

  const motivos = useMemo(
    () => motivosBaixaParaPerfil(perfil),
    [perfil]
  );

  const [animalId, setAnimalId] = useState(defaultAnimalId);
  const [dataSaida, setDataSaida] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [motivo, setMotivo] = useState<MotivoSaida>(
    motivos[0] ?? "MORTE"
  );
  const [observacao, setObservacao] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaAtiva?.id);

  const mutation = useMutation({
    mutationFn: (payload: RegistrarBaixaPayload) =>
      registrarBaixa(Number(animalId), payload),
    onSuccess: (animalAtualizado) => {
      const aid = Number(animalId);
      const fid = fazendaAtiva?.id;
      patchAnimalInFazendaCaches(queryClient, animalAtualizado);
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      if (fid) {
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fid, "operacional"),
        });
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fid, "todos"),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["animais", aid] });
      queryClient.invalidateQueries({ queryKey: ["animais", aid, "contexto"] });
      invalidateAnimalTimeline(queryClient, aid);
      queryClient.invalidateQueries({ queryKey: ["conformidade"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] });
      toast.success("Baixa do rebanho registada");
      router.push(`/animais/${aid}`);
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao registrar baixa."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
      setConfirmOpen(false);
    },
  });

  if (!canRegistrarBaixa(perfil)) {
    return (
      <p className="text-muted-foreground">
        O seu perfil não pode registrar baixa do rebanho.
      </p>
    );
  }

  const handleConfirm = () => {
    mutation.mutate({
      data_saida: dataSaida.trim(),
      motivo_saida: motivo,
      observacao_saida: observacao.trim() || null,
    });
  };

  const tryOpenConfirm = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateRegistrarBaixa({ animalId, dataSaida });
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setFormError(validation.summary ?? "Corrija os campos assinalados.");
      setIsValidationError(true);
      return;
    }
    setFieldErrors({});
    setIsValidationError(false);
    setConfirmOpen(true);
  };

  return (
    <>
      <GestaoFormLayout
        title="Registrar baixa do rebanho"
        backHref={animalId ? `/animais/${animalId}` : "/animais"}
        submitLabel="Continuar"
        isPending={false}
        error={formError}
        errorConformidadeCode={conformidadeCode}
        isValidationError={isValidationError}
        fieldErrors={fieldErrors}
        onSubmit={tryOpenConfirm}
      >
        <p className="text-muted-foreground text-sm">
          Registo formal de saída (morte, venda, doação ou descarte). Encerra
          lactação ativa, gestação confirmada e restrição de leite em aberto.
        </p>
        <AnimalSelect
          animais={animais}
          value={animalId}
          onValueChange={setAnimalId}
          label="Animal *"
          semDataSaida
          error={fieldErrors.animalId}
        />
        <div className="space-y-2">
          <Label>Data da baixa *</Label>
          <DatePicker
            value={dataSaida || undefined}
            onChange={(v) => setDataSaida(v)}
            maxDate={todayISODate()}
            placeholder="Selecione a data"
          />
          <FormFieldError message={fieldErrors.dataSaida} />
          <p className="text-xs text-muted-foreground">
            A data da baixa não pode ser futura.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Motivo *</Label>
          <Select
            value={motivo}
            onValueChange={(v) => setMotivo(v as MotivoSaida)}
            disabled={motivos.length <= 1}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {motivos.map((m) => (
                <SelectItem key={m} value={m}>
                  {MOTIVO_SAIDA_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-baixa">Observação (opcional)</Label>
          <Textarea
            id="obs-baixa"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: comprador, causa, evento…"
            rows={3}
            className="min-h-[4.5rem]"
          />
        </div>
      </GestaoFormLayout>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar baixa</DialogTitle>
            <DialogDescription>
              Esta ação regista a saída do animal do rebanho e encerra, na mesma
              operação, lactação ativa, gestação confirmada (como perda) e
              restrição de leite aguardando laboratório (cancelada). O histórico
              permanece consultável na ficha.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "A registar…" : "Confirmar baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
