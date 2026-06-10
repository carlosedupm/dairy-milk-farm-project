import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy (convenção do Next 16, substitui middleware.ts; runtime Node.js).
 *
 * Camada LEVE de rede: apenas checa a PRESENÇA do cookie de sessão
 * `ceialmilk_token` em rotas protegidas e redireciona para /login.
 * Não valida o JWT aqui — a validação real permanece no backend Go,
 * e a UX de auth continua no AuthContext/ProtectedRoute.
 *
 * Limitação cross-domain: o cookie é emitido pelo domínio da API.
 * Quando frontend e API estão em sites diferentes (ex.: Vercel + Render),
 * o cookie não chega ao servidor do frontend, então o proxy não pode
 * inferir "não autenticado" e passa direto (a proteção fica no client +
 * backend). Em dev (localhost:3000 + localhost:8080) o cookie é visível
 * e o redirect funciona.
 */

const PUBLIC_PATHS = new Set(['/', '/login', '/registro'])

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

/** O cookie da API só é visível ao frontend quando os hosts são same-site. */
function sessionCookieVisible(requestHostname: string): boolean {
  let apiHostname: string
  try {
    apiHostname = new URL(API_URL).hostname
  } catch {
    return false
  }
  if (apiHostname === requestHostname) return true
  if (isLocalHostname(apiHostname) && isLocalHostname(requestHostname)) return true
  return false
}

export function proxy(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  if (!sessionCookieVisible(hostname)) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get('ceialmilk_token')?.value)
  const hasRefresh = Boolean(request.cookies.get('ceialmilk_refresh_token')?.value)
  // Access token expira em 15 min; com refresh presente o client renova sozinho.
  if (hasSession || hasRefresh) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Tudo exceto:
     * - _next/static, _next/image (assets do Next)
     * - favicon.ico, sw.js, manifest.json, icons/ (PWA/estáticos)
     * - api/ (não há route handlers autenticados no frontend)
     * Rotas públicas (/, /login, /registro) são tratadas no código acima.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/|api/).*)',
  ],
}
