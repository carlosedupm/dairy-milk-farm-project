"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSafraCultura } from "@/services/agricultura";
import { getApiErrorMessage } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: number;
  ano: number;
  areaNome?: string;
};

export function CreateSafraCulturaDialog({
  open,
  onOpenChange,
  areaId,
  ano,
  areaNome,
}: Props) {
  const queryClient = useQueryClient();
  const [cultura, setCultura] = useState("MILHO");
  const [status, setStatus] = useState("PLANTADA");
  const [dataPlantio, setDataPlantio] = useState("");
  const [dataColheita, setDataColheita] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createSafraCultura({
        area_id: areaId,
        ano,
        cultura,
        status,
        data_plantio: dataPlantio || undefined,
        data_colheita: dataColheita || undefined,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safras-culturas", areaId, ano] });
      onOpenChange(false);
      setCultura("MILHO");
      setStatus("PLANTADA");
      setDataPlantio("");
      setDataColheita("");
      setObservacoes("");
    },
  });

  const handleSubmit = () => {
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova cultura – Safra {ano} – {areaNome ?? "Área"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="cultura">Cultura</Label>
            <Select value={cultura} onValueChange={setCultura}>
              <SelectTrigger id="cultura">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MILHO">Milho</SelectItem>
                <SelectItem value="SOJA">Soja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANEJADA">Planejada</SelectItem>
                <SelectItem value="PLANTADA">Plantada</SelectItem>
                <SelectItem value="EM_CRESCIMENTO">Em crescimento</SelectItem>
                <SelectItem value="COLHIDA">Colhida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="data_plantio">Data do plantio (opcional)</Label>
            <Input id="data_plantio" type="date" value={dataPlantio} onChange={(e) => setDataPlantio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="data_colheita">Data da colheita (opcional)</Label>
            <Input id="data_colheita" type="date" value={dataColheita} onChange={(e) => setDataColheita(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          {createMutation.isError && (
            <p className="text-destructive text-sm">
              {getApiErrorMessage(createMutation.error, "Erro ao criar safra/cultura.")}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
