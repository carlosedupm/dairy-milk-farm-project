"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useGestaoAnimaisCacheRefresh } from "@/components/gestao/useAnimaisMap";

type Props = {
  title: string;
  backHref: string;
  /** Fazenda ativa — invalida cache `todos` ao montar (BR-BAIXA-009). */
  fazendaId?: number;
  newHref?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children: React.ReactNode;
};

export function GestaoListLayout({
  title,
  backHref,
  fazendaId,
  newHref,
  secondaryHref,
  secondaryLabel,
  children,
}: Props) {
  useGestaoAnimaisCacheRefresh(fazendaId);

  return (
    <PageContainer variant="default">
      <BackLink href={backHref}>Voltar à Gestão</BackLink>
      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4">
          <CardTitle>{title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {secondaryHref && secondaryLabel ? (
              <Button variant="outline" asChild>
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            ) : null}
            {newHref ? (
              <Button asChild>
                <Link href={newHref}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </PageContainer>
  );
}
