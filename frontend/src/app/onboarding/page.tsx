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

function PassosProvisaoSemFazenda() {
  return (
    <section
      aria-labelledby="passos-provisao-heading"
      className="rounded-lg border border-border/80 bg-muted/30 p-4 text-left"
    >
      <h2
        id="passos-provisao-heading"
        className="text-sm font-semibold text-foreground"
      >
        O que acontece a seguir
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          Entre em contato com quem administra o CeialMilk na sua organização e
          indique o email com que se registou.
        </li>
        <li>
          Um <strong>administrador da plataforma</strong> deve{' '}
          <strong>vincular</strong> a sua conta a fazenda(s) já existentes e
          atribuir um perfil operacional adequado (Funcionário, Gerente,
          Proprietário, etc.).
        </li>
        <li>
          Depois de ter fazenda e perfil adequados, ao fazer login, você terá acesso
          aos módulos autorizados (animais, produção, folgas, etc.).
        </li>
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Prazo:</strong> depende da sua
        organização. Em muitos casos o acesso é tratado em até{' '}
        <strong className="text-foreground">um dia útil</strong> após o
        administrador receber o seu pedido; o calendário exato depende da sua
        equipe.
      </p>
    </section>
  )
}

function PassosPerfilSoPendente() {
  return (
    <section
      aria-labelledby="passos-perfil-heading"
      className="rounded-lg border border-border/80 bg-muted/30 p-4 text-left"
    >
      <h2
        id="passos-perfil-heading"
        className="text-sm font-semibold text-foreground"
      >
        Falta apenas um passo
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          A sua conta já tem fazenda(s) vinculada(s) — obrigado por aguardar
          essa fase.
        </li>
        <li>
          Peça a um administrador que altere o seu perfil de{' '}
          <strong>USER</strong> para o perfil adequado à sua função (Funcionário,
          Gerente, Gestão, etc.), no painel de utilizadores.
        </li>
        <li>
          Assim que o perfil for atualizado, os módulos do sistema ficam
          disponíveis conforme as permissões desse perfil.
        </li>
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Prazo:</strong> normalmente breve
        assim que o administrador tratar o pedido; o tempo exato depende da sua
        organização.
      </p>
    </section>
  )
}

function FaqOnboarding() {
  return (
    <details className="rounded-lg border border-border/80 bg-background/50 text-left">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
        Perguntas frequentes
      </summary>
      <div className="space-y-4 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">
            Porque não consigo ver animais ou produção?
          </p>
          <p className="mt-1">
            Contas com perfil <strong>USER</strong> existem por razões de
            segurança: até ter fazenda e perfil adequados, o acesso a dados da
            exploração fica limitado. Um <strong>administrador da plataforma</strong>{' '}
            deve vincular a sua conta e definir o perfil operacional.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">
            Posso criar a minha própria fazenda nesta página?
          </p>
          <p className="mt-1">
            Não com perfil <strong>USER</strong>. O registo de novas explorações
            neste fluxo fica reservado a contas já com perfil{' '}
            <strong>Proprietário</strong> (titular). Quem acaba de criar conta
            deve aguardar que um <strong>administrador da plataforma</strong>{' '}
            vincule a conta a uma fazenda existente e defina o perfil adequado.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">Já falei com o administrador</p>
          <p className="mt-1">
            Volte a iniciar sessão mais tarde ou use «Ir ao início» para
            verificar se a provisão já foi concluída. Se continuar bloqueado,
            confirme com o administrador que o seu email está correto e que o
            perfil deixou de ser <strong>USER</strong>.
          </p>
        </div>
      </div>
    </details>
  )
}

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
    if (
      !isLoading &&
      fazendas.length > 0 &&
      user?.perfil !== 'USER'
    ) {
      router.replace('/fazendas')
    }
  }, [isReady, isAuthenticated, isLoading, fazendas.length, router, user?.perfil])

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

  if (fazendas.length > 0 && user?.perfil !== 'USER') {
    return null
  }

  const isAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER'
  const isUserPendingProfile = user?.perfil === 'USER'

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
            Bem-vindo ao CeialMilk, {user?.nome || 'utilizador'}!
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Sistema de gestão para fazendas leiteiras — próximos passos para
            começar a trabalhar na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Para utilizar animais, produção, folgas e os restantes módulos, a
              sua conta precisa de <strong>acesso a fazenda(s)</strong> e de um{' '}
              <strong>perfil adequado</strong>, atribuídos por um{' '}
              <strong>administrador da plataforma</strong>.
            </p>

            {isAdmin ? (
              <div className="space-y-4">
                <section
                  aria-labelledby="passos-admin-heading"
                  className="rounded-lg border border-border/80 bg-muted/30 p-4 text-left"
                >
                  <h2
                    id="passos-admin-heading"
                    className="text-sm font-semibold text-foreground"
                  >
                    Primeiros passos como administrador
                  </h2>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>Crie a primeira fazenda no sistema (dados da exploração).</li>
                    <li>
                      Convide a equipa: crie utilizadores ou oriente-os a
                      registarem-se; depois vincule fazendas e perfis no painel
                      de utilizadores.
                    </li>
                  </ol>
                </section>
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Você é um administrador</p>
                    <p className="text-sm text-muted-foreground">
                      Pode criar novas fazendas e gerir utilizadores, vínculos e
                      perfis de acesso.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
                  <Button asChild size="lg" className="min-h-[44px]">
                    <Link href="/fazendas/nova">
                      <Building2 className="mr-2 h-5 w-5" />
                      Criar primeira fazenda
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="min-h-[44px]" asChild>
                    <Link href="/admin/usuarios">Gerir utilizadores</Link>
                  </Button>
                </div>
              </div>
            ) : isUserPendingProfile && fazendas.length > 0 ? (
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Perfil operacional pendente</p>
                    <p className="text-sm text-muted-foreground">
                      A sua conta já está vinculada a fazenda(s), mas mantém o
                      perfil <strong>USER</strong>. É necessário que um
                      administrador altere o perfil no painel de utilizadores
                      para desbloquear os módulos.
                    </p>
                  </div>
                </div>
                <PassosPerfilSoPendente />
                <FaqOnboarding />
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/">Ir ao início</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      logout()
                    }}
                  >
                    Terminar sessão
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
                      Aguarde que um <strong>administrador da plataforma</strong>{' '}
                      vincule a sua conta a uma fazenda existente e defina o perfil
                      operacional adequado à sua função.
                    </p>
                  </div>
                </div>
                <PassosProvisaoSemFazenda />
                <FaqOnboarding />
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/">Ir ao início</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      logout()
                    }}
                  >
                    Terminar sessão
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
