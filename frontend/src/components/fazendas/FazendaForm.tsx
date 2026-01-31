'use client'

import { useState } from 'react'
import type { Fazenda, FazendaCreate } from '@/services/fazendas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getApiErrorMessage } from '@/lib/errors'

type Props = {
  initial?: Fazenda | null
  onSubmit: (payload: FazendaCreate) => Promise<void>
  isPending?: boolean
  submitLabel?: string
}

export function FazendaForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = 'Salvar',
}: Props) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [localizacao, setLocalizacao] = useState(initial?.localizacao ?? '')
  const [quantidadeVacas, setQuantidadeVacas] = useState(initial?.quantidade_vacas ?? 0)
  const [fundacao, setFundacao] = useState(
    initial?.fundacao ? initial.fundacao.slice(0, 10) : ''
  )
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }
    const payload: FazendaCreate = {
      nome: nome.trim(),
      quantidadeVacas: Math.max(0, quantidadeVacas),
    }
    if (localizacao.trim()) payload.localizacao = localizacao.trim()
    if (fundacao.trim()) payload.fundacao = fundacao.trim()
    try {
      await onSubmit(payload)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao salvar. Tente novamente.'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? 'Editar fazenda' : 'Nova fazenda'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex.: Fazenda São João"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="localizacao">Localização</Label>
            <Input
              id="localizacao"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Ex.: Minas Gerais - MG"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantidadeVacas">Quantidade de vacas</Label>
            <Input
              id="quantidadeVacas"
              type="number"
              min={0}
              value={quantidadeVacas}
              onChange={(e) => setQuantidadeVacas(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundacao">Data de fundação</Label>
            <Input
              id="fundacao"
              type="date"
              value={fundacao}
              onChange={(e) => setFundacao(e.target.value)}
            />
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
