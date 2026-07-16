"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { FormFieldErrorsProvider } from "@/contexts/FormFieldErrorsContext";
import { parsePrefixedConformidadeMessage } from "@/lib/errors";
import type { FieldErrors } from "@/lib/form-validation";

type Props = {
  title: string;
  backHref: string;
  children: React.ReactNode;
  submitLabel?: string;
  onSubmit: () => void;
  isPending?: boolean;
  error?: string;
  errorConformidadeCode?: string;
  /** Erros de validação client-side (exibem título «Verifique os campos»). */
  isValidationError?: boolean;
  fieldErrors?: FieldErrors;
  submitDisabled?: boolean;
  /** Oculta o botão de submit (modo visualização / read-only). */
  hideSubmit?: boolean;
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
  isValidationError = false,
  fieldErrors,
  submitDisabled = false,
  hideSubmit = false,
}: Props) {
  const parsed = error ? parsePrefixedConformidadeMessage(error) : null;
  const displayMessage = parsed?.message ?? error ?? "";
  const displayCode = errorConformidadeCode ?? parsed?.conformidadeCode;
  const showAlert = Boolean(error?.trim());

  return (
    <PageContainer variant="narrow">
      <BackLink href={backHref}>Voltar</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {showAlert ? (
            <FormValidationAlert
              message={displayMessage}
              conformidadeCode={displayCode}
              isValidation={isValidationError}
            />
          ) : null}
          <FormFieldErrorsProvider fieldErrors={fieldErrors}>
            {children}
          </FormFieldErrorsProvider>
          {hideSubmit ? null : (
            <Button
              size="lg"
              onClick={onSubmit}
              disabled={submitDisabled || isPending}
              className="min-h-[44px]"
            >
              {isPending ? "Salvando…" : submitLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
