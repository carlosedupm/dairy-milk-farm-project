"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

type Props = {
  dataFiltro: string;
  onDataFiltroChange: (value: string) => void;
};

export function ToquesListToolbar({ dataFiltro, onDataFiltroChange }: Props) {
  return (
    <div className="mb-4 max-w-xs space-y-2">
      <Label htmlFor="filtro-data-toques">Dia da palpação</Label>
      <DatePicker
        id="filtro-data-toques"
        value={dataFiltro}
        onChange={onDataFiltroChange}
        placeholder="Selecione o dia"
      />
    </div>
  );
}
