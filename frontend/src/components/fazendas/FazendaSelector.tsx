'use client'

import { useRouter } from 'next/navigation'
import { useMinhasFazendas } from '@/hooks/useMinhasFazendas'
import { useFazendaAtiva } from '@/contexts/FazendaContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/errors'
import { useState } from 'react'

export function FazendaSelector() {
  const { fazendas, isLoading } = useMinhasFazendas()
  const { fazendaAtiva, setFazendaAtiva } = useFazendaAtiva()
  const router = useRouter()
  const [error, setError] = useState('')

  // Só mostrar se tiver múltiplas fazendas
  if (isLoading || fazendas.length <= 1) {
    return null
  }

  const handleChange = async (value: string) => {
    setError('')
    const fazendaId = parseInt(value, 10)
    if (isNaN(fazendaId)) return

    const fazenda = fazendas.find((f) => f.id === fazendaId)
    if (!fazenda) return

    try {
      await setFazendaAtiva(fazenda)
      router.push(`/fazendas/${fazendaId}`)
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, 'Erro ao selecionar fazenda. Tente novamente.')
      )
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={fazendaAtiva?.id.toString() ?? ''}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-[180px] min-w-0">
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
        </SelectContent>
      </Select>
      {error && (
        <span className="text-xs text-destructive truncate">{error}</span>
      )}
    </div>
  )
}
