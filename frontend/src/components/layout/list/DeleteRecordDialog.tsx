"use client";

import { Button } from "@/components/ui/button";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  isPending?: boolean;
  confirmLabel?: string;
  /** Mensagem de erro da API (ex.: 409 Conflict) — mantém o diálogo aberto. */
  error?: string;
  /** Código INT-xxx / TMP-xxx quando a mensagem veio com prefixo de conformidade. */
  conformidadeCode?: string;
};

/**
 * Dialog de confirmação partilhado entre vista mobile e desktop da mesma tabela.
 */
export function DeleteRecordDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
  confirmLabel = "Excluir",
  error,
  conformidadeCode,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error?.trim() ? (
          <FormValidationAlert
            message={error}
            conformidadeCode={conformidadeCode}
            title="Não foi possível excluir"
          />
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="min-h-[44px]">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="min-h-[44px]"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Excluindo…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
