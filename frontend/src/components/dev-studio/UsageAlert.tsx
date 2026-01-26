'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { UsageStats } from '@/services/devStudio'

type UsageAlertProps = {
  usage: UsageStats | null
  loading?: boolean
}

export function UsageAlert({ usage, loading }: UsageAlertProps) {
  if (loading || !usage) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Carregando uso...</p>
        </CardContent>
      </Card>
    )
  }

  const { used_last_hour, limit_per_hour, used_today } = usage
  const nearLimit = used_last_hour >= 4 && used_last_hour < limit_per_hour
  const atLimit = used_last_hour >= limit_per_hour

  return (
    <Card
      className={`mb-6 ${
        atLimit
          ? 'border-destructive bg-destructive/5'
          : nearLimit
            ? 'border-amber-500 bg-amber-500/5'
            : ''
      }`}
    >
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {used_last_hour} / {limit_per_hour} requisições nesta hora
            </span>
            <span className="text-sm text-muted-foreground">
              {used_today} hoje
            </span>
          </div>
          {nearLimit && (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
              Próximo do limite
            </p>
          )}
          {atLimit && (
            <p className="text-sm font-medium text-destructive">
              Limite atingido. Aguarde para fazer novas requisições.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
