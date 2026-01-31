'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, List, Droplets } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, isReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isReady, isAuthenticated, router])

  if (!isReady) {
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

  const atalhos = [
    {
      href: '/fazendas',
      title: 'Ver fazendas',
      description: 'Ver e gerenciar suas fazendas',
      icon: Building2,
    },
    {
      href: '/animais',
      title: 'Ver animais',
      description: 'Consultar e cadastrar animais do rebanho',
      icon: List,
    },
    {
      href: '/producao/novo',
      title: 'Registrar produção',
      description: 'Registrar produção de leite',
      icon: Droplets,
    },
  ]

  return (
    <PageContainer variant="default">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Início</h1>
        <p className="text-muted-foreground mt-1">
          O que você precisa fazer hoje?
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {atalhos.map(({ href, title, description, icon: Icon }) => (
          <Card key={href} className="transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <CardTitle className="text-lg">
                <Link
                  href={href}
                  className="flex min-h-[44px] items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {title}
                </Link>
              </CardTitle>
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full min-h-[44px]">
                <Link href={href}>{title}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  )
}
