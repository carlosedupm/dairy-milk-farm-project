'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useMinhasFazendas } from '@/hooks/useMinhasFazendas'
import { useFazendaAtiva } from '@/contexts/FazendaContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Plus } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/errors'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type FazendaSelectorProps = {
  /** `drawer`: trigger em largura total no menu mobile */
  density?: 'header' | 'drawer'
  /** Mantém a rota actual após escolher (ex.: empty state de listagens). */
  stayOnPage?: boolean
}

export function FazendaSelector({ density = 'header', stayOnPage = false }: FazendaSelectorProps) {
  const { user } = useAuth()
  const { fazendas, isLoading } = useMinhasFazendas({
    enabled: !!user,
  })
  const { fazendaAtiva, setFazendaAtiva } = useFazendaAtiva()
  const router = useRouter()
  const [error, setError] = useState('')
  const isProprietario = user?.perfil === 'PROPRIETARIO'

  if (!user) {
    return null
  }

  if (isLoading && fazendas.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[44px] min-w-0 items-center gap-2 text-sm text-muted-foreground',
          density === 'drawer' && 'w-full px-3 py-2'
        )}
        aria-live="polite"
      >
        <Building2 className="h-4 w-4 shrink-0" aria-hidden />
        A carregar fazendas…
      </div>
    )
  }

  if (!isLoading && fazendas.length === 0) {
    return null
  }

  if (fazendas.length === 1) {
    const nome =
      (fazendaAtiva?.nome ?? fazendas[0]?.nome ?? '').trim() || 'Fazenda'
    if (density === 'drawer') {
      return (
        <div className="flex min-w-0 w-full items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5">
          <Building2
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Fazenda ativa</p>
            <p
              className="truncate text-sm font-medium text-foreground"
              title={nome}
            >
              {nome}
            </p>
          </div>
        </div>
      )
    }
    return (
      <div
        className="flex min-w-0 max-w-full items-center justify-end gap-1.5 text-sm"
        title={nome}
      >
        <Building2
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="max-w-[200px] truncate font-medium text-foreground lg:max-w-[220px]">
          {nome}
        </span>
      </div>
    )
  }

  const handleChange = async (value: string) => {
    setError('')
    const fazendaId = parseInt(value, 10)
    if (isNaN(fazendaId)) return

    const fazenda = fazendas.find((f) => f.id === fazendaId)
    if (!fazenda) return

    try {
      await setFazendaAtiva(fazenda)
      if (!stayOnPage) {
        router.push(`/fazendas/${fazendaId}`)
      }
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, 'Erro ao selecionar fazenda. Tente novamente.')
      )
    }
  }

  const ativaNome = fazendaAtiva?.nome ?? 'Selecione uma fazenda'

  const select = (
    <Select
      value={fazendaAtiva?.id.toString() ?? ''}
      onValueChange={handleChange}
    >
      <SelectTrigger
        className={cn(
          'min-w-0',
          density === 'drawer'
            ? 'h-11 w-full max-w-full'
            : 'h-9 w-full max-w-full'
        )}
        aria-label={`Trocar fazenda ativa. Atual: ${ativaNome}`}
      >
        <SelectValue placeholder="Selecione uma fazenda">
          {fazendaAtiva?.nome ?? 'Selecione'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {fazendas.map((fazenda) => (
          <SelectItem key={fazenda.id} value={fazenda.id.toString()}>
            {fazenda.nome}
          </SelectItem>
        ))}
        {isProprietario ? (
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              className="flex min-h-[40px] w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-foreground outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                router.push('/fazendas/criar-minha')
              }}
            >
              <Plus
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              Nova fazenda
            </button>
          </div>
        ) : null}
      </SelectContent>
    </Select>
  )

  if (density === 'header') {
    return (
      <div className="flex w-full min-w-0 max-w-[min(260px,30vw)] flex-col items-end gap-1 lg:max-w-[280px]">
        <span className="text-xs font-medium leading-none text-muted-foreground">
          Fazenda ativa
        </span>
        {select}
        {error ? (
          <span className="text-xs text-destructive truncate px-0.5">{error}</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 w-full flex-col gap-1">
      <div className="flex min-w-0 w-full items-center gap-2">
        <Building2
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1">{select}</div>
      </div>
      {error ? (
        <span className="text-xs text-destructive truncate px-0.5">{error}</span>
      ) : null}
    </div>
  )
}
