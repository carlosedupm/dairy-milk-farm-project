'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { getApiErrorMessage } from '@/lib/errors'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, isReady } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/fazendas'

  // Redirecionar se já estiver autenticado (usando useEffect para evitar erro no React 19)
  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(redirect)
    }
  }, [isReady, isAuthenticated, router, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.replace(redirect)
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, 'Erro ao fazer login. Verifique email e senha.')
      )
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

  return (
    <PageContainer variant="centered">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CeialMilk</CardTitle>
          <CardDescription>Entre com seu email e senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ceialmilk.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
