'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PRStatusProps = {
  prNumber?: number | null
  prURL?: string | null
  branchName?: string | null
  status?: string
}

export function PRStatus({ prNumber, prURL, branchName, status }: PRStatusProps) {
  if (!prNumber || !prURL) {
    return null
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'implemented':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            PR Aberto
          </span>
        )
      case 'validated':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Validado
          </span>
        )
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Pendente
          </span>
        )
      case 'error':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Erro
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            {status || 'Desconhecido'}
          </span>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pull Request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-sm text-muted-foreground">#{prNumber}</span>
        </div>

        {branchName && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Branch:</p>
            <p className="text-sm font-mono bg-muted p-2 rounded">{branchName}</p>
          </div>
        )}

        <a
          href={prURL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-600 hover:underline"
        >
          Ver Pull Request no GitHub →
        </a>
      </CardContent>
    </Card>
  )
}
