'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Building2, Users, Info } from 'lucide-react'

type EmptyFazendasStateProps = {
  isAdmin?: boolean
}

export function EmptyFazendasState({ isAdmin }: EmptyFazendasStateProps) {
  const { user } = useAuth()
  const userIsAdmin =
    isAdmin ?? (user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER')

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Building2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {userIsAdmin
          ? 'Nenhuma fazenda cadastrada'
          : 'Nenhuma fazenda vinculada'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {userIsAdmin
          ? 'Comece criando sua primeira fazenda para gerenciar animais e produção de leite.'
          : 'Entre em contato com um administrador para vincular fazendas à sua conta.'}
      </p>

      {userIsAdmin ? (
        <Button asChild size="lg" className="min-h-[44px]">
          <Link href="/fazendas/nova">
            <Building2 className="mr-2 h-5 w-5" />
            Criar primeira fazenda
          </Link>
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3 p-4 rounded-lg bg-muted/50 max-w-md">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Acesso necessário
              </p>
              <p>
                Um administrador precisa vincular fazendas à sua conta antes de
                você poder usar o sistema.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/onboarding">Ver mais informações</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
