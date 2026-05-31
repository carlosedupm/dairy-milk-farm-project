"use client";

import { createContext, useContext } from "react";
import type { FieldErrors } from "@/lib/form-validation";

const FormFieldErrorsContext = createContext<FieldErrors | undefined>(undefined);

export function FormFieldErrorsProvider({
  fieldErrors,
  children,
}: {
  fieldErrors?: FieldErrors;
  children: React.ReactNode;
}) {
  return (
    <FormFieldErrorsContext.Provider value={fieldErrors}>
      {children}
    </FormFieldErrorsContext.Provider>
  );
}

export function useFormFieldErrors(): FieldErrors {
  return useContext(FormFieldErrorsContext) ?? {};
}

export function useFormFieldError(fieldKey: string): string | undefined {
  const errors = useFormFieldErrors();
  return errors[fieldKey];
}
