"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { EscalaFolga, FolgasRodizioDia } from "@/services/folgas";
import { labelRodizioPrevisto } from "./folgas-rodizio-utils";

type FolgasDiaDetalhesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  lista: EscalaFolga[];
  rodizioDia: FolgasRodizioDia | null;
  excecaoMotivoDia: string | null;
  canManage: boolean;
  isFuncionario: boolean;
  meuDia: boolean;
  userId: number | undefined;
  onAlterarDia: () => void;
  onJustificarDia: () => void;
};

export function FolgasDiaDetalhesDialog({
  open,
  onOpenChange,
  date,
  lista,
  rodizioDia,
  excecaoMotivoDia,
  canManage,
  isFuncionario,
  meuDia,
  userId,
  onAlterarDia,
  onJustificarDia,
}: FolgasDiaDetalhesDialogProps) {
  const tituloData = date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : "";
  const previsto = labelRodizioPrevisto(rodizioDia ?? undefined);
  const podeVerExcecao = !!excecaoMotivoDia && (canManage || (isFuncionario && meuDia));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="capitalize">{tituloData}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Detalhes da folga do dia e ações disponíveis para o seu perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-base">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="font-medium">Rodízio previsto</p>
            <p className="text-muted-foreground">{previsto ?? "Sem previsão de folga para esta data."}</p>
          </div>

          <div className="space-y-2">
            <p className="font-medium">Folgas registradas</p>
            {lista.length === 0 && <p className="text-muted-foreground">Nenhuma folga registrada.</p>}
            {lista.map((e) => {
              const nome = e.usuario_nome || `Usuário #${e.usuario_id}`;
              const podeVerMotivo =
                canManage || (isFuncionario && userId != null && e.usuario_id === userId);
              return (
                <div key={e.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{nome}</p>
                    {e.origem === "MANUAL" && <Badge variant="outline">Ajuste manual</Badge>}
                    {e.justificada && <Badge variant="secondary">Justificada</Badge>}
                  </div>
                  {podeVerMotivo && e.motivo?.trim() && (
                    <p className="mt-1 text-muted-foreground">Motivo: {e.motivo.trim()}</p>
                  )}
                </div>
              );
            })}
          </div>

          {podeVerExcecao && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="font-medium">Exceção do dia</p>
              <p className="text-muted-foreground">{excecaoMotivoDia}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {canManage && (
            <Button type="button" size="lg" onClick={onAlterarDia}>
              Alterar dia
            </Button>
          )}
          {isFuncionario && meuDia && (
            <Button type="button" size="lg" onClick={onJustificarDia}>
              Justificar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
