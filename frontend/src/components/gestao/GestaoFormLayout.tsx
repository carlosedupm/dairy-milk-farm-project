"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  backHref: string;
  children: React.ReactNode;
  submitLabel?: string;
  onSubmit: () => void;
  isPending?: boolean;
  error?: string;
  submitDisabled?: boolean;
};

export function GestaoFormLayout({
  title,
  backHref,
  children,
  submitLabel = "Registrar",
  onSubmit,
  isPending = false,
  error,
  submitDisabled = false,
}: Props) {
  return (
    <PageContainer variant="narrow">
      <BackLink href={backHref}>Voltar</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={submitDisabled || isPending}
            className="min-h-[44px]"
          >
            {isPending ? "Salvando…" : submitLabel}
          </Button>
          {error && (
            <p className="text-destructive text-base">{error}</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
