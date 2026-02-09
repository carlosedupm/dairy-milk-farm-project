/**
 * Serve o service worker via Route Handler para garantir que funcione na Vercel.
 */
const SW_SCRIPT = `/* Service worker mínimo para o CeialMilk PWA */
const CACHE_NAME = "ceialmilk-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;

export function GET() {
  return new Response(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
