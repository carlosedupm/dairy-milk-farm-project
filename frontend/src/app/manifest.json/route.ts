/**
 * Serve o manifest do PWA via Route Handler para garantir que funcione na Vercel
 * (arquivos em public/ podem retornar 404 em produção com Root Directory).
 */
const MANIFEST = {
  name: "CeialMilk - Gestão de Fazendas Leiteiras",
  short_name: "CeialMilk",
  description: "Sistema completo de gestão para fazendas leiteiras",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#0f766e",
  orientation: "portrait-primary" as const,
  icons: [
    { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
    { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(MANIFEST), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
