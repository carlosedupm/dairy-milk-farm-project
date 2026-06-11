"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimalHormonioLactacaoList } from "@/components/animais/AnimalHormonioLactacaoList";
import { HormonioLactacaoEncerrarDialog } from "@/components/animais/HormonioLactacaoEncerrarDialog";
import { HormonioLactacaoProtocoloCard } from "@/components/animais/HormonioLactacaoProtocoloCard";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { ANIMAL_BAIXADO_ACAO_BLOQUEADA_MSG } from "@/components/animais/animalRebanhoUtils";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ListPaginationBar } from "@/components/ui/pagination";
import {
  canCriarHormonioLactacao,
  canEncerrarProtocoloHormonio,
} from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
import { formatDatePtBr } from "@/lib/format";
import {
  getProtocolo,
  hormonioLactacaoProtocoloQueryKey,
  hormoniosLactacaoListQueryKey,
  listByAnimal,
} from "@/services/animalHormoniosLactacao";
import { Plus } from "lucide-react";

const PAGE_SIZE = 20;

type Props = {
  animalId: number;
  fazendaId: number;
  foraDoRebanho: boolean;
  enabled: boolean;
};

export function AnimalFichaTabHormonioLactacao({
  animalId,
  fazendaId,
  foraDoRebanho,
  enabled,
}: Props) {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [encerrarOpen, setEncerrarOpen] = useState(false);

  const {
    data: allItems = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: hormoniosLactacaoListQueryKey(animalId),
    queryFn: () => listByAnimal(animalId),
    enabled: enabled && animalId > 0,
  });

  const { data: protocolo } = useQuery({
    queryKey: hormonioLactacaoProtocoloQueryKey(animalId),
    queryFn: () => getProtocolo(animalId),
    enabled: enabled && animalId > 0,
  });

  const pageItems = useMemo(
    () => allItems.slice(offset, offset + PAGE_SIZE),
    [allItems, offset],
  );

  const proximaDose = useMemo(() => {
    if (!allItems.length) return null;
    const ultima = allItems[0];
    return ultima.data_proxima_aplicacao ?? null;
  }, [allItems]);

  const canCriar = canCriarHormonioLactacao(user?.perfil);
  const canEncerrar = canEncerrarProtocoloHormonio(user?.perfil);
  const protocoloAtivo = protocolo?.status === "ATIVO";
  const showNova = canCriar && !foraDoRebanho;
  const showNovaBloqueada = canCriar && foraDoRebanho;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Hormônio de lactação
          </h2>
          {proximaDose ? (
            <p className="text-muted-foreground text-sm mt-1">
              Próxima dose prevista: {formatDatePtBr(proximaDose)}
            </p>
          ) : null}
          {foraDoRebanho ? (
            <p className="text-muted-foreground text-sm mt-1">
              Animal fora do rebanho — não é possível registrar novas aplicações.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showNova ? (
            <Button asChild className="min-h-[44px] shrink-0">
              <Link href={`/animais/${animalId}/hormonios-lactacao/novo`}>
                <Plus className="mr-2 h-4 w-4" />
                Nova aplicação
              </Link>
            </Button>
          ) : showNovaBloqueada ? (
            <TooltipProvider delayDuration={300}>
              <ButtonWithTooltip
                className="min-h-[44px] shrink-0"
                disabled
                tooltip={ANIMAL_BAIXADO_ACAO_BLOQUEADA_MSG}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova aplicação
              </ButtonWithTooltip>
            </TooltipProvider>
          ) : null}
          {canEncerrar && protocoloAtivo ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setEncerrarOpen(true)}
            >
              Encerrar protocolo
            </Button>
          ) : null}
        </div>
      </div>

      <HormonioLactacaoProtocoloCard protocolo={protocolo} />

      <QueryListContent
        isLoading={isLoading}
        error={error}
        errorFallback="Erro ao carregar aplicações."
      >
        <div className="space-y-4">
          <AnimalHormonioLactacaoList
            animalId={animalId}
            items={pageItems}
            perfil={user?.perfil}
          />
          {allItems.length > 0 ? (
            <ListPaginationBar
              total={allItems.length}
              pageSize={PAGE_SIZE}
              offset={offset}
              onOffsetChange={setOffset}
            />
          ) : null}
        </div>
      </QueryListContent>

      <HormonioLactacaoEncerrarDialog
        open={encerrarOpen}
        onOpenChange={setEncerrarOpen}
        animalId={animalId}
        fazendaId={fazendaId}
      />
    </div>
  );
}
