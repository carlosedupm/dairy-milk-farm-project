"use client";

import { Suspense } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { ListCardLayout } from "@/components/layout/ListCardLayout";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { AlertasListToolbar } from "@/components/alertas/AlertasListToolbar";
import { AlertasTable } from "@/components/alertas/AlertasTable";
import { CriarAlertaDialog } from "@/components/alertas/CriarAlertaDialog";
import { Button } from "@/components/ui/button";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { ListPaginationBar } from "@/components/ui/pagination";
import { useAlertasPage } from "@/hooks/useAlertasPage";
import { formatListCountSuffix } from "@/lib/filter-url";
import {
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { Plus } from "lucide-react";

function AlertasContent() {
  const {
    fazendaReady,
    fazendaAtiva,
    fazendaId,
    animais,
    alertas,
    total,
    isLoading,
    isFetching,
    error,
    refetch,
    offset,
    setOffset,
    pageSize,
    filters,
    hasActiveFilters,
    setStatusFilter,
    setSeveridadeFilter,
    setStartDate,
    setEndDate,
    onTipoChange,
    onClearFilters,
    canCreate,
    canResolve,
    canEmAndamento,
    canDelete,
    statusMutation,
    onStatusChange,
    invalidate,
    createOpen,
    setCreateOpen,
  } = useAlertasPage();

  if (fazendaReady && !fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <p className="text-muted-foreground">
          Selecione uma fazenda no topo da página para ver os alertas.
        </p>
      </PageContainer>
    );
  }

  if (!fazendaReady || !fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <p className="text-muted-foreground">A carregar…</p>
      </PageContainer>
    );
  }

  const statusErrorMsg = statusMutation.error
    ? getApiErrorMessage(statusMutation.error, "Erro ao atualizar status.")
    : "";

  const titleSuffix = formatListCountSuffix({
    filtered: total,
    total,
    filtersActive: hasActiveFilters,
  });

  return (
    <PageContainer variant="default">
      <ListCardLayout
        title={`Alertas – ${fazendaAtiva.nome}${titleSuffix}`}
        action={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" aria-hidden />
              Novo alerta
            </Button>
          ) : null
        }
      >
        <AlertasListToolbar
          filters={filters}
          onStatusChange={setStatusFilter}
          onTipoChange={onTipoChange}
          onSeveridadeChange={setSeveridadeFilter}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
          onClear={onClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar alertas."
          onRetry={() => void refetch()}
        >
          <div className="space-y-4">
            <AlertasTable
              items={alertas}
              fazendaId={fazendaId}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={onClearFilters}
              canEmAndamento={canEmAndamento}
              canResolve={canResolve}
              canDelete={canDelete}
              onStatusChange={onStatusChange}
              onDeleteSuccess={invalidate}
            />
            {total > 0 ? (
              <ListPaginationBar
                total={total}
                pageSize={pageSize}
                offset={offset}
                onOffsetChange={setOffset}
              />
            ) : null}
          </div>
        </QueryListContent>

        {statusErrorMsg ? (
          <FormValidationAlert
            className="mt-2"
            title="Erro ao atualizar status"
            {...parsePrefixedConformidadeMessage(statusErrorMsg)}
          />
        ) : null}
      </ListCardLayout>

      <CriarAlertaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        fazendaId={fazendaId}
        animais={animais}
        onSuccess={invalidate}
      />
    </PageContainer>
  );
}

export default function AlertasPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <PageContainer>
            <p className="text-muted-foreground text-sm">A carregar…</p>
          </PageContainer>
        }
      >
        <AlertasContent />
      </Suspense>
    </ProtectedRoute>
  );
}
