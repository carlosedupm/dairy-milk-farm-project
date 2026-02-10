"use client";

import { useAssistente } from "@/contexts/AssistenteContext";
import { AssistenteInput } from "@/components/assistente/AssistenteInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Modal do assistente virtual, controlado pelo contexto.
 * Abre quando o FAB (ou qualquer chamada a openAssistente) é acionado.
 */
export function AssistenteDialog() {
  const { assistenteOpen, setAssistenteOpen, closeAssistente } = useAssistente();

  return (
    <Dialog open={assistenteOpen} onOpenChange={setAssistenteOpen}>
      <DialogContent
        className="sm:max-w-lg max-h-[100dvh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Assistente</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Digite ou fale o que você precisa. Ex: &quot;quantos animais tenho?&quot;, &quot;ver produção da fazenda&quot;, &quot;abrir fazenda X&quot;. Usa o contexto da sua fazenda ativa.
          </DialogDescription>
        </DialogHeader>
        <AssistenteInput onRequestClose={closeAssistente} />
      </DialogContent>
    </Dialog>
  );
}
