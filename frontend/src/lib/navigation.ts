/**
 * Navegação com reload completo do documento (reinicia estado em memória).
 * Usa URL absoluta para não disparar `@next/next/no-location-assign-relative-destination`.
 * Para navegação in-app sem reload, preferir `useRouter().push/replace`.
 */
export function hardNavigate(path: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(new URL(path, window.location.origin).href);
}
