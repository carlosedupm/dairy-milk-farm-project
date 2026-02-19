"use client";

import type { Animal } from "@/services/animais";
import { getCategoriaLabel } from "@/services/animais";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Props = {
  animais: Animal[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Filtrar apenas fêmeas (para partos, coberturas, etc.) */
  femeasOnly?: boolean;
  /** Filtrar apenas touros e bois (para monta natural) */
  reprodutoresOnly?: boolean;
  id?: string;
};

/**
 * Seletor de animal com dropdown amplo para exibir o nome completo
 * sem precisar passar o mouse por cima.
 */
export function AnimalSelect({
  animais,
  value,
  onValueChange,
  label = "Animal",
  placeholder = "Selecione",
  disabled = false,
  femeasOnly = false,
  reprodutoresOnly = false,
  id,
}: Props) {
  const lista = femeasOnly
    ? animais.filter((a) => a.sexo === "F")
    : reprodutoresOnly
      ? animais.filter(
          (a) =>
            a.sexo === "M" &&
            (a.categoria === "TOURO" || a.categoria === "BOI")
        )
      : animais;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>{label}</Label>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className="max-h-[300px] min-w-[min(calc(100vw-2rem),22rem)] overflow-x-auto"
        >
          {lista.map((a) => (
            <SelectItem
              key={a.id}
              value={a.id.toString()}
              className="py-2"
            >
              {a.identificacao}
              {a.raca && (
                <span className="text-muted-foreground ml-1 text-xs">
                  ({a.raca})
                </span>
              )}
              {a.categoria && (
                <span className="text-muted-foreground ml-1 text-xs">
                  · {getCategoriaLabel(a.categoria)}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
