'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { showAssistenteForPerfil } from '@/config/appAccess'
import { Header } from './Header'
import { AssistenteFab } from './AssistenteFab'
import { AssistenteDialog } from './AssistenteDialog'

export function ConditionalHeader() {
  const pathname = usePathname()
  const { user } = useAuth()
  const showAssistente = showAssistenteForPerfil(user?.perfil)

  // Não mostrar header nas páginas de autenticação
  if (pathname === '/login' || pathname === '/registro') {
    return null
  }

  return (
    <>
      <Header />
      {showAssistente && (
        <>
          <AssistenteFab />
          <AssistenteDialog />
        </>
      )}
    </>
  )
}
