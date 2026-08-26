---
applyTo: "frontend/src/**/*.{ts,tsx}"
---

# Frontend UI — CeialMilk (Copilot)

Checklist canónico: `frontend/AGENTS.md`. Skill: `nova-pagina-ui`.

- Data: `DatePicker` / `DatePickerUnificado` — nunca `Input type="date"`.
- Data+hora: `DateTimePickerUnificado` (alias `DateTimePickerPtBr`) + `toDatetimeLocalInputValue`.
- Animal: `AnimalSelect` (operacional ou `cicloContext`).
- Litros: `LitrosInput` — não `Input type="number"`.
- Erros: `FormFieldError` + `FormValidationAlert` + `getApiErrorMessage`.
- Listagens: `ResponsiveListContainer`, `MobileListCard`, `ListRowActionsMenu`, `DeleteRecordDialog`, `QueryListContent`, `ListPaginationBar`.
- HTTP só em `services/` + TanStack Query.
- Cores de feedback: tokens `feedback-*` (ver design-tokens instructions).
