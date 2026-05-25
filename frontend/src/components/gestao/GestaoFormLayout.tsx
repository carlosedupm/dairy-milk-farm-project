"use client";

import { useEffect, useRef } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { parsePrefixedConformidadeMessage } from "@/lib/errors";

type Props = {
  title: string;
  backHref: string;
  children: React.ReactNode;
  submitLabel?: string;
  onSubmit: () => void;
  isPending?: boolean;
  error?: string;
  errorConformidadeCode?: string;
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
  errorConformidadeCode,
  submitDisabled = false,
}: Props) {
  const alertRef = useRef<HTMLDivElement>(null);
  const prevErrorRef = useRef<string | undefined>(undefined);

  const parsed = error ? parsePrefixedConformidadeMessage(error) : null;
  const displayMessage = parsed?.message ?? error ?? "";
  const displayCode = errorConformidadeCode ?? parsed?.conformidadeCode;

  useEffect(() => {
    const hadError = Boolean(prevErrorRef.current?.trim());
    const hasError = Boolean(error?.trim());
    prevErrorRef.current = error;
    if (!hadError && hasError) {
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  return (
    <PageContainer variant="narrow">
      <BackLink href={backHref}>Voltar</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          {error?.trim() ? (
            <div ref={alertRef}>
              <FormValidationAlert
                message={displayMessage}
                conformidadeCode={displayCode}
              />
            </div>
          ) : null}
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={submitDisabled || isPending}
            className="min-h-[44px]"
          >
            {isPending ? "Salvando…" : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
