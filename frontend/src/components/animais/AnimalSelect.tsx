"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { coerceAnimaisList, CICLO_EMPTY_MESSAGES, type Animal, type CicloContext } from "@/services/animais";
import { useAnimaisCicloContext } from "@/components/animais/useAnimaisCicloContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import {
  ANIMAL_SELECT_MAX_VISIBLE,
  filterAnimais,
  formatAnimalOptionLabel,
} from "./animalSelectUtils";

const SEARCH_DEBOUNCE_MS = 150;

type Props = {
  animais?: Animal[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Filtrar apenas fêmeas (para partos, coberturas, etc.) */
  femeasOnly?: boolean;
  /** Filtrar apenas touros e bois (para monta natural) */
  reprodutoresOnly?: boolean;
  /** Excluir animais com baixa do rebanho */
  semDataSaida?: boolean;
  /** Contexto do ciclo reprodutivo — busca animais elegíveis no servidor */
  cicloContext?: CicloContext;
  fazendaId?: number;
  /** Modo edição: animal selecionado permanece visível fora do filtro */
  preserveSelected?: boolean;
  id?: string;
};

/**
 * Seletor de animal com busca por identificação, raça, categoria e status reprodutivo.
 */
export function AnimalSelect({
  animais = [],
  value,
  onValueChange,
  label = "Animal",
  placeholder = "Selecione",
  disabled = false,
  femeasOnly = false,
  reprodutoresOnly = false,
  semDataSaida = false,
  cicloContext,
  fazendaId,
  preserveSelected = false,
  id,
}: Props) {
  const listboxId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const debouncedQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const preserveAnimalId =
    preserveSelected && value ? Number(value) : undefined;

  const { animais: cicloAnimais, isLoading: loadingCiclo } = useAnimaisCicloContext(
    cicloContext ? fazendaId : undefined,
    cicloContext ?? "cobertura",
    { preserveAnimalId: preserveAnimalId && preserveAnimalId > 0 ? preserveAnimalId : undefined },
  );

  const sourceAnimais = cicloContext ? cicloAnimais : animais;

  const animaisList = useMemo(() => coerceAnimaisList(sourceAnimais), [sourceAnimais]);

  const selectedAnimal = useMemo(
    () => animaisList.find((a) => a.id.toString() === value),
    [animaisList, value],
  );

  const filteredAnimais = useMemo(
    () =>
      filterAnimais(animaisList, {
        query: debouncedQuery,
        femeasOnly,
        reprodutoresOnly,
        semDataSaida,
      }),
    [animaisList, debouncedQuery, femeasOnly, reprodutoresOnly, semDataSaida],
  );

  const visibleAnimais = useMemo(
    () => filteredAnimais.slice(0, ANIMAL_SELECT_MAX_VISIBLE),
    [filteredAnimais],
  );

  const hasMoreResults = filteredAnimais.length > ANIMAL_SELECT_MAX_VISIBLE;
  const hasSearchQuery = debouncedQuery.trim().length > 0;

  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setHighlightedIndex(0);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        resetSearch();
      }
    },
    [resetSearch],
  );

  const selectAnimal = useCallback(
    (animal: Animal) => {
      onValueChange(animal.id.toString());
      handleOpenChange(false);
    },
    [onValueChange, handleOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const safeHighlightedIndex =
    visibleAnimais.length === 0
      ? 0
      : Math.min(highlightedIndex, visibleAnimais.length - 1);

  useEffect(() => {
    if (!open || safeHighlightedIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${safeHighlightedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [safeHighlightedIndex, open]);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (visibleAnimais.length === 0) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleOpenChange(false);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((i) =>
          i < visibleAnimais.length - 1 ? i + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((i) =>
          i > 0 ? i - 1 : visibleAnimais.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        selectAnimal(visibleAnimais[safeHighlightedIndex]);
        break;
      case "Escape":
        event.preventDefault();
        handleOpenChange(false);
        break;
      default:
        break;
    }
  };

  const triggerId = id ?? `${listboxId}-trigger`;
  const searchId = `${listboxId}-search`;

  const emptyMessage = hasSearchQuery
    ? "Nenhum animal encontrado."
    : cicloContext
      ? CICLO_EMPTY_MESSAGES[cicloContext]
      : "Nenhum animal disponível.";

  const triggerLabel = loadingCiclo
    ? "Carregando animais…"
    : selectedAnimal
      ? formatAnimalOptionLabel(selectedAnimal)
      : placeholder;

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={triggerId}>{label}</Label> : null}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={triggerId}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            disabled={disabled || loadingCiclo}
            className={cn(
              "h-11 min-h-[44px] w-full justify-between px-3 font-normal",
              !selectedAnimal && "text-muted-foreground",
            )}
          >
            <span className="truncate text-left">
              {triggerLabel}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            <div className="border-b p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  ref={searchInputRef}
                  id={searchId}
                  type="search"
                  role="searchbox"
                  aria-controls={listboxId}
                  aria-activedescendant={
                    visibleAnimais[safeHighlightedIndex]
                      ? `${listboxId}-option-${visibleAnimais[safeHighlightedIndex].id}`
                      : undefined
                  }
                  aria-label="Buscar animal"
                  placeholder="Buscar por identificação, raça…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
            </div>

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={label || "Animais"}
              className="max-h-[min(300px,50vh)] overflow-y-auto p-1"
            >
              {visibleAnimais.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </p>
              ) : (
                visibleAnimais.map((animal, index) => {
                  const isSelected = value === animal.id.toString();
                  const isHighlighted = index === safeHighlightedIndex;
                  return (
                    <button
                      key={animal.id}
                      type="button"
                      role="option"
                      data-index={index}
                      aria-selected={isSelected}
                      id={`${listboxId}-option-${animal.id}`}
                      className={cn(
                        "flex min-h-[44px] w-full cursor-default items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none",
                        isHighlighted && "bg-accent text-accent-foreground",
                        isSelected && !isHighlighted && "font-medium",
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectAnimal(animal)}
                    >
                      <span className="flex-1 truncate">
                        {formatAnimalOptionLabel(animal)}
                      </span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0 opacity-70" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            {hasMoreResults ? (
              <p className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
                Mostrando {ANIMAL_SELECT_MAX_VISIBLE} de {filteredAnimais.length}.
                Digite para refinar a busca.
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
