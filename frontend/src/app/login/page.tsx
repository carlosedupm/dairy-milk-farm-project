'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageContainer } from '@/components/layout/PageContainer'
import { FormFieldError } from '@/components/ui/form-field-error'
import { FormValidationAlert } from '@/components/ui/form-validation-alert'
import { getApiErrorMessage } from '@/lib/errors'
import { validateLoginForm, type FieldErrors } from '@/lib/form-validation'
import {
  getAreasMode,
  getDefaultLandingPath,
  isPathAllowedForPerfil,
  isSafeInternalPath,
} from '@/config/appAccess'
import { getMinhasFazendas } from '@/services/fazendas'

function resolvePostLoginTarget(
  perfil: string | undefined,
  explicitRedirect: string | null
): string {
  if (
    explicitRedirect &&
    explicitRedirect !== '/login' &&
    isSafeInternalPath(explicitRedirect) &&
    isPathAllowedForPerfil(perfil, explicitRedirect)
  ) {
    return explicitRedirect
  }
  // Perfis com acesso pleno mantêm o fluxo legado por /fazendas
  // (a página decide entre /, /onboarding e /fazendas/selecionar).
  // Perfis restritos (ex.: FUNCIONARIO) ou USER pendente vão para a landing adequada.
  if (getAreasMode(perfil) === 'full') {
    return '/fazendas'
  }
  return getDefaultLandingPath(perfil)
}

/**
 * Para perfis com áreas restritas (ex.: FUNCIONARIO) ou USER pendente, pré-checa
 * se há fazenda vinculada antes de mandar para a landing. Sem vínculo, vai
 * direto para `/onboarding`, evitando o flash da landing → onboarding.
 * Falhas na pré-checagem não bloqueiam o login (cai no fluxo padrão).
 */
async function maybeRedirectToOnboarding(
  perfil: string | undefined,
  explicitRedirect: string | null
): Promise<string | null> {
  if (!perfil) return null
  if (getAreasMode(perfil) === 'full') return null
  if (
    explicitRedirect &&
    explicitRedirect !== '/login' &&
    isSafeInternalPath(explicitRedirect) &&
    isPathAllowedForPerfil(perfil, explicitRedirect)
  ) {
    return null
  }
  try {
    const fazendas = await getMinhasFazendas()
    if (fazendas.length === 0) return '/onboarding'
  } catch {
    return null
  }
  return null
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isValidationError, setIsValidationError] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const { login, user, isAuthenticated, isReady } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const explicitRedirect = searchParams.get('redirect')
  const hasRedirected = useRef(false)

  // Redirecionar usuário já autenticado que acessa /login (apenas uma vez)
  useEffect(() => {
    if (hasRedirected.current) return
    if (!isReady || !isAuthenticated || !user?.perfil) return
    if (pathname !== '/login') return

    hasRedirected.current = true
    const target = resolvePostLoginTarget(user.perfil, explicitRedirect)
    if (target !== '/login') {
      // Usar window.location para evitar loops do Next.js router
      window.location.href = target
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthenticated, user?.perfil])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsValidationError(false)
    setFieldErrors({})

    const validation = validateLoginForm({ email, password })
    if (!validation.valid) {
      setFieldErrors(validation.fields)
      setError(validation.summary ?? 'Corrija os campos assinalados.')
      setIsValidationError(true)
      return
    }

    setLoading(true)
    try {
      const logged = await login(email, password)
      hasRedirected.current = true
      const onboardingTarget = await maybeRedirectToOnboarding(
        logged?.perfil,
        explicitRedirect
      )
      const target =
        onboardingTarget ??
        resolvePostLoginTarget(logged?.perfil, explicitRedirect)
      router.replace(target)
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, 'Erro ao fazer login. Verifique email e senha.')
      )
      setIsValidationError(false)
      setLoading(false)
    }
  }

  if (isReady && isAuthenticated) {
    return (
      <PageContainer variant="centered">
        <p className="text-muted-foreground">Redirecionando…</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="centered">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CeialMilk</CardTitle>
          <CardDescription>Entre com seu email e senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error?.trim() ? (
              <FormValidationAlert message={error} isValidation={isValidationError} />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ceialmilk.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fieldErrors.email ? true : undefined}
                required
              />
              <FormFieldError message={fieldErrors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={fieldErrors.password ? true : undefined}
                required
              />
              <FormFieldError message={fieldErrors.password} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/registro" className="underline hover:text-foreground">
              Registre-se
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">
              Voltar para início
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <PageContainer variant="centered">
          <p className="text-muted-foreground">Carregando…</p>
        </PageContainer>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
