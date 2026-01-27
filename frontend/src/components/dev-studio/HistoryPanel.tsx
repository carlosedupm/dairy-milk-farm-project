'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as devStudioService from '@/services/devStudio'
import type { DevStudioRequest } from '@/services/devStudio'

type HistoryPanelProps = {
  onSelectRequest?: (request: DevStudioRequest) => void
  refreshTrigger?: number // Quando muda, força refresh
}

type StatusFilter = 'all' | 'pending' | 'validated' | 'implemented' | 'error'

export function HistoryPanel({ onSelectRequest, refreshTrigger }: HistoryPanelProps) {
  const [history, setHistory] = useState<DevStudioRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    loadHistory()
  }, [])

  // Recarregar histórico quando refreshTrigger mudar
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadHistory()
    }
  }, [refreshTrigger])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await devStudioService.getHistory()
      setHistory(data)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
      // Se for erro 429, manter histórico existente se houver
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { status?: number; data?: { error?: { message?: string } } } }).response
        if (res?.status === 429) {
          // Rate limit - não limpar histórico existente, apenas não atualizar
          setError('Limite de requisições atingido. O histórico não foi atualizado.')
          return
        }
        setError(res?.data?.error?.message || 'Erro ao carregar histórico.')
      } else {
        setError('Erro ao carregar histórico. Tente novamente mais tarde.')
      }
      // Só limpar histórico se não houver dados anteriores
      if (history.length === 0) {
        setHistory([])
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full'
    switch (status) {
      case 'validated':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Validado
          </span>
        )
      case 'implemented':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            PR Criado
          </span>
        )
      case 'cancelled':
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Cancelado
          </span>
        )
      case 'error':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Erro
          </span>
        )
      case 'pending':
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Pendente
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Requisições</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Requisições</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Buscar por prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="validated">Validado</option>
            <option value="implemented">PR Criado</option>
            <option value="cancelled">Cancelado</option>
            <option value="error">Erro</option>
          </select>
        </div>

        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-2">
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {history.length === 0
                ? 'Nenhuma requisição encontrada.'
                : 'Nenhuma requisição corresponde aos filtros.'}
            </p>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 border rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.prompt}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {item.pr_url && item.pr_number && (
                    <a
                      href={item.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      PR #{item.pr_number} →
                    </a>
                  )}
                  {onSelectRequest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectRequest(item)}
                      className="text-xs"
                    >
                      Abrir
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadHistory}
          className="w-full"
        >
          Atualizar
        </Button>
      </CardContent>
    </Card>
  )
}
