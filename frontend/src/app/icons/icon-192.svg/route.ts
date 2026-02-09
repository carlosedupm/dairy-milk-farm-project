/**
 * Ícone PWA 192x192 servido via Route Handler para evitar 404 na Vercel.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" fill="none">
  <rect width="192" height="192" rx="32" fill="#0f766e"/>
  <text x="96" y="118" font-family="system-ui,sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">C</text>
</svg>`;

export function GET() {
  return new Response(SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
