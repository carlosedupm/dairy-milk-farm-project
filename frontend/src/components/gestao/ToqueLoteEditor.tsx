"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CLASSIFICACOES_OPERACIONAIS,
  type ClassificacaoOperacional,
} from "@/lib/toquesUtils";
import { Plus, Trash2 } from "lucide-react";

export type ToqueLoteLinha = {
  id: string;
  identificacao: string;
  classificacao: ClassificacaoOperacional;
  observacoes: string;
  gestacaoValor: string;
  gestacaoUnidade: "dias" | "meses";
};

export function emptyToqueLoteLinha(): ToqueLoteLinha {
  return {
    id: crypto.randomUUID(),
    identificacao: "",
    classificacao: "PRENHA",
    observacoes: "",
    gestacaoValor: "",
    gestacaoUnidade: "meses",
  };
}

type Props = {
  linhas: ToqueLoteLinha[];
  onLinhasChange: (linhas: ToqueLoteLinha[]) => void;
  resultado?: {
    sucesso: number;
    falhas: { linha: number; identificacao: string; message: string }[];
  } | null;
};

export function ToqueLoteEditor({ linhas, onLinhasChange, resultado }: Props) {
  function updateLinha(id: string, patch: Partial<ToqueLoteLinha>) {
    onLinhasChange(
      linhas.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  }

  function removeLinha(id: string) {
    if (linhas.length <= 1) return;
    onLinhasChange(linhas.filter((l) => l.id !== id));
  }

  return (
    <>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identificação</TableHead>
              <TableHead>Diagnóstico</TableHead>
              <TableHead>OBS</TableHead>
              <TableHead>Idade gest.</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha) => (
              <TableRow key={linha.id}>
                <TableCell>
                  <Input
                    value={linha.identificacao}
                    onChange={(e) =>
                      updateLinha(linha.id, { identificacao: e.target.value })
                    }
                    placeholder="Brinco"
                    aria-label="Identificação do animal"
                    className="text-foreground"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={linha.classificacao}
                    onValueChange={(v) =>
                      updateLinha(linha.id, {
                        classificacao: v as ClassificacaoOperacional,
                      })
                    }
                  >
                    <SelectTrigger className="text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSIFICACOES_OPERACIONAIS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={linha.observacoes}
                    onChange={(e) =>
                      updateLinha(linha.id, { observacoes: e.target.value })
                    }
                    placeholder="OBS"
                    className="text-foreground"
                  />
                </TableCell>
                <TableCell>
                  {linha.classificacao === "PRENHA" ? (
                    <div className="flex gap-1 min-w-[8rem]">
                      <Input
                        value={linha.gestacaoValor}
                        onChange={(e) =>
                          updateLinha(linha.id, {
                            gestacaoValor: e.target.value,
                          })
                        }
                        placeholder="5"
                        className="w-16 text-foreground"
                      />
                      <Select
                        value={linha.gestacaoUnidade}
                        onValueChange={(v) =>
                          updateLinha(linha.id, {
                            gestacaoUnidade: v as "dias" | "meses",
                          })
                        }
                      >
                        <SelectTrigger className="w-24 text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meses">m</SelectItem>
                          <SelectItem value="dias">d</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLinha(linha.id)}
                    aria-label="Remover linha"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button
        type="button"
        variant="outline"
        className="min-h-[44px]"
        onClick={() => onLinhasChange([...linhas, emptyToqueLoteLinha()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar linha
      </Button>

      {resultado ? (
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <p>
            <span className="font-medium">{resultado.sucesso}</span> registro(s)
            gravado(s).
          </p>
          {resultado.falhas.length > 0 ? (
            <ul className="space-y-1 text-destructive text-base">
              {resultado.falhas.map((f) => (
                <li key={`${f.linha}-${f.identificacao}`}>
                  Linha {f.linha} ({f.identificacao}): {f.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
