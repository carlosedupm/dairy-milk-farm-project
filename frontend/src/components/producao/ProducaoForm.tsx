'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ProducaoLeite, ProducaoCreate, Qualidade } from '@/services/producao'
import { QUALIDADES, QUALIDADE_LABELS } from '@/services/producao'
import { list as listFazendas, type Fazenda } from '@/services/fazendas'
import { listByFazenda as listAnimaisByFazenda, type Animal } from '@/services/animais'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/errors'

type Props = {
  initial?: ProducaoLeite | null
  onSubmit: (payload: ProducaoCreate) => Promise<void>
  isPending?: boolean
  submitLabel?: string
  defaultFazendaId?: number
  defaultAnimalId?: number
}

export function ProducaoForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = 'Salvar',
  defaultFazendaId,
  defaultAnimalId,
}: Props) {
  const [fazendaId, setFazendaId] = useState<number>(defaultFazendaId ?? 0)
  const [animalId, setAnimalId] = useState<number>(initial?.animal_id ?? defaultAnimalId ?? 0)
  const [dataHora, setDataHora] = useState(
    initial?.data_hora 
      ? initial.data_hora.slice(0, 16) // YYYY-MM-DDTHH:mm
      : new Date().toISOString().slice(0, 16)
  )
  const [quantidade, setQuantidade] = useState<string>(
    initial?.quantidade?.toString() ?? ''
  )
  const [qualidade, setQualidade] = useState<Qualidade | undefined>(
    (initial?.qualidade as Qualidade) ?? undefined
  )
  const [error, setError] = useState('')

  const { data: fazendas = [] } = useQuery<Fazenda[]>({
    queryKey: ['fazendas'],
    queryFn: listFazendas,
  })

  // Buscar animais da fazenda selecionada
  const { data: animais = [] } = useQuery<Animal[]>({
    queryKey: ['animais', 'fazenda', fazendaId],
    queryFn: () => listAnimaisByFazenda(fazendaId),
    enabled: fazendaId > 0,
  })

  // Se tiver defaultFazendaId mas ainda não foi setado, setar quando carregar
  useEffect(() => {
    if (defaultFazendaId && fazendaId === 0) {
      setFazendaId(defaultFazendaId)
    }
  }, [defaultFazendaId, fazendaId])

  // Se tiver defaultAnimalId mas ainda não foi setado, setar quando carregar
  useEffect(() => {
    if (defaultAnimalId && animalId === 0) {
      setAnimalId(defaultAnimalId)
    }
  }, [defaultAnimalId, animalId])

  // Resetar animal quando trocar de fazenda (exceto se for inicial ou default)
  useEffect(() => {
    if (!initial && !defaultAnimalId) {
      setAnimalId(0)
    }
  }, [fazendaId, initial, defaultAnimalId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!animalId || animalId <= 0) {
      setError('Selecione um animal.')
      return
    }
    const qtd = parseFloat(quantidade)
    if (isNaN(qtd) || qtd <= 0) {
      setError('Quantidade deve ser maior que zero.')
      return
    }

    const payload: ProducaoCreate = {
      animal_id: animalId,
      quantidade: qtd,
      data_hora: dataHora ? `${dataHora}:00` : undefined,
      qualidade: qualidade,
    }

    try {
      await onSubmit(payload)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao salvar. Tente novamente.'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? 'Editar produção' : 'Registrar produção'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fazenda">Fazenda</Label>
              <Select
                value={fazendaId?.toString() ?? ''}
                onValueChange={(v) => setFazendaId(Number(v))}
                disabled={!!initial}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione para filtrar animais" />
                </SelectTrigger>
                <SelectContent>
                  {fazendas.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="animal">Animal *</Label>
              <Select
                value={animalId?.toString() ?? ''}
                onValueChange={(v) => setAnimalId(Number(v))}
                disabled={!fazendaId || fazendaId <= 0 || !!initial}
              >
                <SelectTrigger>
                  <SelectValue placeholder={fazendaId > 0 ? "Selecione um animal" : "Selecione uma fazenda primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {animais.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.identificacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataHora">Data/Hora</Label>
              <Input
                id="dataHora"
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade (litros) *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min={0}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Ex.: 25.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualidade">Qualidade (1-10)</Label>
              <Select 
                value={qualidade?.toString() ?? ''} 
                onValueChange={(v) => setQualidade(v ? Number(v) as Qualidade : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIDADES.map((q) => (
                    <SelectItem key={q} value={q.toString()}>
                      {QUALIDADE_LABELS[q]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-base text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? 'Salvando…' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
