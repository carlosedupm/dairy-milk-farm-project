"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  encerrarProtocolo,
  hormonioLactacaoProtocoloQueryKey,
  hormoniosLactacaoListQueryKey,
  hormoniosLactacaoPendentesQueryKey,
  MOTIVOS_ENCERRAMENTO_HORMONIO,
  MOTIVO_ENCERRAMENTO_LABELS,
} from "@/services/animalHormoniosLactacao";
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animalId: number;
  fazendaId: number;
};

export function HormonioLactacaoEncerrarDialog({
  open,
  onOpenChange,
  animalId,
  fazendaId,
}: Props) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState<string>("BAIXA_PRODUCAO");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      encerrarProtocolo(animalId, {
        motivo_encerramento: motivo,
        observacoes: observacoes.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: hormonioLactacaoProtocoloQueryKey(animalId),
      });
      await queryClient.invalidateQueries({
        queryKey: hormoniosLactacaoListQueryKey(animalId),
      });
      await queryClient.invalidateQueries({
        queryKey: hormoniosLactacaoPendentesQueryKey(fazendaId),
      });
      toast.success("Protocolo encerrado.");
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, "Não foi possível encerrar o protocolo."));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar protocolo de hormônio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_ENCERRAMENTO_HORMONIO.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MOTIVO_ENCERRAMENTO_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            Encerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
