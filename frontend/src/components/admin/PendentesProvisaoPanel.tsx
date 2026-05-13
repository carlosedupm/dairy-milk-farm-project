'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { listPendentesProvisao } from '@/services/admin'
import { formatDatePtBr } from '@/lib/format'
import { getApiErrorMessage } from '@/lib/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

function tipoPendenciaLabel(tipo: string): string {
  if (tipo === 'SEM_VINCULO_FAZENDA') {
    return 'Sem fazenda vinculada'
  }
  if (tipo === 'PERFIL_OPERACIONAL') {
    return 'Perfil operacional pendente'
  }
  return tipo
}

export function PendentesProvisaoPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'usuarios', 'pendentes-provisao'],
    queryFn: () => listPendentesProvisao({ limit: 50 }),
  })

  const total = data?.total ?? 0
  const pendentes = data?.pendentes ?? []

  if (isLoading) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Contas aguardando provisão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Contas aguardando provisão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, 'Não foi possível carregar a fila.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (total === 0) {
    return null
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Users
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400"
              aria-hidden
            />
            <div>
              <CardTitle className="text-base font-medium">
                {total === 1
                  ? '1 conta na fila de provisão'
                  : `${total} contas na fila de provisão`}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Utilizadores com perfil <strong>USER</strong>: vincule fazendas e
                atribua o perfil operacional em «Editar».
              </p>
              {total > pendentes.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Exibindo os {pendentes.length} mais recentes por data de
                  registo. Os restantes aparecem na tabela geral abaixo (filtre
                  por perfil Usuário).
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="max-h-60 space-y-2 overflow-y-auto text-sm">
          {pendentes.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-medium text-foreground">{p.nome}</span>
                <span className="block truncate text-muted-foreground">
                  {p.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tipoPendenciaLabel(p.tipo_pendencia)} · registo{' '}
                  {formatDatePtBr(p.created_at)}
                </span>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <Link href={`/admin/usuarios/${p.id}/editar`}>Editar</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
