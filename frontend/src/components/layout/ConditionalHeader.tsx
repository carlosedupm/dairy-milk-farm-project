'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { AssistenteFab } from './AssistenteFab'
import { AssistenteDialog } from './AssistenteDialog'

export function ConditionalHeader() {
  const pathname = usePathname()

  // Não mostrar header nas páginas de autenticação
  if (pathname === '/login' || pathname === '/registro') {
    return null
  }

  return (
    <>
      <Header />
      <AssistenteFab />
      <AssistenteDialog />
    </>
  )
}
