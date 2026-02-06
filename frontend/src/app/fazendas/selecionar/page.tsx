'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useMinhasFazendas } from '@/hooks/useMinhasFazendas'
import { useFazendaAtiva } from '@/contexts/FazendaContext'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, Cow } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/errors'

function SelecionarFazendaContent() {
  const { isAuthenticated, isReady } = useAuth()
  const { fazendas, isLoading } = useMinhasFazendas()
  const { setFazendaAtiva } = useFazendaAtiva()
  const router = useRouter()
  const [error, setError] = useState('')
  const [selecting, setSelecting] = useState<number | null>(null)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    // Se tem apenas uma fazenda, selecionar automaticamente
    if (!isLoading && fazendas.length === 1) {
      handleSelect(fazendas[0].id)
    }
    // Se não tem fazendas, redirecionar para onboarding
    if (!isLoading && fazendas.length === 0) {
      router.replace('/onboarding')
    }
  }, [isReady, isAuthenticated, isLoading, fazendas.length, router])

  const handleSelect = async (fazendaId: number) => {
    setError('')
    setSelecting(fazendaId)
    try {
      const fazenda = fazendas.find((f) => f.id === fazendaId)
      if (!fazenda) {
        throw new Error('Fazenda não encontrada')
      }
      await setFazendaAtiva(fazenda)
      router.push(`/fazendas/${fazendaId}/animais`)
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Erro ao selecionar fazenda. Tente novamente.'
        )
      )
    } finally {
      setSelecting(null)
    }
  }

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

  if (fazendas.length === 0) {
    return null
  }

  if (fazendas.length === 1) {
    return (
      <PageContainer variant="centered">
        <p className="text-muted-foreground">Redirecionando…</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="centered">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Selecione uma fazenda</h1>
          <p className="text-muted-foreground">
            Você tem acesso a {fazendas.length} fazendas. Selecione qual deseja
            usar agora.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fazendas.map((fazenda) => (
            <Card
              key={fazenda.id}
              className="transition-colors hover:bg-accent/50 cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{fazenda.nome}</CardTitle>
                      {fazenda.localizacao && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{fazenda.localizacao}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Cow className="h-4 w-4" />
                  <span>{fazenda.quantidade_vacas} animais</span>
                </div>
                <Button
                  onClick={() => handleSelect(fazenda.id)}
                  disabled={selecting === fazenda.id}
                  className="w-full min-h-[44px]"
                  size="lg"
                >
                  {selecting === fazenda.id
                    ? 'Selecionando…'
                    : 'Selecionar esta fazenda'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}

export default function SelecionarFazendaPage() {
  return (
    <Suspense
      fallback={
        <PageContainer variant="centered">
          <p className="text-muted-foreground">Carregando…</p>
        </PageContainer>
      }
    >
      <SelecionarFazendaContent />
    </Suspense>
  )
}
