"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { getApiErrorMessage } from "@/lib/errors";

type Props = {
  isLoading: boolean;
  error: unknown;
  errorFallback: string;
  onRetry?: () => void;
  children: React.ReactNode;
};

/**
 * Tripé padrão para listagens com TanStack Query: carregando, erro da API, conteúdo.
 */
export function QueryListContent({
  isLoading,
  error,
  errorFallback,
  onRetry,
  children,
}: Props) {
  if (isLoading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }
  if (error) {
    return (
      <EmptyState
        variant="error"
        title="Não foi possível carregar os dados"
        description={getApiErrorMessage(error, errorFallback)}
        primaryAction={
          onRetry
            ? { label: "Tentar novamente", onClick: onRetry }
            : undefined
        }
      />
    );
  }
  return <>{children}</>;
}
