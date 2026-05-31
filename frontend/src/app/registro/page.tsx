'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { register } from '@/services/auth'
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
import { toast } from '@/hooks/use-toast'
import { getApiErrorMessage } from '@/lib/errors'
import { validateRegistroForm, type FieldErrors } from '@/lib/form-validation'
import { getAreasMode, getDefaultLandingPath } from '@/config/appAccess'

function RegistroForm() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isValidationError, setIsValidationError] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated, isReady } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/login'

  // Redirecionar se já estiver autenticado, respeitando o perfil
  useEffect(() => {
    if (!isReady || !isAuthenticated || !user?.perfil) return
    const mode = getAreasMode(user.perfil)
    const target =
      mode === "full" ? "/fazendas" : getDefaultLandingPath(user.perfil)
    router.replace(target)
  }, [isReady, isAuthenticated, user?.perfil, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsValidationError(false)
    setFieldErrors({})

    const validation = validateRegistroForm({
      nome,
      email,
      password,
      confirmPassword,
    })
    if (!validation.valid) {
      setFieldErrors(validation.fields)
      setError(validation.summary ?? 'Corrija os campos assinalados.')
      setIsValidationError(true)
      return
    }

    setLoading(true)
    try {
      await register({ nome, email, password })
      toast.success('Conta criada')
      setSuccess(true)
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, 'Erro ao criar conta. Tente novamente.')
      )
      setIsValidationError(false)
    } finally {
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

  if (success) {
    return (
      <PageContainer variant="centered">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Conta criada</CardTitle>
            <CardDescription>
              Faça login com seu email e senha. Enquanto um administrador não
              vincular fazendas e não atribuir um perfil operacional (além de{' '}
              <strong>USER</strong>), o acesso aos módulos do sistema permanece
              limitado — isto é intencional para proteger os dados da exploração.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <section
              aria-labelledby="apos-registro-passos"
              className="rounded-lg border bg-muted/40 p-4 text-left"
            >
              <h2
                id="apos-registro-passos"
                className="text-sm font-semibold text-foreground"
              >
                Próximos passos para você
              </h2>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Fale com o administrador do CeialMilk na sua organização.</li>
                <li>
                  Aguarde a vinculação de pelo menos uma fazenda e a alteração do
                  seu perfil (ex.: Funcionário, Gerente ou Gestão).
                </li>
                <li>
                  Depois de fazer login, o sistema mostra o estado da sua conta;
                  enquanto a provisão não estiver concluída, continue a ver as
                  orientações nessa área (início ou onboarding).
                </li>
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                Prazo típico: muitas organizações respondem em até um dia útil;
                o tempo exato depende da sua equipa.
              </p>
            </section>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline hover:text-foreground">
                Ir para login agora
              </Link>
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="centered">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>
            Você receberá o perfil inicial <strong>USER</strong> (acesso limitado). Um
            administrador do sistema deverá vincular fazendas e atribuir o perfil
            operacional adequado antes de você usar animais, produção e demais módulos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error?.trim() ? (
              <FormValidationAlert message={error} isValidation={isValidationError} />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-invalid={fieldErrors.nome ? true : undefined}
                required
              />
              <FormFieldError message={fieldErrors.nome} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
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
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={fieldErrors.senha ? true : undefined}
                required
                minLength={6}
              />
              <FormFieldError message={fieldErrors.senha} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                required
              />
              <FormFieldError message={fieldErrors.confirmPassword} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando conta…' : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="underline hover:text-foreground">
              Faça login
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function RegistroPage() {
  return (
    <Suspense
      fallback={
        <PageContainer variant="centered">
          <p className="text-muted-foreground">Carregando…</p>
        </PageContainer>
      }
    >
      <RegistroForm />
    </Suspense>
  )
}
