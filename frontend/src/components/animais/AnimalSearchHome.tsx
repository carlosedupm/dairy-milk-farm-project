'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDatePtBr } from '@/lib/format'
import { type Animal, type AnimalContexto, getContexto, searchByIdentificacao } from '@/services/animais'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function formatNumberPtBr(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function AnimalSearchHome() {
  const [identificacao, setIdentificacao] = useState('')
  const [resultados, setResultados] = useState<Animal[]>([])
  const [contexto, setContexto] = useState<AnimalContexto | null>(null)
  const [loadingBusca, setLoadingBusca] = useState(false)
  const [loadingContexto, setLoadingContexto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [buscaExecutada, setBuscaExecutada] = useState(false)

  const totalResultados = useMemo(() => resultados.length, [resultados])

  async function handleBuscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const termo = identificacao.trim()
    if (!termo) {
      setErro('Informe a identificação do animal para pesquisar.')
      setBuscaExecutada(false)
      return
    }

    setLoadingBusca(true)
    setErro(null)
    setContexto(null)
    try {
      const items = await searchByIdentificacao(termo)
      setResultados(items)
      setBuscaExecutada(true)

      if (items.length === 1) {
        setLoadingContexto(true)
        const ctx = await getContexto(items[0].id)
        setContexto(ctx)
      }
    } catch (err: unknown) {
      setErro(getApiErrorMessage(err, 'Não foi possível pesquisar o animal agora.'))
      setResultados([])
      setBuscaExecutada(true)
    } finally {
      setLoadingBusca(false)
      setLoadingContexto(false)
    }
  }

  async function handleSelecionarAnimal(animalId: number) {
    setLoadingContexto(true)
    setErro(null)
    try {
      const ctx = await getContexto(animalId)
      setContexto(ctx)
    } catch (err: unknown) {
      setErro(getApiErrorMessage(err, 'Não foi possível carregar os detalhes do animal.'))
      setContexto(null)
    } finally {
      setLoadingContexto(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Busca inteligente de animal</CardTitle>
        <CardDescription>
          Pesquise pela identificação e veja um resumo com informações do animal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleBuscar} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={identificacao}
            onChange={(event) => setIdentificacao(event.target.value)}
            placeholder="Ex.: 123, vaca 45, novilha um"
            aria-label="Pesquisar animal por identificação"
          />
          <Button type="submit" size="lg" disabled={loadingBusca} className="sm:w-auto">
            <Search className="mr-2 h-4 w-4" />
            {loadingBusca ? 'Pesquisando...' : 'Pesquisar'}
          </Button>
        </form>

        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

        {buscaExecutada && !loadingBusca && totalResultados === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum animal encontrado para essa identificação.
          </p>
        ) : null}

        {totalResultados > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {totalResultados === 1
                ? '1 animal encontrado.'
                : `${totalResultados} animais encontrados.`}
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {resultados.map((animal) => (
                <Button
                  key={animal.id}
                  type="button"
                  variant={contexto?.animal.id === animal.id ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleSelecionarAnimal(animal.id)}
                  disabled={loadingContexto}
                >
                  {animal.identificacao} (Fazenda #{animal.fazenda_id})
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {loadingContexto ? <p className="text-sm text-muted-foreground">Carregando contexto...</p> : null}

        {contexto ? (
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium text-foreground">
              Animal: {contexto.animal.identificacao}
            </p>
            <p className="text-sm text-muted-foreground">
              Saúde: {contexto.animal.status_saude ?? 'Não informado'} | Reprodutivo:{' '}
              {contexto.animal.status_reprodutivo ?? 'Não informado'}
            </p>
            <p className="text-sm text-muted-foreground">
              Data de nascimento:{' '}
              {contexto.animal.data_nascimento ? formatDatePtBr(contexto.animal.data_nascimento) : 'Não informada'}
            </p>
            <p className="text-sm text-muted-foreground">
              Produção: {formatNumberPtBr(contexto.resumo_producao.total_litros)} L total | média{' '}
              {formatNumberPtBr(contexto.resumo_producao.media_litros)} L | registros:{' '}
              {contexto.resumo_producao.total_registros}
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/animais/${contexto.animal.id}`}>Abrir detalhes do animal</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
