/**
 * Ícone PWA 512x512 servido via Route Handler para evitar 404 na Vercel.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="64" fill="#0f766e"/>
  <text x="256" y="320" font-family="system-ui,sans-serif" font-size="220" font-weight="bold" fill="white" text-anchor="middle">C</text>
</svg>`;

export function GET() {
  return new Response(SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
