"use client";

import { getApiErrorMessage } from "@/lib/errors";

type Props = {
  isLoading: boolean;
  error: unknown;
  errorFallback: string;
  children: React.ReactNode;
};

/**
 * Tripé padrão para listagens com TanStack Query: carregando, erro da API, conteúdo.
 */
export function QueryListContent({
  isLoading,
  error,
  errorFallback,
  children,
}: Props) {
  if (isLoading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }
  if (error) {
    return (
      <p className="text-destructive">
        {getApiErrorMessage(error, errorFallback)}
      </p>
    );
  }
  return <>{children}</>;
}
