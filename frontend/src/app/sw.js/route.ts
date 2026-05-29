/**
 * Serve o service worker via Route Handler para garantir que funcione na Vercel.
 */
const SW_SCRIPT = `/* Service worker CeialMilk PWA + Web Push */
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

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "CeialMilk", body: event.data.text() };
  }
  const title = payload.title || "CeialMilk";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.svg",
    badge: payload.badge || "/icons/icon-192.svg",
    data: payload.data || { url: "/alertas" },
    tag: payload.data?.url || "ceialmilk-alerta",
    renotify: true,
  };
  if (payload.data?.badgeCount && payload.data.badgeCount > 0) {
    options.badge = payload.badge || "/icons/icon-192.svg";
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/alertas";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.startsWith(self.location.origin)) {
            client.navigate(absoluteUrl);
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }
    })
  );
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
