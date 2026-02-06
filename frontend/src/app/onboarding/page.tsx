'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useMinhasFazendas } from '@/hooks/useMinhasFazendas'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, Info } from 'lucide-react'

function OnboardingContent() {
  const { user, isReady, isAuthenticated, logout } = useAuth()
  const { fazendas, isLoading } = useMinhasFazendas()
  const router = useRouter()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    // Se já tem fazendas, redirecionar
    if (!isLoading && fazendas.length > 0) {
      router.replace('/fazendas')
    }
  }, [isReady, isAuthenticated, isLoading, fazendas.length, router])

  if (!isReady || isLoading) {
    return (
      <PageContainer variant="centered">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    )
  }

  if (!isAuthenticated) {
    return (
      <PageContainer variant="centered">
        <p className="text-muted-foreground">Redirecionando…</p>
      </PageContainer>
    )
  }

  // Se tem fazendas, não mostrar onboarding
  if (fazendas.length > 0) {
    return null
  }

  const isAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER'

  return (
    <PageContainer variant="centered">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            Bem-vindo ao CeialMilk, {user?.nome || 'usuário'}!
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Sistema de gestão completo para fazendas leiteiras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Para começar a usar o sistema, você precisa ter acesso a pelo
              menos uma fazenda.
            </p>

            {isAdmin ? (
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Você é um administrador</p>
                    <p className="text-sm text-muted-foreground">
                      Como administrador, você pode criar novas fazendas e
                      gerenciar o sistema.
                    </p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button asChild size="lg" className="min-h-[44px]">
                    <Link href="/fazendas/nova">
                      <Building2 className="mr-2 h-5 w-5" />
                      Criar primeira fazenda
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      Acesso às fazendas necessário
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Para acessar o sistema, um administrador precisa vincular
                      fazendas à sua conta. Entre em contato com o
                      administrador do sistema para solicitar acesso.
                    </p>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Após o administrador vincular fazendas à sua conta, você
                    poderá acessar o sistema normalmente.
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      logout()
                    }}
                  >
                    Voltar para login
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <PageContainer variant="centered">
          <p className="text-muted-foreground">Carregando…</p>
        </PageContainer>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
