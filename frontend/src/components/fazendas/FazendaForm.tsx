'use client'

import { useState, useEffect } from 'react'
import type { Fazenda, FazendaCreate } from '@/services/fazendas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  const [nome, setNome] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [quantidadeVacas, setQuantidadeVacas] = useState(0)
  const [fundacao, setFundacao] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initial) {
      setNome(initial.nome)
      setLocalizacao(initial.localizacao ?? '')
      setQuantidadeVacas(initial.quantidade_vacas)
      setFundacao(
        initial.fundacao
          ? initial.fundacao.slice(0, 10)
          : ''
      )
    }
  }, [initial])

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
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'error' in err.response.data
          ? String((err.response.data as { error?: string }).error)
          : 'Erro ao salvar. Tente novamente.'
      setError(msg)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? 'Editar fazenda' : 'Nova fazenda'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando…' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
