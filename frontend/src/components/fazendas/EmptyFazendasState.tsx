'use client'

import { useAuth } from '@/contexts/AuthContext'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2 } from 'lucide-react'

type EmptyFazendasStateProps = {
  isAdmin?: boolean
}

export function EmptyFazendasState({ isAdmin }: EmptyFazendasStateProps) {
  const { user } = useAuth()
  const userIsAdmin =
    isAdmin ?? (user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER')

  if (userIsAdmin) {
    return (
      <EmptyState
        icon={Building2}
        title="Nenhuma fazenda cadastrada"
        description="Comece criando sua primeira fazenda para gerenciar animais e produção de leite."
        primaryAction={{
          label: 'Criar fazenda',
          href: '/fazendas/nova',
          icon: Building2,
        }}
      />
    )
  }

  return (
    <EmptyState
      icon={Building2}
      title="Nenhuma fazenda vinculada"
      description="Um administrador precisa vincular fazendas à sua conta antes de você poder usar o sistema."
      primaryAction={{
        label: 'Ver mais informações',
        href: '/onboarding',
      }}
    />
  )
}
